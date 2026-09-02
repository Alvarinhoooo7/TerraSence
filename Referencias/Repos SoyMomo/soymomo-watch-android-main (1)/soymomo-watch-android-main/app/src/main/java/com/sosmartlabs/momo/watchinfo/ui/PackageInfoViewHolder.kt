package com.sosmartlabs.momo.watchinfo.ui

import android.view.View
import androidx.recyclerview.widget.RecyclerView
import com.sosmartlabs.momo.databinding.ItemWatchInfoAppBinding
import com.sosmartlabs.momo.watchinfo.model.PackageInfo

/**
 * ViewHolder for Package info
 * @param binding VewBinding for showing a PackageInfo
 */
class PackageInfoViewHolder(private val binding: ItemWatchInfoAppBinding):
    RecyclerView.ViewHolder(binding.root) {

        /**
         * Binds the PackageInfo to this view
         * @param packageInfo The package info to display
         * @param showLastUpdated Whether to show the last updated timestamp
         */
        fun bind(packageInfo: PackageInfo, showLastUpdated: Boolean) {
            binding.packageInfo = packageInfo
            binding.appLastUpdated.visibility = if (showLastUpdated) View.VISIBLE else View.GONE
        }
}