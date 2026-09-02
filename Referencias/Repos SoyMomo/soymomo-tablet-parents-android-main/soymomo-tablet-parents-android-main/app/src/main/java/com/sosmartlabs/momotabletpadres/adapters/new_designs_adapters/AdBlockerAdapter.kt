package com.sosmartlabs.momotabletpadres.adapters.new_designs_adapters

import android.content.Context
import android.graphics.drawable.Drawable
import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.sosmartlabs.momotabletpadres.databinding.ItemAdsAppBinding
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.models.entity.AdsBlockedByPackageNameEntity
import timber.log.Timber
import kotlin.system.measureTimeMillis

/**
 * Adapter for adblocker entries!
 */
class AdBlockerAdapter(private val mContext: Context): RecyclerView.Adapter<AdBlockerAdapter.AppProtectionViewHolder>(){

    private lateinit var binding: ItemAdsAppBinding

    private var currentAdblockerApp = arrayListOf<AdsBlockedByPackageNameEntity>()

    private var icons = mapOf<String, Drawable>()

    fun setData(summary: List<AdsBlockedByPackageNameEntity>, icons: Map<String, Drawable>){
        Timber.d("setData: ")
        this.icons = icons
        val tmpTime = measureTimeMillis {
            currentAdblockerApp.clear()
            currentAdblockerApp.addAll(summary)
            notifyDataSetChanged()
        }
        Timber.d("setData: process time: $tmpTime ms")
        Timber.i("setData: currentAdblockerApp size: ${currentAdblockerApp.size}")
    }


    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): AppProtectionViewHolder {
        binding = ItemAdsAppBinding.inflate(LayoutInflater.from(parent.context),parent,false)
        return AppProtectionViewHolder(binding)
    }

    override fun getItemCount(): Int {
        return currentAdblockerApp.size
    }

    fun getAlertCount(): Int {
        var alertCount = 0
        currentAdblockerApp.forEach {
            alertCount += it.blockCounter
        }
        return alertCount
    }

    override fun onBindViewHolder(holder: AppProtectionViewHolder, position: Int) {
        val app = currentAdblockerApp[position]

        val iconDrawable = icons[app.packageName]


        Glide.with(mContext)
            .load(iconDrawable)
            .error(R.drawable.ic_action_app_hover)
            .circleCrop()
            .into(holder.vIcon)

        // Name
        holder.vName.text = app.appName

        //holder.vDate.text =  mContext.getString(R.string.adblocker_date, DateUtil.getFormattedDateTime(app.date))
        holder.vCounter.text = app.blockCounter.toString()

        holder.vDescription.text = if (app.category == "Undefined") "Ads/Trackers" else app.category
    }

    class AppProtectionViewHolder(itemView: ItemAdsAppBinding): RecyclerView.ViewHolder(itemView.root) {
        //var vName = itemView.tvAppBlockedItemName
        //var vIcon = itemView.ivAppBlockedItemIcon
        //var vDate = itemView.tvAppBlockedItemDate
        //var vCounter = itemView.tvAppBlockedItemNameBlockCounter
        var vName = itemView.appTitle
        var vIcon = itemView.appIcon
        var vCounter = itemView.appAdsAlerts
        var vDescription = itemView.appAdsDescription
    }
}