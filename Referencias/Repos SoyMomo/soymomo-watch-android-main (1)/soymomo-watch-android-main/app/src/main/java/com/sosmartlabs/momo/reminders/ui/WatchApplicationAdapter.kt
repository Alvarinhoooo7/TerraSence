package com.sosmartlabs.momo.reminders.ui

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.sosmartlabs.momo.databinding.ItemWatchApplicationBinding
import com.sosmartlabs.momo.reminders.model.WatchApplication

class WatchApplicationAdapter(val callback: (WatchApplication) -> Unit): ListAdapter<WatchApplication, WatchApplicationAdapter.WatchApplicationViewHolder>(WatchApplicationDiffCallback()) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): WatchApplicationViewHolder {
        return WatchApplicationViewHolder(ItemWatchApplicationBinding.inflate(
            LayoutInflater.from(parent.context), parent, false))
    }

    override fun onBindViewHolder(holder: WatchApplicationViewHolder, position: Int) {
        val app = getItem(position)
        holder.bind(app, callback)
    }

    class WatchApplicationViewHolder(private val binding: ItemWatchApplicationBinding) :
        RecyclerView.ViewHolder(binding.root) {

        private val appIcon get() = binding.appIcon
        private val appName get() = binding.appName

        fun bind(app: WatchApplication, callback: (WatchApplication) -> Unit) {
            setOnClickListener(app, callback)
            setData(app)
        }

        private fun setOnClickListener(app: WatchApplication, callback: (WatchApplication) -> Unit) {
            appIcon.setOnClickListener {
                callback(app)
            }

        }

        private fun setData(app: WatchApplication) {
            appName.text = app.name
            Glide.with(appIcon)
                .load(app.icon)
                .into(appIcon)
        }

    }
}