package com.sosmartlabs.momo.videocallhistory

import android.app.ProgressDialog
import android.os.Bundle
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.ActivityVideoCallHistoryBinding
import com.sosmartlabs.momo.utils.Resource
import com.sosmartlabs.momo.utils.ui.toolbar.ToolbarConstructor
import com.sosmartlabs.momo.utils.ui.toolbar.ToolbarNavigationType
import com.sosmartlabs.momo.videocallhistory.ui.VideoCallHistoryViewModel
import com.sosmartlabs.momo.videocallhistory.ui.VideocallFeedbackAdapter
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

/**
 * Activity for VideoCall history
 */
@AndroidEntryPoint
class VideoCallHistoryActivity : AppCompatActivity() {
    @Inject lateinit var toolbarConstructor: ToolbarConstructor

    /**
     * ViewBinding for videocall history
     */
    private lateinit var binding: ActivityVideoCallHistoryBinding

    /**
     * ViewModel for videocall history
     */
    private val viewModel: VideoCallHistoryViewModel by viewModels()

    /**
     * Adapter for loading VideocallFeedback list into a RecyclerView
     */
    private val videocallFeedbackAdapter = VideocallFeedbackAdapter()

    /**
     * ProgressDialog for showing loading status
     */
    private lateinit var progressDialog: ProgressDialog

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        binding = ActivityVideoCallHistoryBinding.inflate(layoutInflater)
        setContentView(binding.root)

        toolbarConstructor
            .setNavigationOnClick(ToolbarNavigationType.SUPPORT_FINISH_AFTER_TRANSITION)
            .setErrorName("VideoCallHistoryActivity")
            .build()

        initViews()
        observeViewModel()
    }

    /**
     * Init the views for this layout
     */
    private fun initViews() {
        progressDialog = ProgressDialog(this)

        with(binding.videoCallsList) {
            adapter = videocallFeedbackAdapter
            layoutManager = LinearLayoutManager(this@VideoCallHistoryActivity)
        }

        binding.videoCallsTimeSelectionGroup.setOnCheckedChangeListener { _, checkedId ->
            when(checkedId) {
                R.id.last_week_video_calls -> viewModel.getLastWeekVideocalls()
                R.id.today_video_calls -> viewModel.getTodayVideocalls()
            }
        }

        if (binding.todayVideoCalls.isChecked) {
            viewModel.getTodayVideocalls()
        } else {
            viewModel.getLastWeekVideocalls()
        }
    }
    /**
     * Observes the ViewModel for this activity
     */
    private fun observeViewModel() {
        viewModel.hasVideocalls.observe(this) { hasVideocalls ->
            progressDialog.dismiss()
            when (hasVideocalls) {
                true -> binding.videoCallHistoryViewFlipper.displayedChild = 0
                false -> binding.videoCallHistoryViewFlipper.displayedChild = 1
            }
        }

        viewModel.videocallsFeedback.observe(this) {
            when (it.status) {
                Resource.Status.LOADING -> {
                    progressDialog.setMessage(getString(R.string.loading))
                    progressDialog.show()
                }
                Resource.Status.LOAD_SUCCESS -> {
                    videocallFeedbackAdapter.submitList(it.data)
                    progressDialog.dismiss()
                }
                Resource.Status.LOAD_ERROR -> {
                    progressDialog.dismiss()
                }
                else -> {
                    // No-Op
                }
            }
        }
    }
}