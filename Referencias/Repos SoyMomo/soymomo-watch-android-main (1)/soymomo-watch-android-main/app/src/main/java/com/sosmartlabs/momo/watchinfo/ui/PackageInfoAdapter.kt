package com.sosmartlabs.momo.watchinfo.ui

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import com.sosmartlabs.momo.databinding.ItemWatchInfoAppBinding
import com.sosmartlabs.momo.watchinfo.model.PackageInfo

class PackageInfoAdapter(
    private val showLastUpdated: Boolean = true
): ListAdapter<PackageInfo, PackageInfoViewHolder>(PackageInfoItemCallback()) {
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): PackageInfoViewHolder {
        val inflater = LayoutInflater.from(parent.context)
        return PackageInfoViewHolder(ItemWatchInfoAppBinding.inflate(inflater, parent, false))
    }

    override fun onBindViewHolder(holder: PackageInfoViewHolder, position: Int) {
        holder.bind(getItem(position), showLastUpdated)
    }
}

/**
 * Callbacks for decide if reuse a RecyclerView Item view
 */
internal class PackageInfoItemCallback: DiffUtil.ItemCallback<PackageInfo>() {

    /**
     * Gets if two PackageInfo objects represents information from the same app
     * @param oldItem currently drawn PackageInfo
     * @param newItem new PackageInfo
     * @return Thue if they represents info for the same app, false otherwise
     */
    override fun areItemsTheSame(oldItem: PackageInfo, newItem: PackageInfo): Boolean {
        return oldItem.packageName == newItem.packageName
    }

    /**
     * Gets if two PackageInfo must show the same information in view
     * @param oldItem currently drawn PackageInfo
     * @param newItem new PackageInfo
     * @return True if the PackageInfo objects should be drawn exactly the same way, false otherwise
     */
    override fun areContentsTheSame(oldItem: PackageInfo, newItem: PackageInfo): Boolean {
        return oldItem.versionName == newItem.versionName
                && oldItem.lastUpdateTime == newItem.lastUpdateTime
                && oldItem.imageUrl == newItem.imageUrl
    }

}