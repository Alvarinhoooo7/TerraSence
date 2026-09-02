package com.sosmartlabs.momotabletpadres.tabletsettings.remotescreenshot

import android.app.Dialog
import android.app.ProgressDialog
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.fragment.app.viewModels
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.parse.ParseUser
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.databinding.DialogRemoteCaptureZoomBinding
import com.sosmartlabs.momotabletpadres.databinding.TabletFragmentScreenshotsBinding
import com.sosmartlabs.momotabletpadres.tabletsettings.interfaces.TableListState
import com.sosmartlabs.momotabletpadres.utils.ErrorHandlers
import com.sosmartlabs.momotabletpadres.utils.WindowInsetsUtils
import com.sosmartlabs.momotabletpadres.tablet.TabletViewModel
import com.sosmartlabs.momotabletpadres.glide.loadEncrypted
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber
import java.text.SimpleDateFormat
import java.util.Locale
import androidx.core.graphics.drawable.toDrawable

@AndroidEntryPoint
class TabletRemoteScreenshotFragment : Fragment() {

    private var _binding: TabletFragmentScreenshotsBinding? = null
    private val binding get() = _binding!!

    private lateinit var remoteScreenshotAdapter: RemoteScreenshotAdapter
    private lateinit var recyclerView: RecyclerView
    private lateinit var progressDialog: ProgressDialog

    private val remoteScreenshotViewModel: RemoteScreenshotViewModel by viewModels()
    private val tabletViewModel: TabletViewModel by activityViewModels()

    private lateinit var tablet: Tablet

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        Timber.d("TabletRemoteScreenshotFragment: onCreateView - inflating layout and initializing UI")
        _binding = TabletFragmentScreenshotsBinding.inflate(inflater, container, false)
        setupToolbar()
        setViews()
        remoteScreenshotViewModel.tableListState.value = TableListState.Loading
        Timber.d("TabletRemoteScreenshotFragment: onCreateView - returning root view")
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        Timber.d("TabletRemoteScreenshotFragment: onViewCreated - view created, setting up observers and listeners")
        super.onViewCreated(view, savedInstanceState)
        WindowInsetsUtils.applyEdgeToEdgeInsets(
            root = binding.root,
            topView = binding.appBarLayout,
            bottomView = binding.contentScrollView
        )
        observeViewModel()
        initListeners()
    }

    override fun onResume() {
        super.onResume()
        Timber.d("TabletRemoteScreenshotFragment: onResume - fragment resumed")
        if (::tablet.isInitialized) {
            Timber.d("TabletRemoteScreenshotFragment: onResume - starting polling for tablet ${tablet.objectId}")
            remoteScreenshotViewModel.startPollingScreenshots(tablet)
        } else {
            Timber.w("TabletRemoteScreenshotFragment: onResume - tablet not initialized yet")
        }
    }

    override fun onPause() {
        super.onPause()
        Timber.d("TabletRemoteScreenshotFragment: onPause - stopping polling")
        remoteScreenshotViewModel.stopPolling()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
        Timber.d("TabletRemoteScreenshotFragment: onDestroyView - view destroyed")
    }

    private fun setupToolbar() {
        Timber.d("TabletRemoteScreenshotFragment: setupToolbar - configuring toolbar")
        (activity as? AppCompatActivity)?.apply {
            setSupportActionBar(binding.toolbar)
            supportActionBar?.apply {
                setDisplayShowTitleEnabled(false)
                setDisplayHomeAsUpEnabled(true)
                setDisplayShowHomeEnabled(true)
            }
            Timber.d("TabletRemoteScreenshotFragment: setupToolbar - toolbar configured successfully")
        } ?: run {
            Timber.e("TabletRemoteScreenshotFragment: setupToolbar - Activity is not AppCompatActivity")
            CrashlyticsLog.recordNonFatalError(
                IllegalStateException("Activity is not AppCompatActivity"),
                "TabletRemoteScreenshotFragment: setupToolbar failed"
            )
        }
        setHasOptionsMenu(true)
    }

    private fun observeViewModel() {
        Timber.d("TabletRemoteScreenshotFragment: observeViewModel - observing tablet LiveData")
        tabletViewModel.tablet.observe(viewLifecycleOwner) { tabletData ->
            tabletData?.let {
                tablet = it
                Timber.d("TabletRemoteScreenshotFragment: observeViewModel - tablet data updated: objectId=${it.objectId}")
                // Start polling when tablet data is available
                if (isResumed) {
                    remoteScreenshotViewModel.startPollingScreenshots(tablet)
                }
            }
        }
        
        // Observe table list state
        remoteScreenshotViewModel.tableListState.observe(viewLifecycleOwner) { state ->
            val currentScreenshotCount = remoteScreenshotAdapter.itemCount
            when (state) {
                TableListState.Loading -> {
                    Timber.d("TabletRemoteScreenshotFragment: observeViewModel - State: Loading")
                    binding.progressBar.visibility = View.VISIBLE
                }
                TableListState.Empty -> {
                    Timber.d("TabletRemoteScreenshotFragment: observeViewModel - State: Empty")
                    binding.progressBar.visibility = View.GONE
                    binding.middleText.visibility = View.VISIBLE
                    binding.middleTextUpperImage.visibility = View.VISIBLE
                }
                TableListState.Populated -> {
                    Timber.d("TabletRemoteScreenshotFragment: observeViewModel - State: Populated")
                    binding.progressBar.visibility = View.GONE
                    binding.middleText.visibility = View.GONE
                    binding.middleTextUpperImage.visibility = View.GONE
                }
                TableListState.Error -> {
                    Timber.d("TabletRemoteScreenshotFragment: observeViewModel - State: Error")
                    binding.progressBar.visibility = View.GONE
                    if (currentScreenshotCount == 0) {
                        binding.middleText.visibility = View.VISIBLE
                        binding.middleTextUpperImage.visibility = View.VISIBLE
                    }
                }
                else -> {
                    Timber.w("TabletRemoteScreenshotFragment: observeViewModel - Unknown state: $state")
                }
            }
        }
    }

    private fun initListeners() {
        Timber.d("TabletRemoteScreenshotFragment: initListeners - setting up click listeners")
        binding.remoteCaptureButton.setOnClickListener {
            Timber.d("TabletRemoteScreenshotFragment: remoteCaptureButton clicked - requesting screenshot")
            requestScreenshot()
        }
    }

    private fun requestScreenshot() {
        Timber.d("TabletRemoteScreenshotFragment: requestScreenshot - requesting new screenshot")
        if (!::tablet.isInitialized) {
            Timber.e("TabletRemoteScreenshotFragment: requestScreenshot - tablet not initialized")
            Toast.makeText(context, "Error: Tablet not initialized", Toast.LENGTH_SHORT).show()
            return
        }
        
        progressDialog.show()
        remoteScreenshotViewModel.requestRemoteScreenshot(
            ParseUser.getCurrentUser(),
            tablet
        ) { error, success, message ->
            progressDialog.dismiss()
            if (success) {
                Timber.i("TabletRemoteScreenshotFragment: requestScreenshot - Screenshot requested successfully")
                Toast.makeText(context, getString(R.string.settings_remote_capture_request_sent), Toast.LENGTH_SHORT).show()
            } else {
                Timber.e("TabletRemoteScreenshotFragment: requestScreenshot - Screenshot request failed. Message: $message")
                CrashlyticsLog.log("TabletRemoteScreenshotFragment: requestScreenshot - Screenshot request failed with message: $message")
                if (error != null) {
                    ErrorHandlers.alertDialog(requireContext(), error.code.toString())
                } else {
                    Toast.makeText(context, message ?: getString(R.string.remote_screenshot_error), Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    private fun setViews() {
        Timber.d("TabletRemoteScreenshotFragment: setViews - initializing views and progress dialog")
        recyclerView = binding.recyclerView
        setProgressDialog()
        setRecyclerView()
        Timber.d("TabletRemoteScreenshotFragment: setViews - views initialized")
    }

    private fun setProgressDialog() {
        Timber.d("TabletRemoteScreenshotFragment: setProgressDialog - initializing progress dialog")
        progressDialog = ProgressDialog(context).apply {
            setTitle(getString(R.string.remote_screenshot_dialog_title))
            setMessage(getString(R.string.remote_screenshot_dialog_message))
            setCancelable(false)
            setCanceledOnTouchOutside(false)
        }
        Timber.d("TabletRemoteScreenshotFragment: setProgressDialog - progress dialog initialized")
    }

    private fun setRecyclerView() {
        Timber.d("TabletRemoteScreenshotFragment: setRecyclerView - setting up RecyclerView and adapter")
        remoteScreenshotAdapter = RemoteScreenshotAdapter(context) { position ->
            Timber.d("TabletRemoteScreenshotFragment: setRecyclerView - screenshot clicked at position $position")
            showDialog(position)
        }
        recyclerView.layoutManager = GridLayoutManager(context, 3, RecyclerView.VERTICAL, false)
        recyclerView.adapter = remoteScreenshotAdapter
        updateRecyclerView()
        Timber.d("TabletRemoteScreenshotFragment: setRecyclerView - RecyclerView setup complete")
    }

    private fun updateRecyclerView() {
        Timber.d("TabletRemoteScreenshotFragment: updateRecyclerView - observing remoteScreenshotList LiveData")
        remoteScreenshotViewModel.remoteScreenshotList.observe(viewLifecycleOwner) { screenshots ->
            val previousCount = remoteScreenshotAdapter.itemCount
            Timber.d("TabletRemoteScreenshotFragment: updateRecyclerView - submitting list with ${screenshots.size} items")
            remoteScreenshotAdapter.submitList(screenshots) {
                // Scroll to top only if new items were added at the top
                if (remoteScreenshotAdapter.itemCount > previousCount) {
                    recyclerView.scrollToPosition(0)
                }
            }
        }
    }

    private fun showDialog(position: Int) {
        val remoteScreenshots = remoteScreenshotAdapter.currentList
        Timber.d("TabletRemoteScreenshotFragment: showDialog - showing dialog for screenshot at position $position")
        
        if (position < 0 || position >= remoteScreenshots.size) {
            Timber.e("TabletRemoteScreenshotFragment: showDialog - invalid position $position, list size: ${remoteScreenshots.size}")
            return
        }
        
        val myDialog = Dialog(requireContext())
        var actualPosition: Int = position
        val dialogBinding = DialogRemoteCaptureZoomBinding.inflate(LayoutInflater.from(requireContext()))
        myDialog.setContentView(dialogBinding.root)
        myDialog.window?.setBackgroundDrawable(Color.TRANSPARENT.toDrawable())

        updateDialogArrows(dialogBinding, actualPosition)
        loadDialogImage(dialogBinding, actualPosition)
        setDate(dialogBinding, actualPosition)

        with(dialogBinding) {
            leftArrow.setOnClickListener {
                if (actualPosition > 0) {
                    actualPosition -= 1
                    Timber.d("TabletRemoteScreenshotFragment: showDialog - navigating to previous screenshot at position $actualPosition")
                    updateDialogArrows(dialogBinding, actualPosition)
                    loadDialogImage(dialogBinding, actualPosition)
                    setDate(dialogBinding, actualPosition)
                }
            }

            rightArrow.setOnClickListener {
                if (actualPosition < remoteScreenshots.size - 1) {
                    actualPosition += 1
                    Timber.d("TabletRemoteScreenshotFragment: showDialog - navigating to next screenshot at position $actualPosition")
                    updateDialogArrows(dialogBinding, actualPosition)
                    loadDialogImage(dialogBinding, actualPosition)
                    setDate(dialogBinding, actualPosition)
                }
            }
        }

        myDialog.show()
        Timber.d("TabletRemoteScreenshotFragment: showDialog - dialog shown for screenshot at position $position")
    }
    
    private fun updateDialogArrows(dialogBinding: DialogRemoteCaptureZoomBinding, position: Int) {
        val remoteScreenshots = remoteScreenshotAdapter.currentList
        dialogBinding.leftArrow.visibility = if (position == 0) View.GONE else View.VISIBLE
        dialogBinding.rightArrow.visibility = if (position == remoteScreenshots.size - 1) View.GONE else View.VISIBLE
    }
    
    private fun loadDialogImage(dialogBinding: DialogRemoteCaptureZoomBinding, position: Int) {
        val remoteScreenshots = remoteScreenshotAdapter.currentList
        val screenshot = remoteScreenshots.getOrNull(position)
        
        if (screenshot == null) {
            Timber.e("TabletRemoteScreenshotFragment: loadDialogImage - screenshot is null at position $position")
            dialogBinding.imageZoomed.setImageResource(R.drawable.ic_action_app_hover)
            return
        }

        // Use Glide extension to load encrypted or unencrypted screenshot
        Glide.with(requireContext())
            .loadEncrypted(screenshot, screenshot.objectId ?: "unknown_$position")
            .error(R.drawable.ic_action_app_hover)
            .placeholder(R.drawable.ic_action_app_hover)
            .into(dialogBinding.imageZoomed)
    }

    private fun setDate(dialogBinding: DialogRemoteCaptureZoomBinding, position: Int) {
        val remoteScreenshots = remoteScreenshotAdapter.currentList
        val remoteScreenshot = remoteScreenshots.getOrNull(position)
        
        if (remoteScreenshot?.createdAt == null) {
            Timber.w("TabletRemoteScreenshotFragment: setDate - no date available for position $position")
            dialogBinding.textDate.text = getString(R.string.settings_remote_capture_day_date, "N/A")
            dialogBinding.textLocalisation.text = getString(R.string.settings_remote_capture_time, "N/A")
            return
        }
        
        try {
            val date = remoteScreenshot.createdAt
            val dateFormat = SimpleDateFormat("dd/MM/yy", Locale.getDefault())
            val timeFormat = SimpleDateFormat("HH:mm", Locale.getDefault())
            
            val formattedDate = dateFormat.format(date)
            val formattedTime = timeFormat.format(date)
            
            dialogBinding.textDate.text = getString(R.string.settings_remote_capture_day_date, formattedDate)
            dialogBinding.textLocalisation.text = getString(R.string.settings_remote_capture_time, formattedTime)
            
            Timber.d("TabletRemoteScreenshotFragment: setDate - formatted date: $formattedDate, time: $formattedTime for position $position")
        } catch (e: Exception) {
            Timber.e(e, "TabletRemoteScreenshotFragment: setDate - failed to format date for position $position")
            dialogBinding.textDate.text = getString(R.string.settings_remote_capture_day_date, "Error")
            dialogBinding.textLocalisation.text = getString(R.string.settings_remote_capture_time, "Error")
        }
    }
}
