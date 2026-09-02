package com.sosmartlabs.momo.sim.ui.adapter

import android.graphics.drawable.GradientDrawable
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.sosmartlabs.momo.databinding.ItemSimPlanLargeBinding
import com.sosmartlabs.momo.sim.model.SubscriptionPlan
import com.sosmartlabs.momo.utils.ui.DefaultIcons
import com.sosmartlabs.momo.utils.ui.GradientBackground
import com.sosmartlabs.momo.utils.ui.loadImage
import timber.log.Timber
import java.text.NumberFormat
import java.util.Currency
import kotlin.math.max
import kotlin.math.min

class ChoosePlanAdapter(
    private val discountPercentageProvider: () -> Float = { 0f }
): ListAdapter<SubscriptionPlan, ChoosePlanAdapter.ChoosePlanViewHolder>(
    ChoosePlanDiffCallback()
) {

    interface Listener {
        fun onSubscriptionClicked(subscription: SubscriptionPlan)
    }

    lateinit var listener: Listener

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ChoosePlanViewHolder {
        return ChoosePlanViewHolder(
            ItemSimPlanLargeBinding.inflate(
            LayoutInflater.from(parent.context), parent, false), listener, discountPercentageProvider)
    }

    override fun onBindViewHolder(holder: ChoosePlanViewHolder, position: Int) {
        val subscription = getItem(position)
        holder.bind(subscription)
    }

    class ChoosePlanViewHolder(private val binding: ItemSimPlanLargeBinding, private val listener: Listener, private val discountPercentageProvider: () -> Float) : RecyclerView.ViewHolder(binding.root) {

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

                val discountRate = max(0f, min(discountPercentageProvider(), 100f)) / 100f

                if (discountRate > 0f) {
                    // SIM discount active: show original as strikethrough, discounted as main price
                    val discountedPrice = price * (1f - discountRate)
                    Timber.d("SIM discount active: original=$price discounted=$discountedPrice rate=$discountRate")

                    planPrice.text = formatPrice(discountedPrice, currencyCode, currency)
                    planPriceBillingPeriod.text = "/${billingPeriod}"

                    planStrikethroughPrice.visibility = View.VISIBLE
                    planStrikethroughPrice.text = "${currency}${price}/${billingPeriod}"
                } else {
                    // No SIM discount: use plan's own priceStrike if available
                    Timber.d("format price: ${formatPrice(price, currencyCode, currency)}")
                    planPrice.text = formatPrice(price, currencyCode, currency)
                    planPriceBillingPeriod.text = "/${billingPeriod}"
                    planStrikethroughPrice.visibility = if (priceStrike != null) View.VISIBLE else View.GONE
                    planStrikethroughPrice.text = if (priceStrike != null) "${currency}${priceStrike}/${billingPeriod}" else ""
                }
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
            } catch (_: Exception) {
                "$price $currencySymbol"
            }
        }

    }
}