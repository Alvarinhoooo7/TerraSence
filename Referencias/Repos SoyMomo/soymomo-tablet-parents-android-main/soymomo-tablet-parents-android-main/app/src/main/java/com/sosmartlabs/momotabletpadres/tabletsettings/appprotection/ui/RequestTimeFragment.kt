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
import com.sosmartlabs.momotabletpadres.databinding.FragmentTabletRequestTimeBinding
import com.sosmartlabs.momotabletpadres.utils.WindowInsetsUtils
import com.sosmartlabs.momotabletpadres.viewmodels.RequestTimeViewModel
import com.sosmartlabs.momotabletpadres.tablet.TabletViewModel
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber
import java.io.File

@AndroidEntryPoint
class RequestTimeFragment : Fragment() {

    private var binding: FragmentTabletRequestTimeBinding? = null
    private val requestTimeViewModel: RequestTimeViewModel by viewModels()
    private val tabletViewModel: TabletViewModel by activityViewModels()
    private var currentTablet: Tablet? = null

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        Timber.d("RequestTimeFragment: Creating view with layout inflater")
        binding = FragmentTabletRequestTimeBinding.inflate(inflater, container, false)
        return binding?.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Timber.d("RequestTimeFragment: View created, initializing components")
        
        setupToolbar()
        setupViewModel()
        observeTablet()
        setRequestId()
        getRequestState()
        setupListeners()

        binding?.let {
            WindowInsetsUtils.applyEdgeToEdgeInsets(
                root = it.root,
                topView = it.appBarLayoutRequestTime,
                bottomView = it.root
            )
        }
    }

    private fun setupToolbar() {
        Timber.d("RequestTimeFragment: Configuring toolbar with title and navigation")
        binding?.toolbarLinkDevice?.let { toolbar ->
            (activity as AppCompatActivity).setSupportActionBar(toolbar)
            (activity as AppCompatActivity).supportActionBar?.apply {
                title = getString(R.string.request_time_text_title)
                setDisplayShowTitleEnabled(true)
                setDisplayHomeAsUpEnabled(true)
                setDisplayShowHomeEnabled(true)
            }
        }
        setHasOptionsMenu(true)
    }

    private fun setupViewModel() {
        Timber.d("RequestTimeFragment: Setting up view model observers")
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
            Timber.d("RequestTimeFragment: Time limit updated to: $limit")
            binding?.chipTimeLimit?.text = DateUtil.timeLimitStringFormatter(limit)
        }

        requestTimeViewModel.state.observe(viewLifecycleOwner) { state ->
            Timber.d("RequestTimeFragment: Request state changed to: $state")
            updateUIForState(state)
        }
    }

    private fun updateUIForState(state: String) {
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
                    requestTimeStatus.text = requireContext().getString(R.string.request_time_status_accepted)
                    requestTimeStatus.setTextColor(greenColorValue)
                }
                "rejected" -> {
                    requestTimeStatus.text = requireContext().getString(R.string.request_time_status_rejected)
                    requestTimeStatus.setTextColor(redColorValue)
                }
                "pending" -> {
                    requestTimeStatus.text = requireContext().getString(R.string.request_time_status_pending)
                    requestTimeStatus.setTextColor(purpleColorValue)
                }
                "used" -> {
                    requestTimeUsedText.text = requireContext().getString(
                        R.string.request_time_status_used,
                        currentTablet?.profileName
                    )
                    requestTimeStatus.text = requireContext().getString(R.string.request_time_status_accepted)
                    requestTimeStatus.setTextColor(greenColorValue)
                }
            }
        }
    }

    private fun observeTablet() {
        Timber.d("RequestTimeFragment: Setting up tablet observation")
        tabletViewModel.currentTablet.observe(viewLifecycleOwner) { tablet ->
            Timber.d("RequestTimeFragment: Tablet updated - ID: ${tablet.id}")
            currentTablet = tablet
            setupDataViews()
        }
    }

    private fun setupDataViews() {
        Timber.d("RequestTimeFragment: Setting up data views with tablet info")
        val imagesDir = requireContext().getDir(GlobalConstants.USERS_DATA_DIR, Context.MODE_PRIVATE)
        val iconPath = "${currentTablet?.objectId}_profile_picture.png"
        val tmpFile = File(imagesDir, iconPath)
        
        binding?.apply {
            Glide.with(requireContext())
                .load(tmpFile)
                .error(R.drawable.ic_momo_profile)
                .circleCrop()
                .into(tabletProfile)
            requestTimeTextTitle.text = Html.fromHtml(
                requireContext().getString(R.string.request_time_text_title, currentTablet?.profileName)
            )
        }
    }

    private fun setupListeners() {
        Timber.d("RequestTimeFragment: Setting up click listeners")
        setupTimeLimitPickerListener()
        setupBtnAcceptListener()
        setupBtnRejectListener()
    }

    private fun setupTimeLimitPickerListener() {
        binding?.chipTimeLimit?.setOnClickListener {
            Timber.d("RequestTimeFragment: Time limit picker clicked")
            with(TimeLimitPickerDialogFragment(0)) {
                listener = object : TimeLimitPickerDialogFragment.Listener {
                    override fun onLimitTimeSet(limit: Int) {
                        requestTimeViewModel.setTimeLimit(limit)
                    }
                }
                show(this@RequestTimeFragment.childFragmentManager, "set time limit")
            }
        }
    }

    private fun setupBtnAcceptListener() {
        binding?.requestTimeBtnAccept?.setOnClickListener {
            Timber.d("RequestTimeFragment: Accept button clicked")
            currentTablet?.let { it1 -> requestTimeViewModel.onAccept(it1) }
        }
    }

    private fun setupBtnRejectListener() {
        binding?.requestTimeBtnReject?.setOnClickListener {
            Timber.d("RequestTimeFragment: Reject button clicked")
            currentTablet?.let { it1 -> requestTimeViewModel.onReject(it1) }
        }
    }

    private fun getRequestState() {
        Timber.d("RequestTimeFragment: Fetching request state")
        requestTimeViewModel.getRequestState("request_time")
    }

    private fun setRequestId() {
        val requestId = requireArguments().getString("objectId")
        Timber.d("RequestTimeFragment: Setting request ID: $requestId")
        requestTimeViewModel.setRequestId(requestId!!)
    }

    override fun onDestroyView() {
        super.onDestroyView()
        binding = null
        Timber.d("RequestTimeFragment: View destroyed and resources cleaned up")
    }
}