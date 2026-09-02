package com.sosmartlabs.momotabletpadres.tabletsettings.times.schoolmode.ui.applist.adapter

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.sosmartlabs.momotabletpadres.databinding.ItemAppDismissibleBinding
import com.sosmartlabs.momotabletpadres.glide.loadAppIcon
import com.sosmartlabs.momotabletpadres.tabletsettings.times.schoolmode.model.SelectableApp
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import timber.log.Timber

class DismissibleAppAdapter :
    ListAdapter<SelectableApp, DismissibleAppAdapter.DismissibleAppAdapterViewHolder>(
        SelectableAppAdapter.SelectableAppItemCallback()
    ) {

    interface Listener {
        fun onItemSelected(item: SelectableApp)
    }

    lateinit var listener: Listener

    private lateinit var binding: ItemAppDismissibleBinding

    override fun onCreateViewHolder(
        parent: ViewGroup,
        viewType: Int
    ): DismissibleAppAdapterViewHolder {
        Timber.d("DismissibleAppAdapter: onCreateViewHolder - Inflating ItemAppDismissibleBinding for viewType=$viewType")
        binding = ItemAppDismissibleBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        Timber.d("DismissibleAppAdapter: onCreateViewHolder - Successfully inflated binding")
        return DismissibleAppAdapterViewHolder(binding)
    }

    override fun onBindViewHolder(holder: DismissibleAppAdapterViewHolder, position: Int) {
        Timber.d("DismissibleAppAdapter: onBindViewHolder - Binding item at position $position")
        val selectableApp = getItem(position)
        if (selectableApp == null) {
            Timber.e("DismissibleAppAdapter: onBindViewHolder - selectableApp is null at position $position")
            CrashlyticsLog.log("DismissibleAppAdapter: onBindViewHolder - selectableApp is null at position $position")
            return
        }

        with(holder.binding) {
            tvItemAppDismissableName.text = selectableApp.appName
            ivItemAppDismissableIcon.loadAppIcon(selectableApp.iconUrl, selectableApp.appName)
            Timber.d("DismissibleAppAdapter: onBindViewHolder - Bound app '${selectableApp.appName}' at position $position")
        }
    }

    class DismissibleAppAdapterViewHolder(val binding: ItemAppDismissibleBinding) :
        RecyclerView.ViewHolder(binding.root)
}