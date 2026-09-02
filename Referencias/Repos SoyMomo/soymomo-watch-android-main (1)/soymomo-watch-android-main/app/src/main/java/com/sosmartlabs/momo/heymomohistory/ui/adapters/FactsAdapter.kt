package com.sosmartlabs.momo.heymomohistory.ui.adapters

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.sosmartlabs.momo.databinding.ItemFactBinding
import com.sosmartlabs.momo.heymomohistory.data.model.Fact

class FactsAdapter(
    private val onEditClick: (Fact) -> Unit,
    private val onDeleteClick: (Fact) -> Unit
) : ListAdapter<Fact, FactsAdapter.FactViewHolder>(FactDiffCallback()) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): FactViewHolder {
        val binding = ItemFactBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return FactViewHolder(binding, onEditClick, onDeleteClick)
    }

    override fun onBindViewHolder(holder: FactViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    class FactViewHolder(
        private val binding: ItemFactBinding,
        private val onEditClick: (Fact) -> Unit,
        private val onDeleteClick: (Fact) -> Unit
    ) : RecyclerView.ViewHolder(binding.root) {

        fun bind(fact: Fact) {
            binding.factType.text = fact.factType.getDisplayName(binding.root.context)
            binding.factValue.text = fact.objectValue

            binding.buttonEdit.setOnClickListener {
                onEditClick(fact)
            }

            binding.buttonDelete.setOnClickListener {
                onDeleteClick(fact)
            }
        }
    }

    private class FactDiffCallback : DiffUtil.ItemCallback<Fact>() {
        override fun areItemsTheSame(oldItem: Fact, newItem: Fact): Boolean {
            return oldItem.id == newItem.id
        }

        override fun areContentsTheSame(oldItem: Fact, newItem: Fact): Boolean {
            return oldItem == newItem
        }
    }
}

