package com.sosmartlabs.momo.addfirstwatch.ui.adapter

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.sosmartlabs.momo.addfirstwatch.model.remote.MobileNetworkOperator
import com.sosmartlabs.momo.databinding.AddWatchChooseMobileNetworkOperatorItemBinding

class ChooseMobileNetworkOperatorAdapter: ListAdapter<MobileNetworkOperator, ChooseMobileNetworkOperatorAdapter.ChooseMobileNetworkOperatorViewHolder>(
    ChooseMobileNetworkOperatorDiffCallback()
) {

    interface Listener {
        fun onChooseMobileNetworkOperatorClicked(index: Int, mobileNetworkOperator: MobileNetworkOperator)
    }

    lateinit var listener: Listener

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ChooseMobileNetworkOperatorViewHolder {
        return ChooseMobileNetworkOperatorViewHolder(
            AddWatchChooseMobileNetworkOperatorItemBinding.inflate(
                LayoutInflater.from(parent.context), parent, false), listener)
    }

    override fun onBindViewHolder(holder: ChooseMobileNetworkOperatorViewHolder, position: Int) {
        val mobileNetworkOperator = getItem(position)
        holder.bind(position, mobileNetworkOperator)
    }

    class ChooseMobileNetworkOperatorViewHolder(val binding: AddWatchChooseMobileNetworkOperatorItemBinding, private val listener: Listener) : RecyclerView.ViewHolder(binding.root) {

        private val mobileNetworkOperatorCard get() = binding.mobileNetworkOperatorCard
        private val mobileNetworkOperatorLogo get() = binding.mobileNetworkOperatorLogo

        fun bind(index: Int, mobileNetworkOperator: MobileNetworkOperator) {
            setOnClickListener(index, mobileNetworkOperator)
            setData(mobileNetworkOperator)
        }

        private fun setOnClickListener(index: Int, mobileNetworkOperator: MobileNetworkOperator) {
            mobileNetworkOperatorCard.setOnClickListener {
                listener.onChooseMobileNetworkOperatorClicked(index, mobileNetworkOperator)
            }
        }

        private fun setData(mobileNetworkOperator: MobileNetworkOperator) {
            with(mobileNetworkOperator) {
                Glide.with(mobileNetworkOperatorLogo.context)
                    .load(logo.url)
                    .fitCenter()
                    .into(mobileNetworkOperatorLogo)
            }
        }
    }
}