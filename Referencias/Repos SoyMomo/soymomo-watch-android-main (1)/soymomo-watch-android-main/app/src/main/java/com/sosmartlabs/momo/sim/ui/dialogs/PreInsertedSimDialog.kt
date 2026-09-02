package com.sosmartlabs.momo.sim.ui.dialogs

import android.graphics.Color
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.graphics.drawable.toDrawable
import androidx.fragment.app.DialogFragment
import androidx.lifecycle.ViewModelProvider
import androidx.navigation.findNavController
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.DialogPreInsertedSimBinding
import com.sosmartlabs.momo.sim.SimActivity
import com.sosmartlabs.momo.sim.model.Sim
import com.sosmartlabs.momo.sim.ui.NewSubscriptionViewModel
import com.sosmartlabs.momo.sim.ui.fragments.newsubscription.NewSubscriptionLinkSimFragment

class PreInsertedSimDialog: DialogFragment(R.layout.dialog_pre_inserted_sim) {

    /**
     * Binding
     */
    private lateinit var binding: DialogPreInsertedSimBinding

    companion object {
        private const val ARG_SIM_ID = "sim_id"
        private const val ARG_SIM_ICCID = "sim_iccid"

        fun newInstance(sim: Sim): PreInsertedSimDialog {
            val args = Bundle()
            args.putString(ARG_SIM_ID, sim.objectId)
            args.putString(ARG_SIM_ICCID, sim.iccId)
            val fragment = PreInsertedSimDialog()
            fragment.arguments = args
            return fragment
        }
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        binding = DialogPreInsertedSimBinding.inflate(inflater, container, false)
        this.dialog?.window?.setBackgroundDrawable(Color.TRANSPARENT.toDrawable())
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        displaySimIccId()
        setListener()
    }

    override fun onStart() {
        super.onStart()
        dialog?.window?.setLayout(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        )
    }

    private fun displaySimIccId() {
        val iccId = arguments?.getString(ARG_SIM_ICCID) ?: return
        val formattedText = getString(R.string.subscription_link_available_sim_id, iccId)
        binding.preInsertedSimFixDialogSimId.text = formattedText
    }

    private fun setListener() {
        binding.preInsertedSimFixButtonContinueWithout.setOnClickListener {
            dismiss()
        }

        binding.preInsertedSimFixButtonActivate.setOnClickListener {
            if (activity is SimActivity) {
                // Get ViewModel from activity scope
                val viewModel = ViewModelProvider(requireActivity())[NewSubscriptionViewModel::class.java]

                // Get SIM from arguments and set it properly
                val simId = arguments?.getString(ARG_SIM_ID)
                viewModel.setCurrentSimFromPreInsertedById(simId)

                // Navigate to choose plan
                (parentFragment as? NewSubscriptionLinkSimFragment)
                    ?.view?.findNavController()
                    ?.navigate(R.id.action_add_sim_newSubscriptionLinkSimFragment_to_newSubscriptionChoosePlanFragment)
            }
            dismiss()
        }
    }
}