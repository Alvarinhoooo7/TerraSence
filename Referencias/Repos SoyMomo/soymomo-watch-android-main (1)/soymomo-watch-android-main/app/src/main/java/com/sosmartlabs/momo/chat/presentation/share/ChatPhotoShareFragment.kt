package com.sosmartlabs.momo.chat.presentation.share

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.isVisible
import androidx.core.view.updatePadding
import androidx.core.view.WindowInsetsCompat
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import androidx.navigation.fragment.findNavController
import androidx.navigation.fragment.navArgs
import androidx.viewpager2.widget.ViewPager2
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.ChatPhotoShareFragmentBinding
import com.sosmartlabs.momo.utils.EdgeToEdgeUtils
import com.sosmartlabs.momo.utils.ui.setupFragmentEdgeToEdge
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class ChatPhotoShareFragment : Fragment() {

    private var _binding: ChatPhotoShareFragmentBinding? = null
    private val binding get() = _binding!!

    private val args: ChatPhotoShareFragmentArgs by navArgs()
    private val viewModel: ChatPhotoShareViewModel by viewModels()
    private val previewAdapter = ChatPhotoSharePreviewPagerAdapter()
    private var pageChangeCallback: ViewPager2.OnPageChangeCallback? = null
    private var instagramAvailable = false

    @Inject
    lateinit var shareDispatcher: ShareDispatcher

    private val requestStoragePermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) {
            viewModel.onSaveToDeviceClicked()
        } else {
            viewModel.onSavePermissionDenied()
            Toast.makeText(
                requireContext(),
                R.string.chat_photo_share_error_storage_permission,
                Toast.LENGTH_SHORT
            ).show()
        }
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = ChatPhotoShareFragmentBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        setupFragmentEdgeToEdge(binding.appBarLayout)
        applyWindowInsets()
        setupToolbar()
        setupPreviewPager()
        setupActions()
        instagramAvailable = shareDispatcher.canShareToInstagramStories(requireContext())
        viewModel.initialize(args.shareRequest)

        viewLifecycleOwner.lifecycleScope.launch {
            viewLifecycleOwner.lifecycle.repeatOnLifecycle(Lifecycle.State.STARTED) {
                launch {
                    viewModel.uiState.collect { state ->
                        val selectedIndex = ShareTemplate.all.indexOf(state.selectedTemplate).coerceAtLeast(0)
                        if (binding.previewPager.currentItem != selectedIndex) {
                            binding.previewPager.setCurrentItem(selectedIndex, false)
                            updateSelectedDot(selectedIndex)
                        }
                        previewAdapter.updatePreviews(state.previews)
                        binding.templateTitle.text = templateTitle(state.selectedTemplate)
                        binding.templateDescription.text = templateDescription(state.selectedTemplate)
                        binding.actionsProgress.isVisible = state.isProcessing
                        binding.previewPager.isUserInputEnabled = !state.isProcessing
                        val selectedPreviewReady = state.selectedPreviewState is SharePreviewState.Ready
                        val canUseActions = !state.isProcessing && selectedPreviewReady
                        updateActionEnabled(binding.genericShareButton, canUseActions)
                        updateActionEnabled(
                            binding.instagramStoriesButton,
                            canUseActions && instagramAvailable
                        )
                        updateActionEnabled(binding.saveToDeviceButton, canUseActions)
                        val errorResId = state.errorMessageResId ?: state.previewErrorMessageResId
                        binding.errorText.isVisible = errorResId != null
                        binding.errorText.text = errorResId?.let { getString(it) }.orEmpty()
                    }
                }
                launch {
                    viewModel.effects.collect { effect ->
                        when (effect) {
                            is ChatPhotoShareEffect.LaunchShare -> handleLaunchShare(effect)
                            is ChatPhotoShareEffect.CloseScreen -> {
                                effect.messageResId?.let {
                                    Toast.makeText(requireContext(), it, Toast.LENGTH_SHORT).show()
                                }
                                findNavController().navigateUp()
                            }
                        }
                    }
                }
            }
        }
    }

    override fun onDestroyView() {
        pageChangeCallback?.let { binding.previewPager.unregisterOnPageChangeCallback(it) }
        pageChangeCallback = null
        _binding = null
        super.onDestroyView()
    }

    private fun setupToolbar() {
        binding.toolbar.setNavigationOnClickListener {
            findNavController().navigateUp()
        }
    }

    private fun setupPreviewPager() {
        binding.previewPager.adapter = previewAdapter
        binding.previewPager.offscreenPageLimit = ShareTemplate.all.size
        renderDots()

        pageChangeCallback = object : ViewPager2.OnPageChangeCallback() {
            override fun onPageSelected(position: Int) {
                super.onPageSelected(position)
                updateSelectedDot(position)
                ShareTemplate.all.getOrNull(position)?.let(viewModel::onTemplateSelected)
            }
        }
        binding.previewPager.registerOnPageChangeCallback(pageChangeCallback!!)
        updateSelectedDot(0)
    }

    private fun setupActions() {
        updateActionEnabled(binding.genericShareButton, false)
        updateActionEnabled(binding.instagramStoriesButton, false)
        updateActionEnabled(binding.saveToDeviceButton, false)

        binding.genericShareButton.setOnClickListener {
            viewModel.onGenericShareClicked()
        }

        binding.instagramStoriesButton.setOnClickListener {
            viewModel.onInstagramStoriesClicked()
        }

        binding.saveToDeviceButton.setOnClickListener {
            if (requiresLegacyStoragePermission()) {
                requestStoragePermissionLauncher.launch(Manifest.permission.WRITE_EXTERNAL_STORAGE)
            } else {
                viewModel.onSaveToDeviceClicked()
            }
        }
    }

    private fun handleLaunchShare(effect: ChatPhotoShareEffect.LaunchShare) {
        val result = when (effect.target) {
            ShareTarget.GENERIC -> shareDispatcher.shareGeneric(
                context = requireContext(),
                exportedImage = effect.exportedImage,
                chooserTitle = getString(R.string.chat_photo_share_chooser_title)
            )
            ShareTarget.INSTAGRAM_STORIES -> shareDispatcher.shareInstagramStories(
                context = requireContext(),
                exportedImage = effect.exportedImage,
                facebookAppId = getString(R.string.facebook_app_id)
            )
            ShareTarget.SAVE_TO_DEVICE -> return
        }

        viewModel.onShareDispatched(effect.target, result)
        result.messageResId?.let { messageResId ->
            Toast.makeText(requireContext(), messageResId, Toast.LENGTH_SHORT).show()
        }
        if (result.success) {
            findNavController().navigateUp()
        }
    }

    private fun renderDots() {
        binding.previewDots.removeAllViews()
        ShareTemplate.all.forEachIndexed { index, _ ->
            val dotView = View(requireContext()).apply {
                background = ContextCompat.getDrawable(context, R.drawable.bg_chat_photo_share_dot)
            }
            val size = resources.getDimensionPixelSize(R.dimen.chat_photo_share_dot_size)
            val margin = resources.getDimensionPixelSize(R.dimen.chat_photo_share_dot_margin)
            val layoutParams = LinearLayout.LayoutParams(size, size).apply {
                leftMargin = if (index == 0) 0 else margin
            }
            binding.previewDots.addView(dotView, layoutParams)
        }
    }

    private fun updateSelectedDot(selectedIndex: Int) {
        repeat(binding.previewDots.childCount) { index ->
            binding.previewDots.getChildAt(index).isSelected = index == selectedIndex
        }
    }

    private fun templateTitle(template: ShareTemplate): String {
        val titleRes = when (template) {
            ShareTemplate.ORIGINAL -> R.string.chat_photo_share_template_original_title
            ShareTemplate.PHOTO_CARD -> R.string.chat_photo_share_template_photo_card_title
            ShareTemplate.TRANSPARENCY -> R.string.chat_photo_share_template_transparency_title
        }
        return getString(titleRes)
    }

    private fun templateDescription(template: ShareTemplate): String {
        val descriptionRes = when (template) {
            ShareTemplate.ORIGINAL -> R.string.chat_photo_share_template_original_description
            ShareTemplate.PHOTO_CARD -> R.string.chat_photo_share_template_photo_card_description
            ShareTemplate.TRANSPARENCY -> R.string.chat_photo_share_template_transparency_description
        }
        return getString(descriptionRes)
    }

    private fun requiresLegacyStoragePermission(): Boolean {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.Q &&
            ContextCompat.checkSelfPermission(
                requireContext(),
                Manifest.permission.WRITE_EXTERNAL_STORAGE
            ) != PackageManager.PERMISSION_GRANTED
    }

    private fun applyWindowInsets() {
        val initialBottom = binding.contentContainer.paddingBottom
        ViewCompat.setOnApplyWindowInsetsListener(binding.contentContainer) { view, windowInsets ->
            val insets = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars())
            val bottomInset = if (EdgeToEdgeUtils.hasButtonNavigation(requireContext())) {
                0
            } else {
                insets.bottom
            }
            view.updatePadding(bottom = initialBottom + bottomInset)
            windowInsets
        }
        ViewCompat.requestApplyInsets(binding.root)
    }

    private fun updateActionEnabled(view: View, enabled: Boolean) {
        view.isEnabled = enabled
        view.alpha = if (enabled) 1f else 0.45f
    }
}
