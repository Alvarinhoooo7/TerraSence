package com.sosmartlabs.momotabletpadres.nps

import android.content.DialogInterface
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.GridView
import androidx.fragment.app.DialogFragment
import androidx.fragment.app.FragmentManager
import androidx.fragment.app.FragmentTransaction
import androidx.lifecycle.MutableLiveData
import com.parse.ParseObject
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.databinding.NpsDialogFragmentBinding
import com.sosmartlabs.momotabletpadres.models.entity.NPSScheduler
import timber.log.Timber

class NPSDialog : DialogFragment() {

    private lateinit var npsScheduler: NPSScheduler
    lateinit var binding: NpsDialogFragmentBinding
    var userComment: MutableLiveData<String> = MutableLiveData()
    private lateinit var npsAdapter: NPSScoreAdapter
    private var selectedValue: Int = NPSScoreAdapter.NO_SELECTION
    private var submitted: Boolean = false


    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // A DialogFragment must be reconstructable by the system after process
        // death / config change via its no-arg constructor, so the scheduler is
        // passed through arguments instead of the constructor. Only its objectId
        // is needed downstream (see NPSReporter), so a data-less reference suffices.
        npsScheduler = ParseObject.createWithoutData(
            NPSScheduler::class.java,
            requireArguments().getString(ARG_NPS_SCHEDULER_ID)
        )
        // Restore the in-progress survey across rotation / process death. Without
        // this, a recreation resets selectedValue/submitted, losing the user's
        // pick and letting a post-recreation dismiss be misreported as a rejection.
        savedInstanceState?.let {
            selectedValue = it.getInt(STATE_SELECTED_VALUE, NPSScoreAdapter.NO_SELECTION)
            submitted = it.getBoolean(STATE_SUBMITTED, false)
            it.getString(STATE_USER_COMMENT)?.let { comment -> userComment.value = comment }
        }
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View {
        binding = NpsDialogFragmentBinding.inflate(inflater)
        binding.npsdialog = this
        val gridView: GridView = binding.gridView
        // Seed the adapter with any restored score so the grid shows it selected.
        npsAdapter = NPSScoreAdapter(requireContext(), selectedValue)
        gridView.adapter = npsAdapter
        dialog?.window?.setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
        return binding.root
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        outState.putInt(STATE_SELECTED_VALUE, selectedValue)
        outState.putBoolean(STATE_SUBMITTED, submitted)
        outState.putString(STATE_USER_COMMENT, userComment.value)
    }

    override fun onDismiss(dialog: DialogInterface) {
        super.onDismiss(dialog)
        if (submitted) {
            // Always record the NPS (score + optional comment). This is also the
            // private feedback channel for passives/detractors — it goes to the
            // backend, never to the Play Store.
            context?.let { NPSReporter.sendNPSReport(it, npsScheduler, selectedValue, userComment.value) }

            if (selectedValue >= PROMOTER_MIN_SCORE) {
                // Promoter: funnel our happiest user to the Google Play In-App
                // Review so it can turn into a public 5-star rating.
                activity?.let { InAppReviewLauncher.launch(it) }
            } else {
                // Passive/detractor: just thank them; their feedback stays private.
                activity?.let { NPSSubmitDialog().show(it.supportFragmentManager, "ConfirmDialog") }
            }
        } else {
            NPSReporter.sendRejectedNPSReport(npsScheduler)
        }
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        // Two-way LiveData binding (userComment) needs a lifecycle owner so the
        // restored comment is pushed back into the EditText after recreation.
        binding.lifecycleOwner = viewLifecycleOwner

        npsAdapter.selectedPosition.observe(viewLifecycleOwner) {
            selectedValue = it
            renderForScore(it)
        }
        // Apply the initial / restored state (the observer above also fires if a
        // score was restored, but this covers the fresh, no-selection case).
        renderForScore(selectedValue)

        binding.submit.setOnClickListener {
            if (selectedValue >= MIN_SCORE) {
                submitted = true
                dialog?.dismiss()
            }
        }

        binding.closeNps.setOnClickListener {
            dialog?.dismiss()
        }

        dialog?.window?.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))
    }

    private fun renderForScore(score: Int) {
        setSubmitEnabled(score >= MIN_SCORE)
        // Tailor the open-text prompt to the score bucket so the most valuable
        // feedback (detractors: what's wrong; passives: the gap to a 10) is
        // actually solicited; promoters get a low-friction optional.
        binding.userComment.setHint(commentHintFor(score))
    }

    private fun setSubmitEnabled(enabled: Boolean) {
        binding.submit.isEnabled = enabled
        binding.submit.alpha = if (enabled) 1f else DISABLED_ALPHA
    }

    /** Open-text prompt tailored to the NPS bucket (or a neutral prompt pre-selection). */
    private fun commentHintFor(score: Int): Int = when {
        score < MIN_SCORE -> R.string.nps_comment
        score <= 6 -> R.string.nps_comment_detractor
        score <= 8 -> R.string.nps_comment_passive
        else -> R.string.nps_comment_promoter
    }

    override fun show(manager: FragmentManager, tag: String?) {
        try {
            val ft: FragmentTransaction = manager.beginTransaction()
            ft.add(this, tag)
            ft.commit()
        } catch (e: IllegalStateException) {
            Timber.w("[NPSDialog] Illegal State Exception for NPS.")
        }
    }

    companion object {
        private const val ARG_NPS_SCHEDULER_ID = "nps_scheduler_id"
        private const val STATE_SELECTED_VALUE = "state_selected_value"
        private const val STATE_SUBMITTED = "state_submitted"
        private const val STATE_USER_COMMENT = "state_user_comment"

        private const val MIN_SCORE = 1

        /** NPS 9–10 = promoter → route to the Play In-App Review. */
        private const val PROMOTER_MIN_SCORE = 9

        private const val DISABLED_ALPHA = 0.75f

        fun newInstance(npsScheduler: NPSScheduler): NPSDialog =
            NPSDialog().apply {
                arguments = Bundle().apply {
                    putString(ARG_NPS_SCHEDULER_ID, npsScheduler.objectId)
                }
            }
    }
}
