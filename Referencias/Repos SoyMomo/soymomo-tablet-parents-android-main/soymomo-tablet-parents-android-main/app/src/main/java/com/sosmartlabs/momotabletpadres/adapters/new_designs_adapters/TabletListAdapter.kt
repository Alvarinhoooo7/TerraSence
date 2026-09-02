package com.sosmartlabs.momotabletpadres.adapters.new_designs_adapters

import android.content.Context
import android.graphics.Color
import android.graphics.Paint
import android.graphics.PorterDuff
import android.graphics.PorterDuffXfermode
import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.androidplot.pie.PieRenderer
import com.androidplot.pie.Segment
import com.androidplot.pie.SegmentFormatter
import com.bumptech.glide.Glide
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.tablet.model.TabletModel
import com.sosmartlabs.momotabletpadres.databinding.ItemTabletNewBinding
import com.sosmartlabs.momotabletpadres.glide.loadEncryptedProfilePicture
import timber.log.Timber
import androidx.core.content.edit

class TabletListAdapter(
    private val mContext: Context
) : ListAdapter<Tablet, TabletListAdapter.TabletViewHolder>(TabletListDiffCallback()) {

    interface AdapterListener {
        fun onClickTablet(tablet: Tablet)
        fun onClickProfilePicture(tablet: Tablet)
    }

    lateinit var listener: AdapterListener

    override fun submitList(list: List<Tablet>?) {
        Timber.d("TabletListAdapter: Submitting new list with ${list?.size ?: 0} items")
        // Create a copy of the list to avoid mutation issues
        super.submitList(list?.let { ArrayList(it) })
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): TabletViewHolder {
        val binding = ItemTabletNewBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return TabletViewHolder(binding)
    }

    override fun onBindViewHolder(tabletViewHolder: TabletViewHolder, position: Int) {
        val tablet = getItem(position)
        Timber.d("TabletListAdapter: Binding tablet at position $position with objectId: ${tablet.objectId}, hid: ${tablet.hid}")

        val tabletProfileName: String = tablet.profileName ?: mContext.getString(R.string.empty_profile_name)

        if (tabletProfileName.isNotEmpty()) {
            tabletViewHolder.vTabletName.text = tabletProfileName
        } else {
            tabletViewHolder.vTabletName.text = mContext.getString(R.string.empty_profile_name)
        }

        tabletViewHolder.model.text = when (tablet.model) {
            TabletModel.LITE -> {
                mContext.getText(R.string.lite_model_name)
            }
            TabletModel.LITE_2 -> {
                mContext.getText(R.string.lite_2_model_name)
            }
            TabletModel.LITE_3 -> {
                mContext.getText(R.string.lite_3_model_name)
            }
            TabletModel.PRO, TabletModel.PRO_EU -> {
                mContext.getText(R.string.pro_model_name)
            }
            TabletModel.PRO_2 -> {
                mContext.getText(R.string.pro_2_model_name)
            }
            TabletModel.UNO -> {
                mContext.getText(R.string.uno_model_name)
            }
            TabletModel.PHONE_1 -> {
                mContext.getText(R.string.momophone_1_model_name)
            }
            else -> {
                mContext.getText(R.string.unknown_model_name)
            }
        }

        // ALWAYS set the profile image to avoid recycled views showing incorrect images
        loadProfilePicture(tablet, tabletViewHolder)

        when (tablet.model) {
            TabletModel.PHONE_1 -> tabletViewHolder.vTabletImage.setImageResource(R.drawable.momophone_v1_black)
            TabletModel.LITE -> tabletViewHolder.vTabletImage.setImageResource(R.drawable.lite_v1_pink)
            TabletModel.LITE_2 -> tabletViewHolder.vTabletImage.setImageResource(R.drawable.lite_v1_pink)
            TabletModel.LITE_3 -> tabletViewHolder.vTabletImage.setImageResource(R.drawable.lite_v3_pink)
            TabletModel.PRO -> tabletViewHolder.vTabletImage.setImageResource(R.drawable.pro_v1_pink)
            TabletModel.PRO_EU -> tabletViewHolder.vTabletImage.setImageResource(R.drawable.pro_v1_pink)
            TabletModel.PRO_2 -> tabletViewHolder.vTabletImage.setImageResource(R.drawable.pro_v2_pink)
            TabletModel.UNO -> tabletViewHolder.vTabletImage.setImageResource(R.drawable.pro_v1_black)
            TabletModel.UNKNOWN_HARDWARE -> tabletViewHolder.vTabletImage.setImageResource(R.drawable.pro_v1_black)
            null -> tabletViewHolder.vTabletImage.setImageResource(R.drawable.pro_v1_black)
            else -> tabletViewHolder.vTabletImage.setImageResource(R.drawable.pro_v1_black)
        }

        tabletViewHolder.vProfileImage.setOnClickListener {
            listener.onClickProfilePicture(tablet)
            mContext.getSharedPreferences("MomoTabletPreferences", 0).edit {
                putString("current_tablet", tablet.hid)
            }
        }

        tabletViewHolder.container.setOnClickListener {
            listener.onClickTablet(tablet)
            mContext.getSharedPreferences("MomoTabletPreferences", 0).edit {
                putString("current_tablet", tablet.hid)
            }
        }

        // Graph
        if (tablet.batteryPercentage != null) {
            generateDonutChart(tabletViewHolder, tablet.batteryPercentage!!, R.color.normal_battery_color)

            // Battery Text
            listOf(tabletViewHolder.vNormalBattery, tabletViewHolder.vAlertBattery).forEach {
                it.text = mContext.getString(R.string.item_device_battery, tablet.batteryPercentage)
            }
        }

        tabletViewHolder.container.strokeColor = ContextCompat.getColor(mContext, R.color.white)
        tabletViewHolder.container.strokeWidth = 0
    }

    private fun generateDonutChart(holder: TabletViewHolder, batteryPercentage : Int, colorId : Int) {

        fun generatePaint(color : Int): Paint {
            val paint = Paint(Paint.ANTI_ALIAS_FLAG)
            paint.color = color
            paint.xfermode = PorterDuffXfermode(PorterDuff.Mode.SRC_OVER)
            paint.isAntiAlias = true
            return paint
        }

        fun setStrokeColors(segment : SegmentFormatter, strokePaint : Paint, radialPaint : Paint) {
            segment.innerEdgePaint = strokePaint
            segment.outerEdgePaint = strokePaint
            segment.radialEdgePaint = radialPaint
        }

        holder.batteryChart.clear()
        val batteryLeft = Segment("", (batteryPercentage / 100f))
        val emptySpace = Segment("", 1 - (batteryPercentage / 100f))
        val batteryColor = SegmentFormatter(ContextCompat.getColor(mContext, colorId))
        val emptyColor = SegmentFormatter(Color.WHITE)

        val strokePaint = generatePaint(Color.TRANSPARENT)
        val radialEdgePain = generatePaint(R.color.white)

        setStrokeColors(batteryColor, strokePaint, radialEdgePain)
        setStrokeColors(emptyColor, strokePaint, radialEdgePain)

        holder.batteryChart.addSegment(batteryLeft, batteryColor)
        holder.batteryChart.addSegment(emptySpace, emptyColor)
        holder.batteryChart.getRenderer(PieRenderer::class.java).setDonutSize(0.7f, PieRenderer.DonutMode.PERCENT)
        holder.batteryChart.rotation = -90f
        holder.batteryChart.redraw()
    }

    private fun loadProfilePicture(tablet: Tablet, holder: TabletViewHolder) {
        Timber.d("TabletListAdapter: Loading profile picture for tablet ${tablet.objectId}, encrypted=${tablet.hasEncryptedProfilePicture()}")
        
        // Use Glide extension to load encrypted or unencrypted profile picture
        Glide.with(mContext)
            .loadEncryptedProfilePicture(tablet)
            .centerCrop()
            .placeholder(R.drawable.default_profile_pic)
            .error(R.drawable.default_profile_pic)
            .into(holder.vProfileImage)
    }

    class TabletViewHolder(itemView: ItemTabletNewBinding) : RecyclerView.ViewHolder(itemView.root) {
        var container = itemView.tabletCard
        var vTabletName = itemView.tabletName
        var vProfileImage = itemView.tabletProfileIcon
        var vTabletImage = itemView.tabletWithColorIcon
        var model = itemView.tabletDescription
        var vNormalBattery = itemView.watchNormalBattery
        var vAlertBattery = itemView.batteryAlertMessageText
        var batteryChart = itemView.batteryChart
    }
}
