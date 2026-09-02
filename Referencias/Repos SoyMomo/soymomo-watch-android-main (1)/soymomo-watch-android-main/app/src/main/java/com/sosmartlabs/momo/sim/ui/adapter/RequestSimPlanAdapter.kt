package com.sosmartlabs.momo.sim.ui.adapter

import android.text.Spanned
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.text.HtmlCompat
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import android.graphics.Paint
import androidx.core.content.ContextCompat
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.ItemRequestSimPlanBinding
import com.sosmartlabs.momo.sim.model.SubscriptionPlan
import java.text.NumberFormat
import java.util.Currency
import kotlin.math.max
import kotlin.math.min
import androidx.core.graphics.toColorInt

class RequestSimPlanAdapter(
    private val discountPercentageProvider: () -> Float
) : ListAdapter<SubscriptionPlan, RequestSimPlanAdapter.ViewHolder>(object : androidx.recyclerview.widget.DiffUtil.ItemCallback<SubscriptionPlan>() {
    override fun areItemsTheSame(oldItem: SubscriptionPlan, newItem: SubscriptionPlan) = oldItem.title == newItem.title
    override fun areContentsTheSame(oldItem: SubscriptionPlan, newItem: SubscriptionPlan): Boolean {
        return oldItem.title == newItem.title &&
                oldItem.price == newItem.price &&
                oldItem.currencyCode == newItem.currencyCode &&
                oldItem.currency == newItem.currency &&
                oldItem.backgroundImageColors == newItem.backgroundImageColors &&
                oldItem.data == newItem.data &&
                oldItem.calls == newItem.calls &&
                oldItem.warranty == newItem.warranty
    }
}) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder =
        ViewHolder(
            ItemRequestSimPlanBinding.inflate(LayoutInflater.from(parent.context), parent, false),
            discountPercentageProvider
        )

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    class ViewHolder(
        private val binding: ItemRequestSimPlanBinding,
        private val discountPercentageProvider: () -> Float
    ) : RecyclerView.ViewHolder(binding.root) {

        fun bind(plan: SubscriptionPlan) {
            val context = binding.root.context

            binding.planTitle.text = plan.title

            // Accent color taken from last gradient color, mirroring iOS getPlanColors().last
            val accentColor = try {
                val planColors = plan.backgroundImageColors
                if (planColors.isEmpty()) {
                    "#6F3FF5".toColorInt() // fallback purple
                } else {
                    val parts = planColors.split(",")
                    val last = parts.last().trim()
                    last.toColorInt()
                }
            } catch (_: Exception) {
                "#6F3FF5".toColorInt()
            }
            binding.planTitle.setTextColor(accentColor)

            val discountRate = (max(0f, min(discountPercentageProvider(), 100f)) / 100f)
            val originalPrice = plan.price
            val discountedPrice = originalPrice * (1f - discountRate)

            binding.planPrice.text = formatPrice(discountedPrice, plan.currencyCode, plan.currency)
            // Prices stay in the standard SIM purple; only the title uses the plan accent color.
            val defaultPriceColor = ContextCompat.getColor(context, R.color.background_sim_step_card_title)
            binding.planPrice.setTextColor(defaultPriceColor)

            binding.planStrikedPrice.visibility = if (discountRate > 0f) View.VISIBLE else View.GONE
            binding.planStrikedPrice.text = formatPrice(originalPrice, plan.currencyCode, plan.currency)
            binding.planStrikedPrice.setTextColor(defaultPriceColor)
            if (discountRate > 0f) {
                binding.planStrikedPrice.paintFlags =
                    binding.planStrikedPrice.paintFlags or Paint.STRIKE_THRU_TEXT_FLAG
            } else {
                // Clear any previous flags when reused.
                binding.planStrikedPrice.paintFlags =
                    binding.planStrikedPrice.paintFlags and Paint.STRIKE_THRU_TEXT_FLAG.inv()
            }

            binding.planDescription.text = buildDescription(
                data = plan.data,
                voice = plan.calls,
                warranty = plan.warranty,
                context = context
            )

            // Card background & stroke are defined in layout; no gradient here.
        }

        private fun buildDescription(data: String, voice: String, warranty: String, context: android.content.Context): Spanned {
            val line1 = "<b>• " + context.getString(R.string.subscription_list_subscription_label_data, data) + "</b>"
            val line2 = "<b>• " + context.getString(R.string.subscription_list_subscription_label_voice, voice) + "</b>"
            val line3 = "<b>• " + context.getString(R.string.subscription_list_subscription_label_warranty, warranty) + "</b>"
            return HtmlCompat.fromHtml("$line1<br/>$line2<br/>$line3", HtmlCompat.FROM_HTML_MODE_LEGACY)
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

