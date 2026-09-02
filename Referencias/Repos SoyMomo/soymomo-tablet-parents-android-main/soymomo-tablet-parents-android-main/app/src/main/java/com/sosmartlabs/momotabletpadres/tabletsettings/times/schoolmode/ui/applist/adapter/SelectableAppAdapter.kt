package com.sosmartlabs.momotabletpadres.tabletsettings.times.schoolmode.ui.applist.adapter

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.sosmartlabs.momotabletpadres.databinding.ItemAppSelectableBinding
import com.sosmartlabs.momotabletpadres.glide.loadAppIcon
import com.sosmartlabs.momotabletpadres.tabletsettings.times.schoolmode.model.SelectableApp
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import timber.log.Timber

class SelectableAppAdapter :
    ListAdapter<SelectableApp, SelectableAppAdapter.SelectableAppAdapterViewHolder>(
        SelectableAppItemCallback()
    ) {

    interface Listener {
        fun onItemSelected(item: SelectableApp)
    }

    lateinit var listener: Listener

    override fun onCreateViewHolder(
        parent: ViewGroup, viewType: Int
    ): SelectableAppAdapterViewHolder {
        Timber.d("SelectableAppAdapter: onCreateViewHolder - Inflating view for selectable app item")
        val binding = ItemAppSelectableBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return SelectableAppAdapterViewHolder(binding)
    }

    override fun onBindViewHolder(holder: SelectableAppAdapterViewHolder, position: Int) {
        val item = getItem(position)
        Timber.d("SelectableAppAdapter: onBindViewHolder - Binding item at position $position: ${item.appName} (${item.packageName}), selected=${item.selected}")

        with(holder.binding) {
            appTitle.text = item.appName

            // Nulify the listener first, to prevent unwanted triggers
            statusSwitch.setOnCheckedChangeListener(null)
            // Set the state from the model
            statusSwitch.isChecked = item.selected

            appCard.setOnClickListener {
                val newState = !statusSwitch.isChecked
                statusSwitch.isChecked = newState
                item.selected = newState
                Timber.i("SelectableAppAdapter: onBindViewHolder - App '${item.appName}' (${item.packageName}) selection toggled to $newState by card click at position $position")
                try {
                    listener.onItemSelected(item)
                } catch (e: Exception) {
                    Timber.e(e, "SelectableAppAdapter: onBindViewHolder - Error in listener.onItemSelected for app '${item.appName}' (${item.packageName})")
                    CrashlyticsLog.recordNonFatalError(e, "SelectableAppAdapter: Error in listener.onItemSelected for app '${item.appName}' (${item.packageName})")
                }
            }

            // Re-set the listener
            statusSwitch.setOnCheckedChangeListener { _, isChecked ->
                if (item.selected != isChecked) {
                    item.selected = isChecked
                    Timber.i("SelectableAppAdapter: onBindViewHolder - App '${item.appName}' (${item.packageName}) switch changed to $isChecked at position $position")
                    try {
                        listener.onItemSelected(item)
                    } catch (e: Exception) {
                        Timber.e(e, "SelectableAppAdapter: onBindViewHolder - Error in listener.onItemSelected for app '${item.appName}' (${item.packageName}) on switch change")
                        CrashlyticsLog.recordNonFatalError(e, "SelectableAppAdapter: Error in listener.onItemSelected for app '${item.appName}' (${item.packageName}) on switch change")
                    }
                }
            }

            Timber.v("SelectableAppAdapter: onBindViewHolder - Loading icon for app '${item.appName}' (${item.packageName}) from url: ${item.icon}")
            appIcon.loadAppIcon(item.iconUrl, item.appName)
        }
    }

    class SelectableAppAdapterViewHolder(val binding: ItemAppSelectableBinding) :
        RecyclerView.ViewHolder(binding.root)

    class SelectableAppItemCallback : DiffUtil.ItemCallback<SelectableApp>() {
        override fun areItemsTheSame(
            oldItem: SelectableApp,
            newItem: SelectableApp
        ): Boolean {
            val same = oldItem.packageName == newItem.packageName
            Timber.v("SelectableAppAdapter: areItemsTheSame - Comparing '${oldItem.packageName}' and '${newItem.packageName}': $same")
            return same
        }

        override fun areContentsTheSame(
            oldItem: SelectableApp,
            newItem: SelectableApp
        ): Boolean {
            val same = oldItem.packageName == newItem.packageName
                    && oldItem.selected == newItem.selected
                    && oldItem.appName == newItem.appName
            Timber.v(
                "SelectableAppAdapter: areContentsTheSame - Comparing contents for '${oldItem.packageName}': selected(${oldItem.selected} vs ${newItem.selected}), appName(${oldItem.appName} vs ${newItem.appName}) => $same"
            )
            return same
        }
    }
}