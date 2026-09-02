package com.sosmartlabs.momo.chat.presentation.fragment

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Bundle
import android.view.inputmethod.InputMethodManager
import android.util.TypedValue
import android.widget.Toast
import android.view.LayoutInflater
import android.view.MotionEvent
import android.view.View
import android.view.ViewConfiguration
import android.view.ViewGroup
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.fragment.app.viewModels
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import androidx.navigation.fragment.findNavController
import androidx.navigation.fragment.navArgs
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import androidx.recyclerview.widget.SimpleItemAnimator
import com.bumptech.glide.Glide
import com.google.android.exoplayer2.ExoPlayer
import com.google.android.material.snackbar.Snackbar
import com.parse.ParseUser
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.chat.data.events.GroupChatEventBus
import com.sosmartlabs.momo.chat.data.local.entity.ChatEntity
import com.sosmartlabs.momo.chat.presentation.adapter.ChatAdapter
import com.sosmartlabs.momo.chat.presentation.common.ActiveChatSessionRegistry
import com.sosmartlabs.momo.chat.presentation.common.ChatAudioRecordingController
import com.sosmartlabs.momo.chat.presentation.common.ChatInputUiHelper
import com.sosmartlabs.momo.chat.presentation.model.ChatDateSeparatorBuilder
import com.sosmartlabs.momo.chat.presentation.model.ChatSession
import com.sosmartlabs.momo.chat.presentation.model.UnifiedMessageItem
import com.sosmartlabs.momo.chat.presentation.share.ChatPhotoShareRequest
import com.sosmartlabs.momo.chat.presentation.viewmodel.GroupRealtimeMode
import com.sosmartlabs.momo.chat.presentation.viewmodel.RealtimeSyncPolicy
import com.sosmartlabs.momo.chat.presentation.viewmodel.UnifiedChatUiState
import com.sosmartlabs.momo.chat.presentation.viewmodel.UnifiedChatViewModel
import com.sosmartlabs.momo.databinding.ChatUnifiedFragmentBinding
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.main.DisconnectionActivity
import com.sosmartlabs.momo.utils.Constants
import com.sosmartlabs.momo.utils.DateUtil
import com.sosmartlabs.momo.models.Space2
import com.sosmartlabs.momo.models.Space3
import com.sosmartlabs.momo.models.Space4
import com.sosmartlabs.momo.pushnotifications.ui.chat.ChatMessagingNotificationBuilder
import com.sosmartlabs.momo.pushnotifications.ui.handlers.GroupMembershipNotificationHandler
import com.sosmartlabs.momo.takepicture.TakePictureFragment
import com.sosmartlabs.momo.utils.EdgeToEdgeUtils
import com.sosmartlabs.momo.utils.ui.DefaultIcons
import com.sosmartlabs.momo.utils.ui.setupFragmentEdgeToEdge
import com.sosmartlabs.momo.videocall.CallActivity
import com.stfalcon.imageviewer.StfalconImageViewer
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Job
import kotlinx.coroutines.awaitCancellation
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.io.IOException
import javax.inject.Inject
import timber.log.Timber
import androidx.core.view.isVisible

@AndroidEntryPoint
class UnifiedChatFragment : TakePictureFragment() {

    enum class MessageType { VOICE, TEXT }

    private companion object {
        const val DISCONNECTED_STATE_RECHECK_INTERVAL_MS = 30_000L
    }

    private var _binding: ChatUnifiedFragmentBinding? = null
    private val binding get() = _binding!!

    private val viewModel: UnifiedChatViewModel by viewModels()
    private val args: UnifiedChatFragmentArgs by navArgs()

    private lateinit var adapter: ChatAdapter
    private lateinit var exoPlayer: ExoPlayer
    private lateinit var audioRecordingController: ChatAudioRecordingController
    private val messageType = MutableLiveData(MessageType.VOICE)
    private var currentSnackbar: Snackbar? = null
    private lateinit var user: ParseUser
    private var currentSession: ChatSession? = null
    private var canSendImage = false
    private var lastLoggedRealtimeMode: GroupRealtimeMode? = null
    private var lastPushedViewedTimestamp: Long = 0L
    private var disconnectedStateRefreshJob: Job? = null
    private var lastSubmittedMessagesRef: List<UnifiedMessageItem>? = null
    private var lastSubmittedGroupSenderAvatarMapRef: Map<String, String?>? = null
    private val preloadedAvatarUrls = mutableSetOf<String>()

    @Inject
    lateinit var chatNotificationBuilder: ChatMessagingNotificationBuilder

    @Inject
    lateinit var groupChatEventBus: GroupChatEventBus

    private val cancelRecordingDistance: Float by lazy {
        TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, 150f, resources.displayMetrics)
    }

    private val requestAudioPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (!granted) showSnackbar(R.string.toast_error_no_audio_permissions)
    }

    override val objectId: String?
        get() = when (val session = currentSession) {
            is ChatSession.Individual -> session.wearer.objectId
            is ChatSession.Group -> session.groupId
            null -> null
        }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = ChatUnifiedFragmentBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        user = ParseUser.getCurrentUser()
        exoPlayer = ExoPlayer.Builder(requireContext()).build()

        setupFragmentEdgeToEdge(binding.appbar)
        setupInsets()
        setupToolbar()
        setupRecyclerView()
        setupMessageTypeObserver()
        setupActions()
        setupDismissKeyboardBehavior()
        resolveSessionAndLoad()
        observeUiState()
        observeGroupChatLifecycle()
    }

    /**
     * Pops back to the chat list whenever the group we're currently viewing
     * is purged (admin deleted, I left, or a stale-sync drop). Without this
     * the fragment would keep rendering messages from an empty/missing group
     * until the user manually backs out.
     */
    private fun observeGroupChatLifecycle() {
        viewLifecycleOwner.lifecycleScope.launch {
            viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
                groupChatEventBus.events.collect { event ->
                    if (event is GroupChatEventBus.GroupPurged) {
                        val session = currentSession
                        if (session is ChatSession.Group && session.groupId == event.groupId) {
                            Timber.i("UnifiedChatFragment: Group ${event.groupId} was purged, popping back")
                            Toast.makeText(
                                requireContext(),
                                R.string.group_deleted_while_open_toast,
                                Toast.LENGTH_LONG,
                            ).show()
                            findNavController().popBackStack(R.id.chatListFragment, false)
                        }
                    }
                }
            }
        }
    }

    private fun setupInsets() {
        val params = binding.actionsLayout.layoutParams as androidx.constraintlayout.widget.ConstraintLayout.LayoutParams
        val baseBottomMargin = params.bottomMargin
        ViewCompat.setOnApplyWindowInsetsListener(binding.container) { _, insets ->
            val ime = insets.getInsets(WindowInsetsCompat.Type.ime())

            // NavHost already applies bottom nav-bar inset in ChatListActivity for button navigation.
            // Keep fragment responsible for IME and a small gesture-navigation visual spacing only.
            val minBottomSpacing = if (EdgeToEdgeUtils.hasButtonNavigation(requireContext())) {
                0
            } else {
                16
            }
            val bottomPadding = ime.bottom.coerceAtLeast(minBottomSpacing)
            params.bottomMargin = baseBottomMargin + bottomPadding
            binding.actionsLayout.layoutParams = params
            insets
        }
    }

    private fun setupToolbar() {
        binding.toolbar.setNavigationOnClickListener {
            requireActivity().onBackPressedDispatcher.onBackPressed()
        }
    }

    private fun setupRecyclerView() {
        val userImage = user.getParseFile("image")?.url
        val wearerImage = args.wearer?.image?.url
        adapter = ChatAdapter(
            exoPlayer = exoPlayer,
            userImage = userImage,
            wearerImage = wearerImage,
            coroutineScope = lifecycleScope,
            onIncomingImageShareClick = ::showPhotoShareScreen
        ).apply {
            registerAdapterDataObserver(object : RecyclerView.AdapterDataObserver() {
                override fun onItemRangeInserted(positionStart: Int, itemCount: Int) {
                    // AsyncListDiffer can deliver this after onDestroyView (diff posted
                    // back to the main looper); skip the auto-scroll if the view is gone.
                    val currentBinding = _binding ?: return
                    if (positionStart == 0) currentBinding.chatRecyclerView.smoothScrollToPosition(0)
                }
            })
        }
        binding.chatRecyclerView.layoutManager = LinearLayoutManager(requireContext()).apply {
            reverseLayout = true
        }
        binding.chatRecyclerView.adapter = adapter
        (binding.chatRecyclerView.itemAnimator as? SimpleItemAnimator)?.apply {
            supportsChangeAnimations = false
            changeDuration = 0L
        }
    }

    private fun showPhotoShareScreen(request: ChatPhotoShareRequest) {
        val navController = findNavController()
        if (navController.currentDestination?.id != R.id.unifiedChatFragment) {
            return
        }
        runCatching {
            navController.navigate(
                UnifiedChatFragmentDirections.actionUnifiedChatToChatPhotoShare(request)
            )
        }.onFailure { throwable ->
            Timber.w(throwable, "UnifiedChatFragment: unable to navigate to chat photo share")
        }
    }

    private fun setupMessageTypeObserver() {
        messageType.observe(viewLifecycleOwner) { type ->
            ChatInputUiHelper.applyMessageTypeUi(
                isTextMode = type == MessageType.TEXT,
                sendButton = binding.chatFab,
                audioButton = binding.chatAudio
            )
        }
    }

    private fun setupDismissKeyboardBehavior() {
        val touchSlop = ViewConfiguration.get(requireContext()).scaledTouchSlop
        var downX = 0f
        var downY = 0f
        var moved = false

        binding.chatRecyclerView.addOnItemTouchListener(
            object : RecyclerView.SimpleOnItemTouchListener() {
                override fun onInterceptTouchEvent(rv: RecyclerView, e: MotionEvent): Boolean {
                    when (e.actionMasked) {
                        MotionEvent.ACTION_DOWN -> {
                            downX = e.x
                            downY = e.y
                            moved = false
                        }
                        MotionEvent.ACTION_MOVE -> {
                            if (!moved) {
                                val deltaX = kotlin.math.abs(e.x - downX)
                                val deltaY = kotlin.math.abs(e.y - downY)
                                moved = deltaX > touchSlop || deltaY > touchSlop
                            }
                        }
                        MotionEvent.ACTION_UP -> {
                            if (moved) return false
                            if (isTapOnActionableRecyclerViewTarget(rv, e)) return false
                            dismissKeyboardIfOpen()
                        }
                    }
                    return false
                }
            }
        )
    }

    private fun isTapOnActionableRecyclerViewTarget(rv: RecyclerView, e: MotionEvent): Boolean {
        val child = rv.findChildViewUnder(e.x, e.y) ?: return false
        val localX = e.x - child.left
        val localY = e.y - child.top
        val touchedView = findTouchedView(child, localX, localY) ?: return false
        return touchedView.hasOnClickListeners() || touchedView.isClickable || touchedView.isLongClickable
    }

    private fun findTouchedView(view: View, x: Float, y: Float): View? {
        if (x < 0f || y < 0f || x > view.width || y > view.height) return null
        if (view !is ViewGroup) return view

        for (i in view.childCount - 1 downTo 0) {
            val child = view.getChildAt(i)
            if (child.visibility != View.VISIBLE) continue
            val childX = x - child.left
            val childY = y - child.top
            val target = findTouchedView(child, childX, childY)
            if (target != null) return target
        }
        return view
    }

    @SuppressLint("ClickableViewAccessibility")
    private fun setupActions() {
        binding.chatEditText.addTextChangedListener(object : android.text.TextWatcher {
            override fun afterTextChanged(s: android.text.Editable?) {}
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                // The IME commits text via a runnable posted to the main looper, so a
                // commit can land after onDestroyView (the watcher stays registered on
                // the detached EditText). Bail out before writing messageType too:
                // it outlives the view, and text restoration re-fires this watcher on
                // recreation, so dead-view input must not leak into the sticky value.
                val currentBinding = _binding ?: return
                val isEmpty = s.isNullOrBlank()
                messageType.value = if (isEmpty) MessageType.VOICE else MessageType.TEXT
                ChatInputUiHelper.animateChatSendImage(
                    sendImageButton = currentBinding.chatSendImage,
                    hide = !isEmpty,
                    canShowImageButton = canSendImage,
                    resources = resources
                )
            }
        })

        binding.chatFab.setOnClickListener {
            if (messageType.value == MessageType.TEXT) {
                val text = binding.chatEditText.text?.toString()?.trim().orEmpty()
                if (text.isNotBlank()) {
                    viewModel.sendText(text)
                    binding.chatEditText.text = null
                    messageType.value = MessageType.VOICE
                }
            }
        }

        binding.chatAudio.setOnClickListener {
            if (messageType.value == MessageType.VOICE) {
                if (!hasAudioPermission()) {
                    requestAudioPermissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
                } else {
                    showSnackbar(R.string.toast_error_press_to_record_release_to_send, false)
                }
            }
        }

        binding.chatAudio.setOnLongClickListener {
            if (!hasAudioPermission()) {
                requestAudioPermissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
            } else if (messageType.value == MessageType.VOICE) {
                audioRecordingController.startRecording()
            }
            true
        }

        binding.chatAudio.setOnTouchListener { v, event ->
            if (messageType.value != MessageType.VOICE) return@setOnTouchListener false
            if (event.action == MotionEvent.ACTION_UP && audioRecordingController.isRecording) {
                audioRecordingController.stopRecording(cancel = false)
            } else if (event.action == MotionEvent.ACTION_MOVE && audioRecordingController.isRecording) {
                if (event.x < -cancelRecordingDistance) {
                    audioRecordingController.stopRecording(cancel = true)
                }
            } else {
                return@setOnTouchListener false
            }
            v.onTouchEvent(event)
            true
        }

        binding.chatSendImage.setOnClickListener {
            if (!canSendImage) {
                return@setOnClickListener
            }
            if (!hasCameraPermission) {
                requestCameraPermissionLauncher.launch(Manifest.permission.CAMERA)
            } else {
                setViewForSendingImage(true)
            }
        }
        binding.chatSendFromCamera.setOnClickListener {
            launchTakePicture()
            setViewForSendingImage(false)
        }
        binding.chatSendFromGallery.setOnClickListener {
            launchSelectPictureFromGallery()
            setViewForSendingImage(false)
        }
        binding.screenOverlay.setOnClickListener { setViewForSendingImage(false) }
        binding.chatSendImageArrow.setOnClickListener { setViewForSendingImage(false) }
        binding.videoCallButton.setOnClickListener { startVideoCallIfAvailable() }
        binding.disconnectedActionsCard.setOnClickListener {
            // IDs only, never the wearer itself: the chat wearer arrived as a Navigation
            // Parcelable and is already a decoded snapshot, so re-resolving on the other
            // side is the only way that screen sees live values. Read currentSession inside
            // the lambda — this listener is registered once, the session is not.
            val wearer = (currentSession as? ChatSession.Individual)?.wearer
            startActivity(
                Intent(requireContext(), DisconnectionActivity::class.java).apply {
                    wearer?.let {
                        putExtra(Constants.EXTRA_WEARER_ID, it.objectId)
                        putExtra(Constants.EXTRA_DEVICE_ID, it.deviceId)
                    }
                }
            )
        }
    }

    private fun dismissKeyboardIfOpen() {
        val currentFocus = requireActivity().currentFocus ?: return
        if (currentFocus !== binding.chatEditText) {
            return
        }
        val imm = requireContext().getSystemService(InputMethodManager::class.java)
        imm?.hideSoftInputFromWindow(binding.chatEditText.windowToken, 0)
        binding.chatEditText.clearFocus()
    }

    private fun observeUiState() {
        viewLifecycleOwner.lifecycleScope.launch {
            viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
                viewModel.uiState.collect { state ->
                    applyDisconnectedUiState()
                    if (currentSession is ChatSession.Group &&
                        state.groupRealtimeMode != lastLoggedRealtimeMode
                    ) {
                        Timber.d(
                            "UnifiedChatFragment: Group realtime mode changed to ${state.groupRealtimeMode}"
                        )
                        lastLoggedRealtimeMode = state.groupRealtimeMode
                    }
                    state.header?.let { header ->
                        binding.chatTitleTextView.text = header.title
                        binding.chatSubtitleTextView.text = header.subtitle.orEmpty()
                        binding.chatSubtitleTextView.visibility =
                            if (header.subtitle.isNullOrBlank()) View.GONE else View.VISIBLE
                        val avatarFallback = if (header.isGroup) {
                            R.drawable.ic_group_avatar
                        } else {
                            DefaultIcons.PROFILE_MOMO_SPACE
                        }
                        Glide.with(binding.chatAvatarImageView.context)
                            .load(header.avatarUrl)
                            .placeholder(avatarFallback)
                            .error(avatarFallback)
                            .into(binding.chatAvatarImageView)
                        binding.videoCallButton.visibility =
                            if (header.canVideoCall) View.VISIBLE else View.GONE
                        canSendImage = header.canSendImage
                        binding.chatSendImage.visibility =
                            if (header.canSendImage) View.VISIBLE else View.GONE

                        binding.chatEditText.filters =
                            if (header.hasUnlimitedMessageLength) {
                                emptyArray()
                            } else {
                                arrayOf(android.text.InputFilter.LengthFilter(46))
                            }
                    }
                    submitMessagesIfChanged(state)
                    val latestTimestamp = ChatDateSeparatorBuilder.latestRealMessageTimestamp(state.messages)
                    if (latestTimestamp > lastPushedViewedTimestamp) {
                        lastPushedViewedTimestamp = latestTimestamp
                        viewModel.updateLastViewedAtIfNewer(latestTimestamp)
                    }
                    state.errorMessage?.let {
                        showSnackbar(it)
                        viewModel.clearError()
                    }
                    state.sendFailure?.let {
                        if (it.sessionType == com.sosmartlabs.momo.chat.presentation.viewmodel.SendFailureSessionType.GROUP &&
                            it.retryable &&
                            !it.retryMessageId.isNullOrBlank()
                        ) {
                            showSnackbar(
                                message = it.reason,
                                actionLabelId = R.string.button_retry
                            ) {
                                viewModel.retryFailedGroupMessage(it.retryMessageId)
                            }
                        } else {
                            showSnackbar(it.reason)
                        }
                        viewModel.clearSendFailure()
                    }
                }
            }
        }

        disconnectedStateRefreshJob?.cancel()
        disconnectedStateRefreshJob = viewLifecycleOwner.lifecycleScope.launch {
            viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
                while (true) {
                    applyDisconnectedUiState()
                    delay(DISCONNECTED_STATE_RECHECK_INTERVAL_MS)
                }
            }
        }

        viewLifecycleOwner.lifecycleScope.launch {
            viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.CREATED) {
                val lifecycle = viewLifecycleOwner.lifecycle
                var realtimeSessionJob: Job? = null

                fun launchRealtimeSession(policy: RealtimeSyncPolicy) {
                    if (!isAdded) {
                        return
                    }
                    realtimeSessionJob?.cancel()
                    realtimeSessionJob = launch {
                        Timber.d("UnifiedChatFragment: Running realtime session with policy=$policy")
                        viewModel.runRealtimeSession(policy)
                    }
                }

                val observer = LifecycleEventObserver { _, event ->
                    when (event) {
                        Lifecycle.Event.ON_START -> launchRealtimeSession(RealtimeSyncPolicy.ACTIVE)
                        Lifecycle.Event.ON_STOP -> launchRealtimeSession(RealtimeSyncPolicy.BACKGROUND)
                        else -> Unit
                    }
                }

                lifecycle.addObserver(observer)
                launchRealtimeSession(
                    if (lifecycle.currentState.isAtLeast(Lifecycle.State.STARTED)) {
                        RealtimeSyncPolicy.ACTIVE
                    } else {
                        RealtimeSyncPolicy.BACKGROUND
                    }
                )

                try {
                    awaitCancellation()
                } finally {
                    lifecycle.removeObserver(observer)
                    realtimeSessionJob?.cancel()
                    viewModel.stopRealtime()
                }
            }
        }
    }

    private fun resolveSessionAndLoad() {
        val wearer = args.wearer
        val groupId = args.groupId
        val session = if (wearer != null) {
            ChatSession.Individual(wearer)
        } else if (!groupId.isNullOrBlank()) {
            ChatSession.Group(groupId, args.groupName)
        } else {
            showSnackbar(R.string.toast_error_finding_momo)
            requireActivity().onBackPressedDispatcher.onBackPressed()
            return
        }

        currentSession = session
        adapter.setIsGroupChatSession(session is ChatSession.Group)
        lastPushedViewedTimestamp = 0L
        lastSubmittedMessagesRef = null
        lastSubmittedGroupSenderAvatarMapRef = null
        preloadedAvatarUrls.clear()
        applyDisconnectedUiState()
        audioRecordingController = ChatAudioRecordingController(
            context = requireContext(),
            vibrator = requireContext().getSystemService(android.content.Context.VIBRATOR_SERVICE) as android.os.Vibrator,
            lengthView = binding.chatTextViewLength,
            viewSwitcher = binding.chatMessageViewSwitcher,
            recordingIdProvider = {
                when (session) {
                    is ChatSession.Individual -> session.wearer.objectId
                    is ChatSession.Group -> session.groupId
                }
            },
            onSendRecording = { path -> viewModel.sendVoice(path) },
            onRecordingError = { showSnackbar(R.string.toast_error_recording_audio) }
        )

        binding.headerContainer.setOnClickListener {
            val active = currentSession
            if (active is ChatSession.Group) {
                findNavController().navigate(
                    UnifiedChatFragmentDirections.actionUnifiedChatToGroupMembers(active.groupId)
                )
            } else if (active is ChatSession.Individual) {
                val imageUrl = active.wearer.image?.url
                if (!imageUrl.isNullOrBlank()) {
                    StfalconImageViewer.Builder(requireContext(), arrayOf(imageUrl)) { view, url ->
                        Glide.with(requireContext()).load(url).into(view)
                    }.show()
                }
            }
        }

        if (session is ChatSession.Individual) {
            chatNotificationBuilder.cancelNotificationForWatch(requireContext(), session.wearer.objectId)
        } else if (session is ChatSession.Group) {
            chatNotificationBuilder.cancelNotificationForGroup(requireContext(), session.groupId)
            GroupMembershipNotificationHandler.cancelAllFor(requireContext(), session.groupId)
        }

        viewModel.loadSession(session, user)
    }

    private fun shouldShowDisconnectedCard(session: ChatSession?): Boolean {
        val individualSession = session as? ChatSession.Individual ?: return false
        val wearer = individualSession.wearer
        val isSpace2Or3Or4 = wearer.model == Space2 || wearer.model == Space3 || wearer.model == Space4
        return !wearer.isConnected() && !isSpace2Or3Or4
    }

    private fun applyDisconnectedUiState() {
        val currentBinding = _binding ?: return
        val shouldShowCard = shouldShowDisconnectedCard(currentSession)
        currentBinding.disconnectedActionsLayout.visibility = if (shouldShowCard) View.VISIBLE else View.GONE
        currentBinding.actionsLayout.visibility = if (shouldShowCard) View.GONE else View.VISIBLE
        currentBinding.chatRecyclerView.visibility = View.VISIBLE
        if (shouldShowCard) bindDisconnectedCard(currentBinding)
    }

    /**
     * Fills in the disconnected card that replaces the composer.
     *
     * Says the same things, the same way, as the disconnected banner on the map: the cause
     * glyph comes from [Wearer.ranOutOfBattery] so the two screens cannot disagree, and the
     * second line is how long the watch has been silent rather than a "Click to know more"
     * that the chevron already implies. The card only appears for pre-Space-2 hardware (see
     * [shouldShowDisconnectedCard]), so this runs rarely — but when it does, the parent gets
     * the same answer they would get on the map.
     */
    private fun bindDisconnectedCard(binding: ChatUnifiedFragmentBinding) {
        val wearer = (currentSession as? ChatSession.Individual)?.wearer ?: return

        binding.disconnectedActionsCardIcon.setImageResource(
            if (wearer.ranOutOfBattery()) R.drawable.ic_no_battery else R.drawable.no_sim
        )

        val lastSeenAt = wearer.lastCheckInAt()
        val elapsedText = if (lastSeenAt == null) {
            getString(R.string.last_update_unavailable)
        } else {
            DateUtil.getElapsedSince(lastSeenAt)
        }
        // Same rule as the map banner: the never-checked-in copy is the longest string
        // either surface renders ("Letztes Update: nicht verfügbar") and needs a second
        // line, while an elapsed duration always fits on one.
        binding.disconnectedActionsCardSubtitle.maxLines = if (lastSeenAt == null) 2 else 1
        binding.disconnectedActionsCardSubtitle.text = elapsedText

        // The children are excluded from the accessibility tree so the card speaks as one
        // node; anything not folded in here is invisible to a screen reader.
        binding.disconnectedActionsCard.contentDescription = listOf(
            getString(R.string.main_prompt_device_disconnected_title),
            elapsedText,
            getString(R.string.main_prompt_device_disconnected_button)
        ).joinToString(". ")
    }

    private fun startVideoCallIfAvailable() {
        val session = currentSession
        if (session !is ChatSession.Individual) return
        val wearer = session.wearer
        // canVideoCall already encodes both the hardware capability and the
        // user's videocall permission; re-check it here so a permission change
        // can't be bypassed if the button is tapped before the UI updates.
        if (viewModel.uiState.value.header?.canVideoCall != true) return
        if (!isNetworkConnected()) {
            showSnackbar(R.string.network_disconnected)
            return
        }

        val imageUrl = wearer.image?.url ?: ""
        val intent = Intent(requireContext(), CallActivity::class.java).apply {
            putExtra("type", "user")
            putExtra("typeId", user.objectId)
            putExtra("contactName", wearer.name())
            putExtra("contactImage", imageUrl)
            putExtra("isOutgoing", true)
            putExtra("intentAction", "")
            putExtra("wearerDeviceId", wearer.deviceId)
            putExtra("wearerModel", wearer.modelInt)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        startActivity(intent)
    }

    private fun isNetworkConnected(): Boolean {
        val connectivityManager =
            requireContext().getSystemService(ConnectivityManager::class.java) ?: return false
        val activeNetwork = connectivityManager.activeNetwork ?: return false
        val capabilities = connectivityManager.getNetworkCapabilities(activeNetwork) ?: return false
        return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }

    private fun hasAudioPermission(): Boolean {
        return ActivityCompat.checkSelfPermission(
            requireContext(),
            Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED
    }

    private fun setViewForSendingImage(isSendingImage: Boolean) {
        if (!canSendImage) {
            return
        }
        ChatInputUiHelper.setViewForSendingImage(
            isSendingImage = isSendingImage,
            sendImageButton = binding.chatSendImage,
            sendFromCameraFab = binding.chatSendFromCamera,
            sendFromGalleryFab = binding.chatSendFromGallery,
            overlay = binding.screenOverlay,
            closeArrow = binding.chatSendImageArrow,
            resources = resources
        )
    }

    override fun onImageLoaded(path: String?) {
        if (!canSendImage) {
            showSnackbar(R.string.error_send_image_model_unsupported)
            return
        }
        if (!path.isNullOrBlank()) {
            viewModel.sendImage(path)
        }
    }

    override fun onTakingPictureError(e: Throwable) {
        showSnackbar(R.string.toast_error_camera)
        CrashlyticsLog.recordNonFatalError(
            e,
            "UnifiedChatFragment: camera flow failure while taking picture"
        )
    }

    override fun onResume() {
        super.onResume()
        currentSession?.let { ActiveChatSessionRegistry.setActive(it) }
        viewLifecycleOwner.lifecycleScope.launch {
            viewModel.updateLastViewed()
        }
    }

    override fun onPause() {
        super.onPause()
        ActiveChatSessionRegistry.clearIfMatches(currentSession)
        audioRecordingController.onPauseCleanup()
        adapter.stopPlaybackAndCleanup()
    }

    override fun onDestroyView() {
        currentSnackbar?.dismiss()
        disconnectedStateRefreshJob?.cancel()
        disconnectedStateRefreshJob = null
        lastSubmittedMessagesRef = null
        lastSubmittedGroupSenderAvatarMapRef = null
        preloadedAvatarUrls.clear()
        ActiveChatSessionRegistry.clearIfMatches(currentSession)
        exoPlayer.release()
        _binding = null
        super.onDestroyView()
    }

    private fun showSnackbar(messageId: Int, isError: Boolean = true) {
        showSnackbar(getString(messageId), isError)
    }

    private fun showSnackbar(message: String, isError: Boolean = true) {
        showSnackbar(message = message, isError = isError, actionLabelId = R.string.dismiss, onAction = null)
    }

    private fun showSnackbar(
        message: String,
        isError: Boolean = true,
        actionLabelId: Int = R.string.dismiss,
        onAction: (() -> Unit)? = null
    ) {
        currentSnackbar?.dismiss()
        val anchor =
            if (binding.actionsLayout.isVisible) binding.actionsLayout
            else binding.disconnectedActionsLayout
        val duration = if (onAction != null) Snackbar.LENGTH_LONG else Snackbar.LENGTH_SHORT
        currentSnackbar = Snackbar.make(binding.container, message, duration).apply {
            anchorView = anchor
            val bg = if (isError) R.color.momo_error_background else R.color.background_sim_step_card_title
            view.setBackgroundColor(ContextCompat.getColor(requireContext(), bg))
            setActionTextColor(ContextCompat.getColor(requireContext(), R.color.white))
            setAction(actionLabelId) {
                if (onAction != null) {
                    onAction()
                } else {
                    dismiss()
                }
            }
            show()
        }
    }

    private fun submitMessagesIfChanged(state: UnifiedChatUiState) {
        val messagesRefChanged = lastSubmittedMessagesRef !== state.messages
        val avatarMapRefChanged =
            lastSubmittedGroupSenderAvatarMapRef !== state.groupSenderAvatarById
        if (!messagesRefChanged && !avatarMapRefChanged) {
            return
        }

        val chatEntities = state.messages.map { message ->
            message.toChatEntity(state.groupSenderAvatarById)
        }
        preloadGroupSenderAvatars(state)
        adapter.submitList(chatEntities)
        lastSubmittedMessagesRef = state.messages
        lastSubmittedGroupSenderAvatarMapRef = state.groupSenderAvatarById
    }

    private fun UnifiedMessageItem.toChatEntity(
        groupSenderAvatarById: Map<String, String?> = emptyMap()
    ): ChatEntity {
        val session = currentSession
        val chatId = when (session) {
            is ChatSession.Individual -> session.wearer.objectId
            is ChatSession.Group -> session.groupId
            null -> ""
        }
        if (isSeparator) {
            return ChatEntity(
                id = id,
                chatId = chatId,
                createdAt = timestamp,
                sender = ChatEntity.SENDER_APP,
                receiver = "",
                status = ChatEntity.STATUS_SENT,
                type = ChatEntity.TYPE_SEPARATOR,
                audio = null,
                audioDuration = null,
                image = null,
                text = text,
                video = null,
                isIsolatedAudio = false,
                audioWaveform = null
            )
        }
        val chatEntity = ChatEntity(
            id = id,
            chatId = chatId,
            createdAt = timestamp,
            sender = if (isMine) ChatEntity.SENDER_APP else ChatEntity.SENDER_WATCH,
            receiver = when (val activeSession = currentSession) {
                is ChatSession.Individual -> if (isMine) activeSession.wearer.objectId else user.objectId
                is ChatSession.Group, null -> senderId
            },
            status = status,
            type = type,
            audio = audio,
            audioDuration = audioDuration,
            image = image,
            text = text,
            video = video,
            isIsolatedAudio = isIsolatedAudio,
            audioWaveform = audioWaveform
        )
        if (session is ChatSession.Group && !isMine && !isSeparator) {
            chatEntity.groupSenderName = senderName
            chatEntity.groupSenderImage = resolveGroupSenderAvatar(groupSenderAvatarById)
        }
        return chatEntity
    }

    private fun UnifiedMessageItem.resolveGroupSenderAvatar(
        groupSenderAvatarById: Map<String, String?>
    ): String? {
        val memberAvatar = groupSenderAvatarById[senderId]
        return if (!memberAvatar.isNullOrBlank()) {
            memberAvatar
        } else {
            senderAvatar
        }
    }

    private fun preloadGroupSenderAvatars(state: UnifiedChatUiState) {
        if (currentSession !is ChatSession.Group) {
            return
        }
        val glideManager = runCatching { Glide.with(this) }.getOrNull() ?: return
        state.messages
            .asSequence()
            .filter { !it.isMine && !it.isSeparator }
            .mapNotNull { message ->
                message.resolveGroupSenderAvatar(state.groupSenderAvatarById)
                    ?.takeIf { avatarUrl -> avatarUrl.isNotBlank() }
            }
            .distinct()
            .forEach { avatarUrl ->
                if (preloadedAvatarUrls.add(avatarUrl)) {
                    glideManager.load(avatarUrl).preload()
                }
            }
    }
}
