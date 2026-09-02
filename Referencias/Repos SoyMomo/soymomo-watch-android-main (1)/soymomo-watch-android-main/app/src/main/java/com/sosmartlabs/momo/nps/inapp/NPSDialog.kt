package com.sosmartlabs.momo.nps.inapp

import android.app.Dialog
import android.content.Context
import android.content.DialogInterface
import android.graphics.Color
import android.graphics.Rect
import android.graphics.drawable.ColorDrawable
import android.os.Bundle
import android.view.LayoutInflater
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.view.inputmethod.InputMethodManager
import android.widget.EditText
import androidx.core.os.BundleCompat
import androidx.fragment.app.DialogFragment
import androidx.fragment.app.FragmentManager
import androidx.fragment.app.FragmentTransaction
import androidx.lifecycle.MutableLiveData
import com.sosmartlabs.momo.databinding.NpsDialogFragmentBinding
import com.sosmartlabs.momo.nps.NPSScoreAdapter
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.models.NPSScheduler
import com.sosmartlabs.momo.review.ReviewPromptRepository
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber
import javax.inject.Inject

@AndroidEntryPoint
class NPSDialog : DialogFragment() {

    @Inject
    lateinit var reviewPromptRepository: ReviewPromptRepository

    private lateinit var binding: NpsDialogFragmentBinding
    private lateinit var npsAdapter: NPSScoreAdapter
    private lateinit var npsScheduler: NPSScheduler
    val userComment: MutableLiveData<String> = MutableLiveData()
    private var selectedValue: Int = NO_SELECTION
    private var submitted: Boolean = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        arguments?.let {
            npsScheduler = requireNotNull(
                BundleCompat.getParcelable(it, ARG_NPS_SCHEDULER, NPSScheduler::class.java)
            ) { "NPSDialog requires an NPSScheduler argument." }
        }
        savedInstanceState?.let {
            selectedValue = it.getInt(STATE_SELECTED_VALUE, NO_SELECTION)
            submitted = it.getBoolean(STATE_SUBMITTED, false)
            it.getString(STATE_USER_COMMENT)?.let { comment -> userComment.value = comment }
        }
    }

    override fun onCreateDialog(savedInstanceState: Bundle?): Dialog {
        return object : Dialog(requireContext(), theme) {
            override fun dispatchTouchEvent(ev: MotionEvent): Boolean {
                if (ev.action == MotionEvent.ACTION_DOWN) {
                    dismissKeyboardIfOutsideEditText(ev)
                }
                return super.dispatchTouchEvent(ev)
            }
        }
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        Timber.d("NPSDialog: Creating view")
        CrashlyticsLog.log("NPSDialog: Creating view")

        binding = NpsDialogFragmentBinding.inflate(inflater, container, false)
        binding.npsdialog = this
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Timber.d("NPSDialog: View created")
        CrashlyticsLog.log("NPSDialog: View created - setting up UI components")
        setupGridView()
        setupDialogWindow()
        setupListeners()
        applyInitialSubmitState()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        outState.putInt(STATE_SELECTED_VALUE, selectedValue)
        outState.putBoolean(STATE_SUBMITTED, submitted)
        outState.putString(STATE_USER_COMMENT, userComment.value)
    }

    private fun setupGridView() {
        Timber.d("NPSDialog: Setting up grid view")
        CrashlyticsLog.log("NPSDialog: Initializing NPS score adapter")

        npsAdapter = NPSScoreAdapter(requireContext(), selectedValue)
        binding.gridView.adapter = npsAdapter
    }

    private fun setupDialogWindow() {
        Timber.d("NPSDialog: Configuring dialog window")
        CrashlyticsLog.log("NPSDialog: Setting up dialog window properties")

        dialog?.window?.apply {
            setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
            setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))
            setDimAmount(DIM_AMOUNT)
        }
    }

    private fun setupListeners() {
        Timber.d("NPSDialog: Setting up listeners")
        CrashlyticsLog.log("NPSDialog: Initializing UI listeners")

        npsAdapter.selectedPosition.observe(viewLifecycleOwner) {
            Timber.d("NPSDialog: Selected position changed to $it")
            CrashlyticsLog.log("NPSDialog: User selected NPS score: $it")

            selectedValue = it ?: NO_SELECTION
            binding.submit.isEnabled = hasSelection()
        }

        binding.submit.setOnClickListener {
            Timber.d("NPSDialog: Submit button clicked with score: $selectedValue")
            CrashlyticsLog.log("NPSDialog: User submitted NPS score: $selectedValue")

            if (hasSelection()) {
                submitted = true
                dismiss()
            }
        }

        binding.closeNps.setOnClickListener {
            Timber.d("NPSDialog: Close button clicked")
            CrashlyticsLog.log("NPSDialog: User closed NPS dialog without submitting")
            dismiss()
        }
    }

    private fun applyInitialSubmitState() {
        binding.submit.isEnabled = hasSelection()
    }

    private fun hasSelection(): Boolean = selectedValue in 1..10

    private fun Dialog.dismissKeyboardIfOutsideEditText(ev: MotionEvent) {
        val focused = currentFocus as? EditText ?: return
        val rect = Rect()
        focused.getGlobalVisibleRect(rect)
        if (!rect.contains(ev.rawX.toInt(), ev.rawY.toInt())) {
            val imm = context.getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager
            imm.hideSoftInputFromWindow(focused.windowToken, 0)
            focused.clearFocus()
        }
    }

    override fun onDismiss(dialog: DialogInterface) {
        Timber.d("NPSDialog: Dialog dismissed, submitted: $submitted")
        CrashlyticsLog.log("NPSDialog: Dialog dismissed - handling submission state")

        super.onDismiss(dialog)
        if (submitted) {
            flagPromoterForPlayReview()

            CrashlyticsLog.log("NPSDialog: Showing confirmation dialog")
            showConfirmDialog()

            CrashlyticsLog.log("NPSDialog: Sending NPS report")
            sendNPSReport()
        } else {
            CrashlyticsLog.log("NPSDialog: Sending rejected NPS report")
            NPSReporter.sendRejectedNPSReport(npsScheduler)
        }
    }

    private fun flagPromoterForPlayReview() {
        if (selectedValue in PROMOTER_RANGE) {
            Timber.i("NPSDialog: Flagging user as NPS promoter (score=$selectedValue) for Play Review")
            CrashlyticsLog.log("NPSDialog: Flagging user as NPS promoter for Play Review")
            reviewPromptRepository.setNpsPromoterFeedback(true)
        }
    }

    private fun showConfirmDialog() {
        Timber.d("NPSDialog: Showing confirmation dialog")
        CrashlyticsLog.log("NPSDialog: Creating NPS confirmation dialog")

        val confirmDialog = NPSSubmitDialog()
        activity?.supportFragmentManager?.let {
            CrashlyticsLog.log("NPSDialog: Displaying confirmation dialog")
            confirmDialog.show(it, "ConfirmDialog")
        }
    }

    private fun sendNPSReport() {
        Timber.d("NPSDialog: Sending NPS report with score: $selectedValue")
        CrashlyticsLog.log("NPSDialog: Preparing to send NPS report")

        context?.let {
            CrashlyticsLog.log("NPSDialog: Sending NPS report with score $selectedValue and comment: ${userComment.value}")
            NPSReporter.sendNPSReport(
                it,
                npsScheduler,
                selectedValue,
                userComment.value
            )
        }
    }

    override fun show(manager: FragmentManager, tag: String?) {
        Timber.d("NPSDialog: Showing dialog with tag: $tag")
        CrashlyticsLog.log("NPSDialog: Attempting to show dialog")

        try {
            val ft: FragmentTransaction = manager.beginTransaction()
            ft.add(this, tag)
            ft.commit()
            CrashlyticsLog.log("NPSDialog: Dialog shown successfully")
        } catch (e: IllegalStateException) {
            Timber.e("NPSDialog: Illegal State Exception while showing dialog: ${e.message}")
            CrashlyticsLog.recordNonFatalError(e, "NPSDialog: Failed to show dialog")
        }
    }

    companion object {
        private const val ARG_NPS_SCHEDULER = "nps_scheduler"
        private const val STATE_SELECTED_VALUE = "state_selected_value"
        private const val STATE_SUBMITTED = "state_submitted"
        private const val STATE_USER_COMMENT = "state_user_comment"
        private const val DIM_AMOUNT = 0.6f
        private const val NO_SELECTION = -1
        private val PROMOTER_RANGE = 9..10

        fun newInstance(npsScheduler: NPSScheduler): NPSDialog {
            val args = Bundle()
            args.putParcelable(ARG_NPS_SCHEDULER, npsScheduler)
            val fragment = NPSDialog()
            fragment.arguments = args
            return fragment
        }
    }
}
