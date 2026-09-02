package com.sosmartlabs.momo.sim.ui.dialogs

import android.graphics.Color
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.graphics.drawable.toDrawable
import androidx.core.text.HtmlCompat
import androidx.fragment.app.DialogFragment
import androidx.fragment.app.activityViewModels
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.DialogUpgradePlanPopupBinding
import com.sosmartlabs.momo.sim.model.SubscriptionPlan
import com.sosmartlabs.momo.sim.ui.UpgradePlanPopupViewModel
import dagger.hilt.android.AndroidEntryPoint
import java.text.NumberFormat
import java.util.Locale

/**
 * Promo popup shown on the 3rd `MainActivity` resume when the user has an
 * upgrade-eligible subscription. Modeled on `RequestSimDialogFragment`.
 */
@AndroidEntryPoint
class UpgradePlanPopupDialogFragment : DialogFragment(R.layout.dialog_upgrade_plan_popup) {

    private lateinit var binding: DialogUpgradePlanPopupBinding
    private val viewModel: UpgradePlanPopupViewModel by activityViewModels()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        binding = DialogUpgradePlanPopupBinding.inflate(inflater, container, false)
        dialog?.window?.setBackgroundDrawable(Color.TRANSPARENT.toDrawable())
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        binding.upgradePopupClose.setOnClickListener {
            viewModel.closePopup()
            dismiss()
        }

        binding.upgradePopupCtaButton.setOnClickListener {
            viewModel.goToUpgrade()
            dismiss()
        }

        // Subtitle uses inline <b> tags — HtmlCompat preserves them.
        binding.upgradePopupSubtitle.text = HtmlCompat.fromHtml(
            getString(R.string.upgrade_plan_popup_subtitle),
            HtmlCompat.FROM_HTML_MODE_COMPACT
        )

        // Static bullet labels + icons
        bindBullet(
            binding.upgradePopupBulletData.bulletIcon,
            binding.upgradePopupBulletData.bulletText,
            iconRes = R.drawable.high_signal,
            labelRes = R.string.upgrade_plan_popup_bullet_data
        )
        bindBullet(
            binding.upgradePopupBulletVoice.bulletIcon,
            binding.upgradePopupBulletVoice.bulletText,
            iconRes = R.drawable.ic_phone_black_24dp,
            labelRes = R.string.upgrade_plan_popup_bullet_voice
        )
        bindBullet(
            binding.upgradePopupBulletWarranty.bulletIcon,
            binding.upgradePopupBulletWarranty.bulletText,
            iconRes = R.drawable.ic_sim_warranty,
            labelRes = R.string.upgrade_plan_popup_bullet_warranty
        )

        observeViewModel()
    }

    override fun onStart() {
        super.onStart()
        dialog?.window?.setLayout(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        )
    }

    /**
     * Back-press / outside-tap dismissals never reach the close/CTA click listeners,
     * so without this they'd stamp no interaction and the backoff would never advance
     * (the popup would re-show every resume). The X button and CTA use dismiss(), which
     * does not trigger onCancel, so there's no double-stamp.
     */
    override fun onCancel(dialog: android.content.DialogInterface) {
        super.onCancel(dialog)
        viewModel.closePopup()
    }

    private fun observeViewModel() {
        viewModel.cheapestUpgradePlan.observe(viewLifecycleOwner) { cheapest ->
            if (cheapest == null) {
                binding.upgradePopupBulletStartingPrice.root.visibility = View.GONE
                return@observe
            }
            binding.upgradePopupBulletStartingPrice.root.visibility = View.VISIBLE
            bindBullet(
                binding.upgradePopupBulletStartingPrice.bulletIcon,
                binding.upgradePopupBulletStartingPrice.bulletText,
                iconRes = R.drawable.ic_check,
                labelText = getString(
                    R.string.upgrade_plan_popup_bullet_starting_price,
                    formatPrice(cheapest)
                )
            )
        }
    }

    private fun bindBullet(
        icon: android.widget.ImageView,
        text: com.google.android.material.textview.MaterialTextView,
        iconRes: Int,
        labelRes: Int? = null,
        labelText: String? = null,
    ) {
        icon.setImageResource(iconRes)
        if (labelText != null) {
            text.text = labelText
        } else if (labelRes != null) {
            text.setText(labelRes)
        }
    }

    private fun formatPrice(plan: SubscriptionPlan): String {
        val formatter = NumberFormat.getCurrencyInstance(localeForCurrency(plan.currencyCode))
        formatter.maximumFractionDigits = 0
        return runCatching { formatter.format(plan.price) }
            .getOrDefault("${plan.currency}${plan.price.toInt()}")
    }

    private fun localeForCurrency(currencyCode: String?): Locale {
        return when (currencyCode?.uppercase()) {
            "CLP" -> Locale("es", "CL")
            "EUR" -> Locale("es", "ES")
            "USD" -> Locale.US
            else -> Locale.getDefault()
        }
    }
}
