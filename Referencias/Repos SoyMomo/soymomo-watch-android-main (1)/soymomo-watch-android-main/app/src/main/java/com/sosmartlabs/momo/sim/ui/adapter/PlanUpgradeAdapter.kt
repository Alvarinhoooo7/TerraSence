package com.sosmartlabs.momo.sim.ui.adapter

import android.graphics.Paint
import android.graphics.drawable.GradientDrawable
import android.text.Spanned
import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.core.text.HtmlCompat
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.ItemPlanUpgradeCardBinding
import com.sosmartlabs.momo.sim.model.SubscriptionPlan
import com.sosmartlabs.momo.utils.ui.DefaultIcons
import com.sosmartlabs.momo.utils.ui.GradientBackground
import com.sosmartlabs.momo.utils.ui.loadImage
import java.text.NumberFormat
import java.util.Currency

class PlanUpgradeAdapter(
    private val listener: Listener
) : ListAdapter<SubscriptionPlan, PlanUpgradeAdapter.PlanUpgradeViewHolder>(DiffCallback()) {

    interface Listener {
        fun onPlanClicked(plan: SubscriptionPlan)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): PlanUpgradeViewHolder {
        val binding = ItemPlanUpgradeCardBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return PlanUpgradeViewHolder(binding, listener)
    }

    override fun onBindViewHolder(holder: PlanUpgradeViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    class PlanUpgradeViewHolder(
        private val binding: ItemPlanUpgradeCardBinding,
        private val listener: Listener
    ) : RecyclerView.ViewHolder(binding.root) {

        fun bind(plan: SubscriptionPlan) {
            binding.planUpgradeCard.setOnClickListener {
                listener.onPlanClicked(plan)
            }

            val gradient = GradientBackground.createGradient(
                plan.backgroundImageColors,
                GradientDrawable.Orientation.RIGHT_LEFT
            )
            binding.planLogoContainer.background = gradient

            val logoUrl = plan.logo?.url
            if (logoUrl != null) {
                binding.planLogo.loadImage(logoUrl, fallback = DefaultIcons.SIM_SUBSCRIPTION_PLAN)
            } else {
                binding.planLogo.setImageResource(DefaultIcons.SIM_SUBSCRIPTION_PLAN)
            }

            binding.planTitle.text = plan.title
            binding.planPrice.text = formatPrice(plan.price, plan.currencyCode, plan.currency)

            val priceStrike = plan.priceStrike?.toDoubleOrNull()
            if (priceStrike != null) {
                binding.planStrikePrice.text = formatPrice(priceStrike, plan.currencyCode, plan.currency)
                binding.planStrikePrice.paintFlags =
                    binding.planStrikePrice.paintFlags or Paint.STRIKE_THRU_TEXT_FLAG
                binding.planStrikePrice.visibility = android.view.View.VISIBLE
            } else {
                binding.planStrikePrice.visibility = android.view.View.GONE
            }

            binding.planData.text = buildBulletText(R.string.subscription_list_subscription_label_data, plan.data)
            binding.planCalls.text = buildBulletText(R.string.subscription_list_subscription_label_voice, plan.calls)
            binding.planWarranty.text = buildBulletText(R.string.subscription_list_subscription_label_warranty, plan.warranty)
        }

        private fun buildBulletText(resId: Int, value: String): Spanned {
            val html = "&#8226; ${itemView.context.getString(resId, value)}"
            return HtmlCompat.fromHtml(html, HtmlCompat.FROM_HTML_MODE_LEGACY)
        }

        private fun formatPrice(price: Number, currencyCode: String, currencySymbol: String): String {
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
    }

    private class DiffCallback : DiffUtil.ItemCallback<SubscriptionPlan>() {
        override fun areItemsTheSame(oldItem: SubscriptionPlan, newItem: SubscriptionPlan): Boolean {
            return oldItem.objectId == newItem.objectId
        }

        override fun areContentsTheSame(oldItem: SubscriptionPlan, newItem: SubscriptionPlan): Boolean {
            return oldItem.objectId == newItem.objectId &&
                oldItem.price == newItem.price &&
                oldItem.priceStrike == newItem.priceStrike &&
                oldItem.title == newItem.title &&
                oldItem.data == newItem.data &&
                oldItem.calls == newItem.calls &&
                oldItem.warranty == newItem.warranty
        }
    }
}
