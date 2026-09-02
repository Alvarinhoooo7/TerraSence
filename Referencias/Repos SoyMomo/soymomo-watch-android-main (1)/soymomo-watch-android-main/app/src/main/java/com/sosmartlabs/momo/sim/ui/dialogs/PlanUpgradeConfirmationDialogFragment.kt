package com.sosmartlabs.momo.sim.ui.dialogs

import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.graphics.drawable.toDrawable
import androidx.core.os.bundleOf
import androidx.fragment.app.DialogFragment
import androidx.fragment.app.setFragmentResult
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.DialogPlanUpgradeConfirmationBinding
import com.sosmartlabs.momo.utils.ui.DefaultIcons
import com.sosmartlabs.momo.utils.ui.GradientBackground
import com.sosmartlabs.momo.utils.ui.loadImage
import com.sosmartlabs.momo.utils.support.PrivacyPolicyLauncher
import com.sosmartlabs.momo.utils.support.TermsAndConditionsLauncher
import dagger.hilt.android.AndroidEntryPoint
import java.text.NumberFormat
import java.util.Currency

@AndroidEntryPoint
class PlanUpgradeConfirmationDialogFragment : DialogFragment(R.layout.dialog_plan_upgrade_confirmation) {

    private lateinit var binding: DialogPlanUpgradeConfirmationBinding
    private var didSendResult = false

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        binding = DialogPlanUpgradeConfirmationBinding.inflate(inflater, container, false)
        dialog?.window?.setBackgroundDrawable(Color.TRANSPARENT.toDrawable())
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        bindPlanData()
        setupListeners()
        updateConfirmButtonState()
    }

    override fun onStart() {
        super.onStart()
        dialog?.window?.setLayout(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        )
    }

    override fun onDismiss(dialog: android.content.DialogInterface) {
        super.onDismiss(dialog)
        if (!didSendResult) {
            setFragmentResult(
                REQUEST_KEY,
                bundleOf(KEY_ACTION to ACTION_CANCEL)
            )
        }
    }

    private fun bindPlanData() {
        val gradient = GradientBackground.createGradient(
            requireArguments().getString(ARG_PLAN_COLORS).orEmpty(),
            GradientDrawable.Orientation.RIGHT_LEFT
        )
        binding.planLogoContainer.background = gradient

        val logoUrl = requireArguments().getString(ARG_PLAN_LOGO_URL)
        if (logoUrl.isNullOrBlank()) {
            binding.planLogo.setImageResource(DefaultIcons.SIM_SUBSCRIPTION_PLAN)
        } else {
            binding.planLogo.loadImage(logoUrl, fallback = DefaultIcons.SIM_SUBSCRIPTION_PLAN)
        }

        binding.planTitle.text = requireArguments().getString(ARG_PLAN_TITLE).orEmpty()
        binding.planPrice.text = formatPrice(
            price = requireArguments().getFloat(ARG_PLAN_PRICE),
            currencyCode = requireArguments().getString(ARG_PLAN_CURRENCY_CODE).orEmpty(),
            currencySymbol = requireArguments().getString(ARG_PLAN_CURRENCY_SYMBOL).orEmpty()
        )
    }

    private fun setupListeners() {
        binding.textViewTc.setOnClickListener {
            TermsAndConditionsLauncher.launchTermsAndConditionsLauncher(requireContext())
        }

        binding.textViewNp.setOnClickListener {
            PrivacyPolicyLauncher.launchPrivacyPolicyLauncher(requireContext())
        }

        binding.checkboxTc.setOnCheckedChangeListener { _, _ ->
            updateConfirmButtonState()
        }

        binding.checkboxNp.setOnCheckedChangeListener { _, _ ->
            updateConfirmButtonState()
        }

        binding.buttonCancel.setOnClickListener {
            if (didSendResult) return@setOnClickListener
            didSendResult = true
            setFragmentResult(REQUEST_KEY, bundleOf(KEY_ACTION to ACTION_CANCEL))
            dismiss()
        }

        binding.buttonConfirm.setOnClickListener {
            // Single-shot: a fast double-tap must not emit ACTION_CONFIRM twice
            // (the listener calls the money-sensitive confirmUpgrade()).
            if (didSendResult || !canConfirm()) return@setOnClickListener
            didSendResult = true
            binding.buttonConfirm.isEnabled = false
            setFragmentResult(REQUEST_KEY, bundleOf(KEY_ACTION to ACTION_CONFIRM))
            dismiss()
        }
    }

    private fun updateConfirmButtonState() {
        binding.buttonConfirm.isEnabled = canConfirm()
        binding.buttonConfirm.alpha = if (canConfirm()) 1f else 0.5f
    }

    private fun canConfirm(): Boolean {
        return binding.checkboxTc.isChecked && binding.checkboxNp.isChecked
    }

    private fun formatPrice(price: Float, currencyCode: String, currencySymbol: String): String {
        return try {
            val currency = Currency.getInstance(currencyCode)
            val formatter = NumberFormat.getCurrencyInstance().apply {
                this.currency = currency
                maximumFractionDigits = currency.defaultFractionDigits
            }
            formatter.format(price)
        } catch (_: Exception) {
            "$price $currencySymbol"
        }
    }

    companion object {
        const val REQUEST_KEY = "plan_upgrade_confirmation_request"
        const val KEY_ACTION = "action"
        const val ACTION_CONFIRM = "confirm"
        const val ACTION_CANCEL = "cancel"

        private const val ARG_PLAN_TITLE = "arg_plan_title"
        private const val ARG_PLAN_PRICE = "arg_plan_price"
        private const val ARG_PLAN_CURRENCY_CODE = "arg_plan_currency_code"
        private const val ARG_PLAN_CURRENCY_SYMBOL = "arg_plan_currency_symbol"
        private const val ARG_PLAN_LOGO_URL = "arg_plan_logo_url"
        private const val ARG_PLAN_COLORS = "arg_plan_colors"

        fun newInstance(
            title: String,
            price: Float,
            currencyCode: String,
            currencySymbol: String,
            logoUrl: String?,
            backgroundImageColors: String
        ): PlanUpgradeConfirmationDialogFragment {
            return PlanUpgradeConfirmationDialogFragment().apply {
                arguments = bundleOf(
                    ARG_PLAN_TITLE to title,
                    ARG_PLAN_PRICE to price,
                    ARG_PLAN_CURRENCY_CODE to currencyCode,
                    ARG_PLAN_CURRENCY_SYMBOL to currencySymbol,
                    ARG_PLAN_LOGO_URL to logoUrl,
                    ARG_PLAN_COLORS to backgroundImageColors
                )
            }
        }
    }
}
