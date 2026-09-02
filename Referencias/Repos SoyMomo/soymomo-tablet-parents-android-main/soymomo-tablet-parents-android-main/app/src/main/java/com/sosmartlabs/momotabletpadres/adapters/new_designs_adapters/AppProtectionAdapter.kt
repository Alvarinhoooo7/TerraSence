package com.sosmartlabs.momotabletpadres.adapters.new_designs_adapters

import android.content.Context
import android.view.LayoutInflater
import android.view.ViewGroup
import android.widget.Filter
import android.widget.Filterable
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.databinding.ItemAppsBinding
import com.sosmartlabs.momotabletpadres.glide.loadAppIcon
import com.sosmartlabs.momotabletpadres.tabletsettings.appprotection.model.installedapp.InstalledAppEntity
import timber.log.Timber
import java.util.Locale
import java.util.concurrent.TimeUnit

/**
 * Protection Adapter for active or disable apps!
 *
 * Backed by [ListAdapter]/[DiffUtil]: [setData]/[allowedApps]/[blockedApps]/search all derive a list
 * from [currentApps] and submit it, so the RecyclerView animates the minimal set of changes instead
 * of rebinding everything via notifyDataSetChanged.
 */
class AppProtectionAdapter(private val mContext: Context) :
    ListAdapter<InstalledAppEntity, AppProtectionAdapter.AppProtectionViewHolder>(DIFF_CALLBACK),
    Filterable {

    companion object {
        private val SECONDS_IN_HOUR = TimeUnit.HOURS.toSeconds(1)

        private val DIFF_CALLBACK = object : DiffUtil.ItemCallback<InstalledAppEntity>() {
            override fun areItemsTheSame(oldItem: InstalledAppEntity, newItem: InstalledAppEntity) =
                oldItem.packageName == newItem.packageName

            // Compare exactly the fields the row renders (icon, name, allowed/usage label).
            override fun areContentsTheSame(oldItem: InstalledAppEntity, newItem: InstalledAppEntity) =
                oldItem.appName == newItem.appName &&
                    oldItem.iconImageUrl == newItem.iconImageUrl &&
                    oldItem.allowed == newItem.allowed &&
                    oldItem.usageTime == newItem.usageTime
        }
    }

    /** Full, unfiltered set; the displayed list is derived from it via [mode]/search and submitted. */
    private var currentApps: List<InstalledAppEntity> = emptyList()

    private enum class Mode { ALL, ALLOWED, BLOCKED }
    private var mode = Mode.ALL

    /**
     * Listener for detecting permission changes
     */
    interface Listener {
        fun onItemClicked(installedAppEntity: InstalledAppEntity)
    }

    lateinit var listener: Listener

    fun setData(newInstalledApps: List<InstalledAppEntity>) {
        Timber.d("setData: ")
        currentApps = newInstalledApps.toList()
        submitFiltered()
    }

    fun allowedApps() {
        mode = Mode.ALLOWED
        submitFiltered()
    }

    fun blockedApps() {
        mode = Mode.BLOCKED
        submitFiltered()
    }

    private fun submitFiltered() {
        val list = when (mode) {
            Mode.ALL -> currentApps
            Mode.ALLOWED -> currentApps.filter { it.allowed }
            Mode.BLOCKED -> currentApps.filter { !it.allowed }
        }
        submitList(list)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): AppProtectionViewHolder {
        return AppProtectionViewHolder(
            ItemAppsBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        )
    }

    override fun onBindViewHolder(holder: AppProtectionViewHolder, position: Int) {
        val app = getItem(position)

        with(holder) {
            // Gmail-style monogram (deterministic colour + first letter) as placeholder + fallback;
            // the real icon crossfades in over it when available.
            vIcon.loadAppIcon(app.iconImageUrl, app.appName)

            vName.text = app.appName

            with(vCard) {
                setOnClickListener {
                    listener.onItemClicked(app)
                }
                isSoundEffectsEnabled = false
            }

            setUseTime(app, holder)
        }
    }

    private fun setUseTime(app: InstalledAppEntity, holder: AppProtectionViewHolder) {
        if (app.allowed) {
            // usageTime is in seconds, already populated by AppProtectionViewModel.fetchAppStats()
            val usageTime = app.usageTime.toLong()
            holder.vUseTime.setTextColor(ContextCompat.getColor(mContext, R.color.colorPrimary))
            if (usageTime <= SECONDS_IN_HOUR) {
                holder.vUseTime.text = getFormattedTimeOnMinutes(R.string.settings_app_use_min, usageTime)
            } else {
                holder.vUseTime.text = getFormattedTime(R.string.settings_app_use_hour, usageTime)
            }
        } else {
            holder.vUseTime.setTextColor(ContextCompat.getColor(mContext, R.color.colorChipVerySerious))
            holder.vUseTime.text = mContext.getString(R.string.settings_app_blocked)
        }
    }

    private fun getFormattedTime(stringRes: Int, duration: Long): String {
        val hours = TimeUnit.SECONDS.toHours(duration)
        val minutes = TimeUnit.SECONDS.toMinutes(
            duration - TimeUnit.HOURS.toSeconds(hours)).toInt()
        return mContext.getString(stringRes, hours, minutes)
    }

    private fun getFormattedTimeOnMinutes(stringRes: Int, duration: Long): String {
        val minutes = TimeUnit.SECONDS.toMinutes(duration).toInt()
        return mContext.getString(stringRes, minutes)
    }

    override fun getFilter(): Filter {
        return object : Filter() {
            override fun performFiltering(searchKeyword: CharSequence?): FilterResults {
                Timber.d("performFiltering: $searchKeyword")
                val resultsFiltered = if (searchKeyword.isNullOrEmpty()) {
                    currentApps
                } else {
                    val query = searchKeyword.toString().trim().lowercase(Locale.getDefault())
                    currentApps.filter {
                        it.appName.lowercase(Locale.getDefault()).contains(query)
                    }
                }
                return FilterResults().apply { values = resultsFiltered }
            }

            @Suppress("UNCHECKED_CAST")
            override fun publishResults(searchKeyword: CharSequence?, results: FilterResults?) {
                Timber.d("publishResults: ")
                val values = results?.values as? List<InstalledAppEntity> ?: return
                submitList(values)
            }
        }
    }

    class AppProtectionViewHolder(private val binding: ItemAppsBinding)
        : RecyclerView.ViewHolder(binding.root) {
        val vCard get() = binding.appCard
        val vName get() = binding.appTitle
        val vIcon get() = binding.appIcon
        val vUseTime get() = binding.appDetail
    }
}
