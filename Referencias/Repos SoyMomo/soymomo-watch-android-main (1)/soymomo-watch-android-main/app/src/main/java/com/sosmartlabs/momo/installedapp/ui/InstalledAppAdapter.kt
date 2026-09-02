package com.sosmartlabs.momo.installedapp.ui

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.core.content.ContextCompat
import androidx.core.view.isVisible
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.InstalledAppItemAppBinding
import com.sosmartlabs.momo.installedapp.model.InstalledAppListItem
import com.sosmartlabs.momo.utils.ui.loadImage

class InstalledAppAdapter(
    private val onInstalledAppSelected: (InstalledAppListItem) -> Unit
) : ListAdapter<InstalledAppListItem, InstalledAppAdapter.InstalledAppViewHolder>(
    InstalledAppDiffCallback()
) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): InstalledAppViewHolder {
        val inflater = LayoutInflater.from(parent.context)
        return InstalledAppViewHolder(
            InstalledAppItemAppBinding.inflate(inflater, parent, false),
            onInstalledAppSelected
        )
    }

    override fun onBindViewHolder(holder: InstalledAppViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    class InstalledAppViewHolder(
        private val binding: InstalledAppItemAppBinding,
        private val onInstalledAppSelected: (InstalledAppListItem) -> Unit
    ) : RecyclerView.ViewHolder(binding.root) {

        fun bind(item: InstalledAppListItem) {
            binding.root.setOnClickListener { onInstalledAppSelected(item) }
            binding.installedAppName.text = item.displayName
            binding.installedAppIcon.loadImage(
                item.iconUrl ?: R.drawable.ic_installed_app,
                R.drawable.ic_installed_app
            )

            val context = binding.root.context
            val isAllowed = item.allowed
            binding.installedAppStatusChip.text = if (isAllowed) {
                context.getString(R.string.installed_app_status_allowed)
            } else {
                context.getString(R.string.installed_app_status_blocked)
            }
            binding.installedAppStatusChip.setChipBackgroundColorResource(
                if (isAllowed) R.color.colorGreen else R.color.colorAccent
            )
            binding.installedAppStatusChip.setTextColor(
                ContextCompat.getColor(context, R.color.white)
            )

            val showDailyLimit = isAllowed && item.hasDailyLimit
            binding.installedAppTimeLimitChip.isVisible = showDailyLimit
            if (showDailyLimit) {
                binding.installedAppTimeLimitChip.text = InstalledAppDurationFormatter.formatChipDuration(
                    context,
                    item.dailyMinutesLimit
                )
            }
        }
    }
}

private class InstalledAppDiffCallback : DiffUtil.ItemCallback<InstalledAppListItem>() {

    override fun areItemsTheSame(oldItem: InstalledAppListItem, newItem: InstalledAppListItem): Boolean {
        return oldItem.packageName == newItem.packageName
    }

    override fun areContentsTheSame(oldItem: InstalledAppListItem, newItem: InstalledAppListItem): Boolean {
        return oldItem.displayName == newItem.displayName &&
            oldItem.iconUrl == newItem.iconUrl &&
            oldItem.allowed == newItem.allowed &&
            oldItem.dailyMinutesLimit == newItem.dailyMinutesLimit
    }
}
