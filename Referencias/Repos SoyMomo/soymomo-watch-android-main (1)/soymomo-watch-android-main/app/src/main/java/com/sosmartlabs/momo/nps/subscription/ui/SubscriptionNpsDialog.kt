package com.sosmartlabs.momo.nps.subscription.ui

import android.app.Dialog
import android.content.Context
import android.content.DialogInterface
import android.graphics.Color
import android.graphics.Rect
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.view.ViewTreeObserver
import android.view.inputmethod.InputMethodManager
import androidx.core.os.BundleCompat
import androidx.core.view.isVisible
import androidx.fragment.app.DialogFragment
import androidx.fragment.app.FragmentManager
import androidx.fragment.app.FragmentTransaction
import androidx.fragment.app.activityViewModels
import com.sosmartlabs.momo.databinding.SubscriptionNpsDialogFragmentBinding
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.nps.NPSScoreAdapter
import com.sosmartlabs.momo.nps.subscription.model.SubscriptionNpsCancellationReason
import com.sosmartlabs.momo.nps.subscription.model.SubscriptionNpsScheduler
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber
import androidx.core.graphics.drawable.toDrawable

@AndroidEntryPoint
class SubscriptionNpsDialog : DialogFragment() {

    private val viewModel: SubscriptionNpsViewModel by activityViewModels()
    private lateinit var binding: SubscriptionNpsDialogFragmentBinding
    private lateinit var npsAdapter: NPSScoreAdapter
    private lateinit var scheduler: SubscriptionNpsScheduler

    private var selectedScore: Int = NO_SELECTION
    private val selectedReasons: MutableSet<SubscriptionNpsCancellationReason> = mutableSetOf()
    private var otherReasonText: String = ""
    private var improvementComment: String = ""
    private var submitted: Boolean = false
    private var keyboardScrollListener: ViewTreeObserver.OnGlobalLayoutListener? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        scheduler = requireNotNull(
            BundleCompat.getParcelable(requireArguments(), ARG_SCHEDULER, SubscriptionNpsScheduler::class.java)
        ) { "SubscriptionNpsDialog requires a SubscriptionNpsScheduler argument." }

        savedInstanceState?.let {
            selectedScore = it.getInt(STATE_SELECTED_SCORE, NO_SELECTION)
            submitted = it.getBoolean(STATE_SUBMITTED, false)
            it.getString(STATE_SELECTED_REASONS, "")
                .split(",")
                .mapNotNull { key -> SubscriptionNpsCancellationReason.entries.find { r -> r.key == key } }
                .forEach { reason -> selectedReasons.add(reason) }
            otherReasonText = it.getString(STATE_OTHER_REASON, "")
            improvementComment = it.getString(STATE_IMPROVEMENT_COMMENT, "")
        }
    }

    override fun onCreateDialog(savedInstanceState: Bundle?): Dialog {
        return object : Dialog(requireContext(), theme) {
            private var touchStartX = 0f
            private var touchStartY = 0f

            override fun dispatchTouchEvent(ev: MotionEvent): Boolean {
                when (ev.action) {
                    MotionEvent.ACTION_DOWN -> {
                        touchStartX = ev.rawX
                        touchStartY = ev.rawY
                    }
                    MotionEvent.ACTION_UP -> {
                        val dx = kotlin.math.abs(ev.rawX - touchStartX)
                        val dy = kotlin.math.abs(ev.rawY - touchStartY)
                        if (dx < SCROLL_SLOP_PX && dy < SCROLL_SLOP_PX) {
                            maybeHideKeyboard(ev)
                        }
                    }
                }
                return super.dispatchTouchEvent(ev)
            }
        }
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View {
        Timber.d("SubscriptionNpsDialog: onCreateView")
        CrashlyticsLog.log("SubscriptionNpsDialog: onCreateView")
        binding = SubscriptionNpsDialogFragmentBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Timber.d("SubscriptionNpsDialog: onViewCreated")
        CrashlyticsLog.log("SubscriptionNpsDialog: onViewCreated")
        setupGridView()
        setupDialogWindow()
        setupChips()
        setupTextFields()
        setupButtons()
        setupKeyboardScroll()
        restoreState()
        updateSubmitState()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        outState.putInt(STATE_SELECTED_SCORE, selectedScore)
        outState.putBoolean(STATE_SUBMITTED, submitted)
        outState.putString(STATE_SELECTED_REASONS, selectedReasons.joinToString(",") { it.key })
        outState.putString(STATE_OTHER_REASON, otherReasonText)
        outState.putString(STATE_IMPROVEMENT_COMMENT, improvementComment)
    }

    private fun setupGridView() {
        npsAdapter = NPSScoreAdapter(requireContext(), selectedScore)
        binding.gridView.adapter = npsAdapter
        npsAdapter.selectedPosition.observe(viewLifecycleOwner) { score ->
            Timber.d("SubscriptionNpsDialog: score selected=$score")
            CrashlyticsLog.log("SubscriptionNpsDialog: score selected=$score")
            selectedScore = score ?: NO_SELECTION
            updateSubmitState()
        }
    }

    private fun setupDialogWindow() {
        dialog?.window?.apply {
            setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
            setBackgroundDrawable(Color.TRANSPARENT.toDrawable())
            setDimAmount(DIM_AMOUNT)
            setSoftInputMode(android.view.WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE)
        }
    }

    /** Single source of truth for the chip-id <-> cancellation-reason mapping. */
    private fun chipReasonPairs(): List<Pair<Int, SubscriptionNpsCancellationReason>> = listOf(
        binding.chipTooExpensive.id to SubscriptionNpsCancellationReason.TOO_EXPENSIVE,
        binding.chipCoverage.id to SubscriptionNpsCancellationReason.COVERAGE_ISSUES,
        binding.chipAppIssues.id to SubscriptionNpsCancellationReason.APP_ISSUES,
        binding.chipNoLongerNeeded.id to SubscriptionNpsCancellationReason.NO_LONGER_NEEDED,
        binding.chipWatchLost.id to SubscriptionNpsCancellationReason.WATCH_LOST_OR_BROKEN,
        binding.chipOther.id to SubscriptionNpsCancellationReason.OTHER,
    )

    private fun setupChips() {
        val chipToReason = chipReasonPairs().toMap()
        binding.cancellationReasonChips.setOnCheckedStateChangeListener { _, checkedIds ->
            selectedReasons.clear()
            checkedIds.mapNotNull { chipToReason[it] }.forEach { selectedReasons.add(it) }
            Timber.d("SubscriptionNpsDialog: reasons selected=$selectedReasons")
            binding.otherReasonContainer.isVisible = SubscriptionNpsCancellationReason.OTHER in selectedReasons
            updateSubmitState()
        }
    }

    private fun setupTextFields() {
        binding.otherReasonInput.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) = Unit
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) = Unit
            override fun afterTextChanged(s: Editable?) {
                otherReasonText = s?.toString() ?: ""
                updateSubmitState()
            }
        })

        binding.userComment.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) = Unit
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) = Unit
            override fun afterTextChanged(s: Editable?) {
                improvementComment = s?.toString() ?: ""
                updateSubmitState()
            }
        })
    }

    private fun setupKeyboardScroll() {
        var keyboardWasVisible = false
        keyboardScrollListener = ViewTreeObserver.OnGlobalLayoutListener {
            if (!::binding.isInitialized || !isAdded) return@OnGlobalLayoutListener
            val visibleRect = Rect()
            binding.root.getWindowVisibleDisplayFrame(visibleRect)
            val heightDiff = binding.root.rootView.height - visibleRect.height()
            val keyboardIsVisible = heightDiff > KEYBOARD_HEIGHT_THRESHOLD_PX

            if (keyboardIsVisible && !keyboardWasVisible) {
                val focused = dialog?.currentFocus ?: activity?.currentFocus
                if (focused != null && (focused == binding.otherReasonInput || focused == binding.userComment)) {
                    binding.npsScroll.post {
                        val child = binding.npsScroll.getChildAt(0) as? ViewGroup ?: return@post
                        val rect = Rect()
                        focused.getDrawingRect(rect)
                        child.offsetDescendantRectToMyCoords(focused, rect)
                        rect.bottom += SCROLL_EXTRA_PADDING_PX
                        binding.npsScroll.requestChildRectangleOnScreen(child, rect, true)
                    }
                }
            }
            keyboardWasVisible = keyboardIsVisible
        }
        binding.root.viewTreeObserver.addOnGlobalLayoutListener(keyboardScrollListener)
    }

    override fun onDestroyView() {
        keyboardScrollListener?.let {
            if (::binding.isInitialized) {
                binding.root.viewTreeObserver.removeOnGlobalLayoutListener(it)
            }
        }
        keyboardScrollListener = null
        super.onDestroyView()
    }

    private fun setupButtons() {
        binding.submit.setOnClickListener {
            Timber.d("SubscriptionNpsDialog: submit clicked score=$selectedScore reasons=$selectedReasons")
            CrashlyticsLog.log("SubscriptionNpsDialog: submit clicked")
            if (canSubmit()) {
                submitted = true
                dismiss()
            }
        }

        binding.closeNps.setOnClickListener {
            Timber.d("SubscriptionNpsDialog: close clicked without submitting")
            CrashlyticsLog.log("SubscriptionNpsDialog: close clicked")
            dismiss()
        }
    }

    private fun restoreState() {
        if (otherReasonText.isNotEmpty()) {
            binding.otherReasonInput.setText(otherReasonText)
        }
        if (improvementComment.isNotEmpty()) {
            binding.userComment.setText(improvementComment)
        }
        val reasonToChip = chipReasonPairs().associate { (chipId, reason) -> reason to chipId }
        selectedReasons.forEach { reason ->
            reasonToChip[reason]?.let { binding.cancellationReasonChips.check(it) }
        }
        binding.otherReasonContainer.isVisible = SubscriptionNpsCancellationReason.OTHER in selectedReasons
    }

    private fun canSubmit(): Boolean {
        val hasScore = selectedScore in 1..10
        val hasReasons = selectedReasons.isNotEmpty()
        // The free-text comment is optional (the backend treats it as optional); only require the
        // "other" detail when the OTHER reason is selected.
        val otherReasonValid = SubscriptionNpsCancellationReason.OTHER !in selectedReasons || otherReasonText.isNotBlank()
        return hasScore && hasReasons && otherReasonValid
    }

    private fun updateSubmitState() {
        val canSubmit = canSubmit()
        binding.submit.isEnabled = canSubmit
        binding.submitHint.isVisible = !canSubmit
    }

    private fun maybeHideKeyboard(ev: MotionEvent) {
        if (!::binding.isInitialized) return
        val touchX = ev.rawX.toInt()
        val touchY = ev.rawY.toInt()

        val isTouchingAnyEditText = listOf(binding.otherReasonInput, binding.userComment).any { field ->
            if (!field.isVisible) return@any false
            val rect = Rect()
            field.getGlobalVisibleRect(rect)
            rect.contains(touchX, touchY)
        }

        if (!isTouchingAnyEditText) {
            val windowToken = dialog?.window?.decorView?.windowToken ?: return
            val imm = requireContext().getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager
            imm.hideSoftInputFromWindow(windowToken, 0)
            activity?.currentFocus?.clearFocus()
        }
    }

    override fun onDismiss(dialog: DialogInterface) {
        super.onDismiss(dialog)
        if (submitted) {
            // The confirmation ("thank you") dialog is shown by MainActivity only if the backend
            // actually stored the feedback (see SubscriptionNpsViewModel.submitResult).
            viewModel.submitFeedback(
                schedulerId = scheduler.schedulerId,
                score = selectedScore,
                cancellationReasons = selectedReasons.map { it.key },
                otherReason = if (SubscriptionNpsCancellationReason.OTHER in selectedReasons) otherReasonText else null,
                comment = improvementComment.ifBlank { null },
            )
        } else {
            viewModel.rejectFeedback(scheduler.schedulerId)
        }
    }

    override fun show(manager: FragmentManager, tag: String?) {
        Timber.d("SubscriptionNpsDialog: show tag=$tag")
        CrashlyticsLog.log("SubscriptionNpsDialog: show")
        try {
            val ft: FragmentTransaction = manager.beginTransaction()
            ft.add(this, tag)
            ft.commit()
        } catch (e: IllegalStateException) {
            Timber.e(e, "SubscriptionNpsDialog: failed to show dialog")
            CrashlyticsLog.recordNonFatalError(e, "SubscriptionNpsDialog: failed to show")
        }
    }

    companion object {
        private const val ARG_SCHEDULER = "subscription_nps_scheduler"
        private const val STATE_SELECTED_SCORE = "state_selected_score"
        private const val STATE_SUBMITTED = "state_submitted"
        private const val STATE_SELECTED_REASONS = "state_selected_reasons"
        private const val STATE_OTHER_REASON = "state_other_reason"
        private const val STATE_IMPROVEMENT_COMMENT = "state_improvement_comment"
        private const val DIM_AMOUNT = 0.6f
        private const val NO_SELECTION = -1
        private const val SCROLL_SLOP_PX = 12f
        private const val SCROLL_EXTRA_PADDING_PX = 120
        private const val KEYBOARD_HEIGHT_THRESHOLD_PX = 200

        fun newInstance(scheduler: SubscriptionNpsScheduler): SubscriptionNpsDialog {
            return SubscriptionNpsDialog().apply {
                arguments = Bundle().apply { putParcelable(ARG_SCHEDULER, scheduler) }
            }
        }
    }
}
