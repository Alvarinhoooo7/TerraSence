package com.sosmartlabs.momo.newowner.ui

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.sosmartlabs.momo.databinding.ItemNewOwnerHeaderBinding

/** Single static explainer card shown above the co-manager list via ConcatAdapter. */
class NewOwnerHeaderAdapter : RecyclerView.Adapter<NewOwnerHeaderAdapter.HeaderViewHolder>() {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): HeaderViewHolder {
        val binding = ItemNewOwnerHeaderBinding.inflate(
            LayoutInflater.from(parent.context), parent, false
        )
        return HeaderViewHolder(binding)
    }

    override fun onBindViewHolder(holder: HeaderViewHolder, position: Int) = Unit

    override fun getItemCount(): Int = 1

    class HeaderViewHolder(binding: ItemNewOwnerHeaderBinding) :
        RecyclerView.ViewHolder(binding.root)
}
