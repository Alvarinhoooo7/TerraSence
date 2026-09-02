package com.sosmartlabs.momotabletpadres.sim.ui.adapter

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.databinding.ItemSubscriptionApioCardSmallBinding
import com.sosmartlabs.momotabletpadres.sim.model.PaymentUserCard

class ApioCardsAdapter: ListAdapter<PaymentUserCard, ApioCardsAdapter.ApioCardsViewHolder>(
    ApioCardsDiffCallback()
) {

    interface Listener {
        fun onApioCardClicked(apioCard: PaymentUserCard)
    }

    lateinit var listener: Listener

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ApioCardsViewHolder {
        return ApioCardsViewHolder(
            ItemSubscriptionApioCardSmallBinding.inflate(
                LayoutInflater.from(parent.context), parent, false), listener)
    }

    override fun onBindViewHolder(holder: ApioCardsViewHolder, position: Int) {
        val subscription = getItem(position)
        holder.bind(subscription)
    }

    class ApioCardsViewHolder(private val binding: ItemSubscriptionApioCardSmallBinding, private val listener: Listener) : RecyclerView.ViewHolder(binding.root) {

        private val apioCardTopLayout get() = binding.apioCardSmall
        private val apioCardView get() = binding.apioCardSmallCardView
        private val apioCardDigits get() = binding.apioCardSmallDigits
        private val apioCardUsername get() = binding.apioCardSmallUsername
        private val apioCardLogo get() = binding.apioCardSmallCardLogo

        fun bind(subscription: PaymentUserCard) {
            setOnClickListener(subscription)
            setData(subscription)
        }

        private fun setOnClickListener(apioCard: PaymentUserCard) {
            apioCardTopLayout.setOnClickListener {
                listener.onApioCardClicked(apioCard)
            }
        }

        private fun setData(apioCard: PaymentUserCard) {
            with(apioCard) {
                apioCardDigits.text = digits
                apioCardUsername.text = username
                when(brand.lowercase()) {
                    "amex" -> {
                        val color = ContextCompat.getColor(apioCardLogo.context, R.color.bank_card_bg_amex)
                        apioCardView.setCardBackgroundColor(color)
                        Glide.with(apioCardLogo.context)
                            .load(R.drawable.bank_card_amex)
                            .fitCenter()
                            .into(apioCardLogo)
                    }
                    "visa" -> {
                        val color = ContextCompat.getColor(apioCardLogo.context, R.color.bank_card_bg_visa)
                        apioCardView.setCardBackgroundColor(color)
                        Glide.with(apioCardLogo.context)
                            .load(R.drawable.bank_card_visa)
                            .fitCenter()
                            .into(apioCardLogo)
                    }
                    "mastercard" -> {
                        val color = ContextCompat.getColor(apioCardLogo.context, R.color.bank_card_bg_mastercard)
                        apioCardView.setCardBackgroundColor(color)
                        Glide.with(apioCardLogo.context)
                            .load(R.drawable.bank_card_mastercard)
                            .fitCenter()
                            .into(apioCardLogo)
                    }
                    "redcompra", "prepaid" -> {
                        val color = ContextCompat.getColor(apioCardLogo.context, R.color.bank_card_bg_redcompra)
                        apioCardView.setCardBackgroundColor(color)
                        Glide.with(apioCardLogo.context)
                            .load(R.drawable.bank_card_redcompra)
                            .fitCenter()
                            .into(apioCardLogo)
                    }
                    else -> {
                        val color = ContextCompat.getColor(apioCardLogo.context, R.color.bank_card_bg_visa)
                        apioCardView.setCardBackgroundColor(color)
                        Glide.with(apioCardLogo.context)
                            .load(R.drawable.bank_card_visa)
                            .fitCenter()
                            .into(apioCardLogo)
                    }
                }
            }
        }

    }
}