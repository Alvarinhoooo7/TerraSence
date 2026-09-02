package com.sosmartlabs.momotabletpadres.sim.ui.adapter

import android.graphics.drawable.GradientDrawable
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.sosmartlabs.momotabletpadres.databinding.ItemSimPlanLargeBinding
import com.sosmartlabs.momotabletpadres.sim.model.SubscriptionPlan
import com.sosmartlabs.momotabletpadres.utils.ui.DefaultIcons
import com.sosmartlabs.momotabletpadres.utils.ui.GradientBackground
import com.sosmartlabs.momotabletpadres.glide.loadImage
import timber.log.Timber
import java.text.NumberFormat
import java.util.Currency

class ChoosePlanAdapter: ListAdapter<SubscriptionPlan, ChoosePlanAdapter.ChoosePlanViewHolder>(
    ChoosePlanDiffCallback()
) {

    interface Listener {
        fun onSubscriptionClicked(subscription: SubscriptionPlan)
    }

    lateinit var listener: Listener

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ChoosePlanViewHolder {
        return ChoosePlanViewHolder(
            ItemSimPlanLargeBinding.inflate(
            LayoutInflater.from(parent.context), parent, false), listener)
    }

    override fun onBindViewHolder(holder: ChoosePlanViewHolder, position: Int) {
        val subscription = getItem(position)
        holder.bind(subscription)
    }

    class ChoosePlanViewHolder(private val binding: ItemSimPlanLargeBinding, private val listener: Listener) : RecyclerView.ViewHolder(binding.root) {

        private val planTitle get() = binding.planTitle
        private val planPrice get() = binding.planPrice
        private val planPriceBillingPeriod get() = binding.planPriceBillingPeriod
        private val planStrikethroughPrice get() = binding.planStrikedPrice
        private val planDescriptionText get() = binding.planDescription
        private val planCard get() = binding.planCard
        private val planLogo get() = binding.planLogo

        fun bind(subscription: SubscriptionPlan) {
            setOnClickListener(subscription)
            setData(subscription)
            setGradient(subscription)
        }

        private fun setOnClickListener(subscriptionPlan: SubscriptionPlan) {
            planTitle.setOnClickListener {
                listener.onSubscriptionClicked(subscriptionPlan)
            }
        }

        private fun setData(subscriptionPlan: SubscriptionPlan) {
            with(subscriptionPlan) {
                logo?.let {
                    planLogo.loadImage(it.url, fallback = DefaultIcons.SIM_SUBSCRIPTION_PLAN)
                } ?: planLogo.setImageResource(DefaultIcons.SIM_SUBSCRIPTION_PLAN)
                planTitle.text = title
                planDescriptionText.text = planDescription
                Timber.d("price: $price, currencyCode: $currencyCode, symbol $currency")
                Timber.d("format price: ${formatPrice(price, currencyCode, currency)}")
                planPrice.text = formatPrice(price, currencyCode, currency)
                planPriceBillingPeriod.text = "/${billingPeriod}"
                planStrikethroughPrice.visibility = if (priceStrike != null) View.VISIBLE else View.GONE
                planStrikethroughPrice.text = if (priceStrike != null) "${currency}${priceStrike}/${billingPeriod}" else ""
            }
        }

        private fun setGradient(subscription: SubscriptionPlan) {
            with(subscription) {
                val gradient = GradientBackground.createGradient(
                    backgroundImageColors,
                    GradientDrawable.Orientation.BOTTOM_TOP
                )
                planCard.background = gradient
            }
        }

        private fun formatPrice(price: Float, currencyCode: String, currencySymbol: String): String {
            return try {
                val currency = Currency.getInstance(currencyCode)
                val numberFormat = NumberFormat.getCurrencyInstance().apply {
                    this.currency = currency
                    maximumFractionDigits = currency.defaultFractionDigits
                }
                numberFormat.format(price)
            } catch (e: Exception) {
                "$price $currencySymbol"
            }
        }

    }
}