package com.sosmartlabs.momotabletpadres.adapters.new_designs_adapters

import android.content.Context
import android.graphics.drawable.Drawable
import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.utils.DateUtil
import com.sosmartlabs.momotabletpadres.databinding.ItemAppsUseBinding
import com.sosmartlabs.momotabletpadres.models.AppStats

/**
 * @author mrg
 * @date 4/3/18
 */

class AppStatsAdapter(private val mContext: Context) :
    RecyclerView.Adapter<AppStatsAdapter.UsageStatsViewHolder>() {

    private lateinit var binding: ItemAppsUseBinding

    private var mAppStatsList = listOf<AppStats>()

    private var appIcons = mapOf<String, Drawable>()

    // Largest foreground time in the list — used to scale each row's usage bar.
    private var maxUsage: Int = 1

    fun replaceData(appStatsList: List<AppStats>, icons: Map<String, Drawable>) {
        appIcons = icons
        mAppStatsList = appStatsList
        maxUsage = (appStatsList.maxOfOrNull { it.foregroundUsage } ?: 1).coerceAtLeast(1)
        notifyDataSetChanged()
    }

    override fun onBindViewHolder(holder: UsageStatsViewHolder, position: Int) {
        val appStat = mAppStatsList[position]
        val lastYear = DateUtil.getLastYear()

        val icon = appIcons[appStat.packageName]

        Glide.with(mContext)
            .load(icon)
            .error(R.drawable.ic_action_app_hover)
            .circleCrop()
            .into(holder.vAppIcon)

        holder.vAppName.text = appStat.appName

        //String format based on last time used
        if (lastYear < appStat.lastTimeUsed) {
            holder.vLastUsed.text = mContext.getString(R.string.app_usage_placeholder,
                appStat.lastTimeUsed?.let { DateUtil.getFormattedDateTime(it) }
            )
        } else {
            holder.vLastUsed.text = mContext.getString(R.string.app_not_used_recently)
        }

        holder.vInForeground.text =
            DateUtil.getFormattedTime(mContext, appStat.foregroundUsage.toLong())

        holder.vUsageBar.progress =
            ((appStat.foregroundUsage.toLong() * 100) / maxUsage).toInt().coerceIn(0, 100)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): UsageStatsViewHolder {
        binding = ItemAppsUseBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return UsageStatsViewHolder(binding)
    }

    override fun getItemCount(): Int {
        return mAppStatsList.size
    }

    class UsageStatsViewHolder(itemView: ItemAppsUseBinding) :
        RecyclerView.ViewHolder(itemView.root) {
        var vAppIcon = itemView.appIcon
        var vAppName = itemView.appTitle
        var vLastUsed = itemView.lastTime
        var vInForeground = itemView.timeUsed
        var vUsageBar = itemView.usageBar
    }
}