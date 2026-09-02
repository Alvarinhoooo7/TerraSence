package com.sosmartlabs.momotabletpadres.tabletsettings.appprotection.ui

import android.content.Context
import android.graphics.Color
import android.os.Bundle
import android.text.Html
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.fragment.app.viewModels
import com.bumptech.glide.Glide
import com.google.android.material.snackbar.Snackbar
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.utils.DateUtil
import com.sosmartlabs.momotabletpadres.GlobalConstants
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.databinding.FragmentTabletRequestTimeAppBinding
import com.sosmartlabs.momotabletpadres.glide.loadAppIcon
import com.sosmartlabs.momotabletpadres.utils.WindowInsetsUtils
import com.sosmartlabs.momotabletpadres.viewmodels.RequestTimeViewModel
import com.sosmartlabs.momotabletpadres.tablet.TabletViewModel
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber
import java.io.File

@AndroidEntryPoint
class RequestTimeAppFragment : Fragment() {

    private var binding: FragmentTabletRequestTimeAppBinding? = null
    private val requestTimeViewModel: RequestTimeViewModel by viewModels()
    private val tabletViewModel: TabletViewModel by activityViewModels()
    private var currentTablet: Tablet? = null

    init {
        Timber.d("RequestTimeAppFragment: Fragment initialization started")
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        Timber.d("RequestTimeAppFragment: Creating view with inflater")
        binding = FragmentTabletRequestTimeAppBinding.inflate(inflater, container, false)
        return binding?.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Timber.d("RequestTimeAppFragment: View created, starting component initialization")
        
        setupToolbar()
        observeTablet()
        setupViewModel()
        setRequestId()
        getRequestState()
        getAppIcon()
        setupListeners()

        binding?.let {
            WindowInsetsUtils.applyEdgeToEdgeInsets(
                root = it.root,
                topView = it.appBarLayoutRequestTimeApp,
                bottomView = it.root
            )
        }
    }

    private fun setupToolbar() {
        Timber.d("RequestTimeAppFragment: Configuring toolbar")
        binding?.toolbarLinkDevice?.let { toolbar ->
            (activity as AppCompatActivity).setSupportActionBar(toolbar)
            (activity as AppCompatActivity).supportActionBar?.apply {
                title = getString(R.string.request_time_app_title)
                setDisplayShowTitleEnabled(true)
                setDisplayHomeAsUpEnabled(true)
                setDisplayShowHomeEnabled(true)
            }
        }
        setHasOptionsMenu(true)
    }

    private fun observeTablet() {
        Timber.d("RequestTimeAppFragment: Setting up tablet observation")
        tabletViewModel.currentTablet.observe(viewLifecycleOwner) { tablet ->
            Timber.d("RequestTimeAppFragment: Tablet updated with ID: ${tablet.id}")
            currentTablet = tablet
            setupDataViews()
        }
    }

    private fun setupViewModel() {
        Timber.d("RequestTimeAppFragment: Initializing ViewModel observers")
        requestTimeViewModel.showSnackbarEvent.observe(viewLifecycleOwner) {
            if (it == true) {
                Snackbar.make(
                    requireActivity().findViewById(android.R.id.content),
                    getString(R.string.snackbar_text_request_time),
                    Snackbar.LENGTH_SHORT
                ).show()
                requestTimeViewModel.doneShowingSnackbar()
            }
        }

        requestTimeViewModel.timeLimit.observe(viewLifecycleOwner) { limit ->
            Timber.d("RequestTimeAppFragment: Time limit updated to: $limit")
            binding?.chipTimeLimit?.text = DateUtil.timeLimitStringFormatter(limit)
        }

        requestTimeViewModel.appIcon.observe(viewLifecycleOwner) { url ->
            Timber.d("RequestTimeAppFragment: App icon URL updated: $url")
            setAppIcon(url)
        }

        requestTimeViewModel.state.observe(viewLifecycleOwner) { state ->
            Timber.d("RequestTimeAppFragment: Request state changed to: $state")
            updateRequestState(state)
        }
    }

    private fun updateRequestState(state: String) {
        val greenColorValue = Color.parseColor("#21CD9A")
        val redColorValue = Color.parseColor("#FB2B5D")
        val purpleColorValue = Color.parseColor("#673AB7")
        val grayColorValue = Color.parseColor("#AEAEAE")
        val whiteColorValue = Color.parseColor("#FFFFFF")

        binding?.apply {
            if (state != "pending") {
                requestTimeBtnAccept.isEnabled = false
                requestTimeBtnReject.isEnabled = false
                requestTimeBtnAccept.setBackgroundColor(grayColorValue)
                requestTimeBtnReject.setBackgroundColor(grayColorValue)
                requestTimeBtnAccept.setTextColor(whiteColorValue)
                requestTimeBtnReject.setTextColor(whiteColorValue)
            }

            when (state) {
                "accepted" -> {
                    requestTimeAppState.text = requireContext().getString(R.string.request_time_status_accepted)
                    requestTimeAppState.setTextColor(greenColorValue)
                }
                "rejected" -> {
                    requestTimeAppState.text = requireContext().getString(R.string.request_time_status_rejected)
                    requestTimeAppState.setTextColor(redColorValue)
                }
                "pending" -> {
                    requestTimeAppState.text = requireContext().getString(R.string.request_time_status_pending)
                    requestTimeAppState.setTextColor(purpleColorValue)
                }
                "used" -> {
                    requestTimeAppUsedText.text = requireContext().getString(
                        R.string.request_time_status_used,
                        currentTablet?.profileName
                    )
                    requestTimeAppState.text = requireContext().getString(R.string.request_time_status_accepted)
                    requestTimeAppState.setTextColor(greenColorValue)
                }
            }
        }
    }

    private fun getAppIcon() {
        val packageName = requireArguments().getString("packageName")
        Timber.d("RequestTimeAppFragment: Fetching app icon for package: $packageName")
        requestTimeViewModel.getAppIcon(packageName!!)
    }

    private fun setAppIcon(url: String?) {
        Timber.d("RequestTimeAppFragment: Setting app icon with URL: $url")
        binding?.apply {
            appIcon.loadAppIcon(url, requireArguments().getString("appName"))
        }
    }

    private fun setupDataViews() {
        val appName = requireArguments().getString("appName")
        val packageName = requireArguments().getString("packageName")
        Timber.d("RequestTimeAppFragment: Setting up data views - appName: $appName, packageName: $packageName")

        val imagesDir = requireContext().getDir(GlobalConstants.USERS_DATA_DIR, Context.MODE_PRIVATE)
        val iconPath = "${currentTablet?.objectId}_profile_picture.png"
        val tmpFile = File(imagesDir, iconPath)

        binding?.apply {
            requestTimeAppName.text = appName
            requestTimeAppTextTitle.text = Html.fromHtml(
                requireContext().getString(R.string.request_time_app_text_title, currentTablet?.profileName)
            )

            Glide.with(requireContext())
                .load(tmpFile)
                .error(R.drawable.ic_momo_profile)
                .circleCrop()
                .into(tabletProfile)
        }
    }

    private fun setupListeners() {
        Timber.d("RequestTimeAppFragment: Setting up click listeners")
        setupTimeLimitPickerListener()
        setupBtnAcceptListener()
        setupBtnRejectListener()
    }

    private fun setupTimeLimitPickerListener() {
        binding?.chipTimeLimit?.setOnClickListener {
            Timber.d("RequestTimeAppFragment: Time limit picker clicked")
            with(TimeLimitPickerDialogFragment(0)) {
                listener = object : TimeLimitPickerDialogFragment.Listener {
                    override fun onLimitTimeSet(limit: Int) {
                        requestTimeViewModel.setTimeLimit(limit)
                    }
                }
                show(this@RequestTimeAppFragment.childFragmentManager, "set time limit")
            }
        }
    }

    private fun setupBtnAcceptListener() {
        binding?.requestTimeBtnAccept?.setOnClickListener {
            Timber.d("RequestTimeAppFragment: Accept button clicked")
            currentTablet?.let { it1 -> requestTimeViewModel.onAcceptTimeForApp(it1) }
        }
    }

    private fun setupBtnRejectListener() {
        binding?.requestTimeBtnReject?.setOnClickListener {
            Timber.d("RequestTimeAppFragment: Reject button clicked")
            currentTablet?.let { it1 -> requestTimeViewModel.onRejectTimeForApp(it1) }
        }
    }

    private fun getRequestState() {
        Timber.d("RequestTimeAppFragment: Fetching request state")
        requestTimeViewModel.getRequestState("request_time_app")
    }

    private fun setRequestId() {
        val requestId = requireArguments().getString("objectId")
        Timber.d("RequestTimeAppFragment: Setting request ID: $requestId")
        requestTimeViewModel.setRequestId(requestId!!)
    }

    override fun onDestroyView() {
        super.onDestroyView()
        binding = null
        Timber.d("RequestTimeAppFragment: View destroyed and resources cleaned up")
    }
}