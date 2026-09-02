package com.sosmartlabs.momo.sim.ui.dialogs

import android.graphics.Color
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.graphics.drawable.toDrawable
import androidx.fragment.app.DialogFragment
import androidx.fragment.app.activityViewModels
import androidx.recyclerview.widget.LinearLayoutManager
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.DialogRequestSimPopupBinding
import com.sosmartlabs.momo.sim.ui.RequestSimViewModel
import com.sosmartlabs.momo.sim.ui.adapter.RequestSimPlanAdapter
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class RequestSimDialogFragment : DialogFragment(R.layout.dialog_request_sim_popup) {

    private lateinit var binding: DialogRequestSimPopupBinding
    private val viewModel: RequestSimViewModel by activityViewModels()

    private val planAdapter by lazy {
        RequestSimPlanAdapter(discountPercentageProvider = { viewModel.discount.value ?: 0f })
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        binding = DialogRequestSimPopupBinding.inflate(inflater, container, false)
        dialog?.window?.setBackgroundDrawable(Color.TRANSPARENT.toDrawable())
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        binding.requestSimClose.setOnClickListener {
            viewModel.closePopup()
            dismiss()
        }

        binding.requestSimCtaButton.setOnClickListener {
            viewModel.goToForm()
            dismiss()
        }

        binding.requestSimPlansRecycler.apply {
            layoutManager = LinearLayoutManager(requireContext())
            adapter = planAdapter
            isNestedScrollingEnabled = false
        }

        observeViewModel()
    }

    override fun onStart() {
        super.onStart()
        dialog?.window?.setLayout(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        )
    }

    private fun observeViewModel() {
        viewModel.activeCampaign.observe(viewLifecycleOwner) { campaign ->
            val discountPct = (campaign?.discountPercentage ?: 0f).toInt()
            val months = campaign?.discountPeriodMonths ?: 0

            binding.requestSimDiscountPercent.text = getString(R.string.request_sim_popup_discount_percentage, discountPct)
            binding.requestSimDiscountMonths.text = getString(R.string.request_sim_popup_discount_period, months)
        }

        viewModel.isLoadingPlans.observe(viewLifecycleOwner) { isLoading ->
            binding.requestSimPlansProgress.visibility = if (isLoading) View.VISIBLE else View.GONE
        }

        viewModel.availablePlans.observe(viewLifecycleOwner) { plans ->
            planAdapter.submitList(plans)
        }

        binding.requestSimBulletCoverage.text = getString(R.string.request_sim_popup_coverage_label)
        binding.requestSimBulletLocation.text = getString(R.string.request_sim_popup_location_label)
        binding.requestSimBulletBattery.text = getString(R.string.request_sim_popup_battery_label)
        binding.requestSimBottomText.text = getString(R.string.request_sim_popup_bottom_text)
    }

}

