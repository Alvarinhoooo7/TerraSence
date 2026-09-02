package com.sosmartlabs.momo.linkwatch.ui.adapters

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.addfirstwatch.model.remote.MobileNetworkOperator
import com.sosmartlabs.momo.databinding.FragmentOtherCompaniesCardBinding

class MobileOperatorsAdapter(
    private val navigationCallback: (MobileNetworkOperator) -> Unit
) : ListAdapter<MobileNetworkOperator, MobileOperatorsAdapter.OperatorViewHolder>(DIFF) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): OperatorViewHolder {
        val binding = FragmentOtherCompaniesCardBinding.inflate(
            LayoutInflater.from(parent.context), parent, false
        )
        return OperatorViewHolder(binding)
    }

    override fun onBindViewHolder(holder: OperatorViewHolder, position: Int) {
        val operator = getItem(position)
        holder.card.setOnClickListener { navigationCallback(operator) }

        Glide.with(holder.image)
            .load(operator.logo.url)
            .placeholder(R.drawable.momo_help)
            .into(holder.image)
    }

    class OperatorViewHolder(binding: FragmentOtherCompaniesCardBinding) :
        RecyclerView.ViewHolder(binding.root) {
        val card = binding.card
        val image = binding.logo
    }

    private companion object {
        val DIFF = object : DiffUtil.ItemCallback<MobileNetworkOperator>() {
            override fun areItemsTheSame(old: MobileNetworkOperator, new: MobileNetworkOperator) =
                old.objectId == new.objectId

            override fun areContentsTheSame(old: MobileNetworkOperator, new: MobileNetworkOperator) =
                old.objectId == new.objectId
        }
    }
}
