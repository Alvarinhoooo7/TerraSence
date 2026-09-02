package com.sosmartlabs.momotabletpadres.main.ui.adapter

import android.content.Context
import android.graphics.Color
import android.graphics.Paint
import android.graphics.PorterDuff
import android.graphics.PorterDuffXfermode
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.ListAdapter
import com.androidplot.pie.PieRenderer
import com.androidplot.pie.Segment
import com.androidplot.pie.SegmentFormatter
import com.sosmartlabs.momotabletpadres.tablet.model.TabletModel
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.databinding.ItemTabletMenuMainBinding
import com.sosmartlabs.momotabletpadres.main.model.TabletListener
import com.sosmartlabs.momotabletpadres.models.MainCardTabletUser
import com.sosmartlabs.momotabletpadres.utils.*
import com.bumptech.glide.Glide
import com.sosmartlabs.momotabletpadres.glide.loadEncryptedProfilePicture
import timber.log.Timber
import androidx.core.view.isInvisible

class TabletMainAdapter(private val context: Context) :
    ListAdapter<MainCardTabletUser, TabletCardViewHolder>(TabletUserDiffCallback()) {

    private var mListener: TabletListener? = null

    init {
        try {
            mListener = context as TabletListener
            Timber.d("TabletMainAdapter: Successfully initialized TabletListener")
        } catch (e: ClassCastException) {
            Timber.e("TabletMainAdapter: Activity must implement TabletListener")
            CrashlyticsLog.recordNonFatalError(
                e, "Error on init of TabletMainAdapter: Activity must implement TabletListener"
            )
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) : TabletCardViewHolder {
        Timber.d("TabletMainAdapter: Creating new ViewHolder")
        val binding = ItemTabletMenuMainBinding.inflate(
            LayoutInflater.from(parent.context), parent, false)
        return TabletCardViewHolder(binding)
    }

    override fun onBindViewHolder(holder: TabletCardViewHolder, position: Int) {
        Timber.d("TabletMainAdapter: Binding ViewHolder at position $position")
        // Defensive: the main list never carries the null "add" item (only the
        // selector does), but guard so a future reuse can't NPE on tablet!!.
        if (getItem(position).tablet == null) return
        holder.mainCardTabletUser = getItem(position)
        setCardValues(holder)
        setButtonListeners(holder)
        setUserImage(holder)
        setTabletImage(holder)
    }

    private fun setButtonListeners(holder: TabletCardViewHolder) {
        holder.cardParentControl.setOnClickListener {
            Timber.d("TabletMainAdapter: Parent control clicked for tablet ${holder.mainCardTabletUser?.tablet?.profileName}")
            mListener!!.onParentControlSelected(holder.mainCardTabletUser!!.tablet!!)
        }

        holder.vTabletPicture.setOnClickListener {
            if (holder.showAlert) {
                Timber.d("TabletMainAdapter: Toggling alert message for tablet ${holder.mainCardTabletUser?.tablet?.profileName}")
                toggleAlertMessage(holder)
            }
        }

        holder.vImage.setOnClickListener {
            Timber.d("TabletMainAdapter: Profile clicked for tablet ${holder.mainCardTabletUser?.tablet?.profileName}")
            mListener!!.onProfileClicked(holder.mainCardTabletUser!!.tablet!!)
        }
    }

    private fun setCardValues(holder: TabletCardViewHolder) {
        val tablet = holder.mainCardTabletUser!!.tablet
        Timber.d("TabletMainAdapter: Setting card values for tablet ${tablet?.profileName}")

        // Card Name
        val vName = holder.vName
        vName.text = tablet!!.profileName
        vName.isSelected = true

        // Tablet Model Name
        holder.vTabletModelName.text = when(tablet.model) {
            TabletModel.LITE -> { context.getText(R.string.lite_model_name) }
            TabletModel.LITE_2 -> { context.getText(R.string.lite_2_model_name) }
            TabletModel.LITE_3 -> { context.getText(R.string.lite_3_model_name) }
            TabletModel.PRO, TabletModel.PRO_EU -> { context.getText(R.string.pro_model_name) }
            TabletModel.PRO_2 -> { context.getText(R.string.pro_2_model_name) }
            TabletModel.UNO -> { context.getText(R.string.uno_model_name) }
            TabletModel.PHONE_1 -> { context.getText(R.string.momophone_1_model_name) }
            else -> { context.getText(R.string.unknown_model_name) }
        }

        // Battery
        tablet.batteryPercentage?.let {
            Timber.d("TabletMainAdapter: Setting battery info for tablet ${tablet.profileName}, battery: $it%")
            generateBatteryDonutChart(holder)
            holder.vNormalBattery.text = context.getString(R.string.item_device_battery, tablet.batteryPercentage)
            holder.vAlertBattery.text = context.getString(R.string.item_device_battery, tablet.batteryPercentage)
        }
    }

    private fun setUserImage(holder : TabletCardViewHolder) {
        val tablet = holder.mainCardTabletUser!!.tablet
        Timber.d("TabletMainAdapter: Setting user image for tablet ${tablet?.profileName}")

        // Accessibility: name the profile image for TalkBack.
        holder.vImage.contentDescription = tablet?.profileName

        // Load the encrypted profile picture when present, falling back to the
        // unencrypted URL and finally the default avatar. The encrypted branch
        // previously always showed the default placeholder, so any tablet with a
        // picture set rendered as the default. The Glide loader keys on the
        // encryption metadata hash, so a changed picture invalidates the cache
        // and refreshes correctly.
        if (tablet != null) {
            Glide.with(holder.vImage)
                .loadEncryptedProfilePicture(tablet)
                .error(R.drawable.default_profile_pic)
                .into(holder.vImage)
        } else {
            holder.vImage.setImageResource(R.drawable.default_profile_pic)
        }
    }

    private fun setTabletImage(holder : TabletCardViewHolder) {
        val tablet = holder.mainCardTabletUser!!.tablet
        Timber.d("TabletMainAdapter: Setting tablet image for model ${tablet?.model}")
        
        when (tablet?.model) {
            TabletModel.PHONE_1 -> holder.vTabletPicture.setImageResource(R.drawable.momophone_v1_black)
            TabletModel.LITE -> holder.vTabletPicture.setImageResource(R.drawable.lite_v1_pink)
            TabletModel.LITE_2 -> holder.vTabletPicture.setImageResource(R.drawable.lite_v1_pink)
            TabletModel.LITE_3 -> holder.vTabletPicture.setImageResource(R.drawable.lite_v3_pink)
            TabletModel.PRO -> holder.vTabletPicture.setImageResource(R.drawable.pro_v1_pink)
            TabletModel.PRO_EU -> holder.vTabletPicture.setImageResource(R.drawable.pro_v1_pink)
            TabletModel.PRO_2 -> holder.vTabletPicture.setImageResource(R.drawable.pro_v2_pink)
            TabletModel.UNO -> holder.vTabletPicture.setImageResource(R.drawable.pro_v1_black)
            TabletModel.UNKNOWN_HARDWARE -> holder.vTabletPicture.setImageResource(R.drawable.pro_v1_black)
            null -> holder.vTabletPicture.setImageResource(R.drawable.pro_v1_black)
            else -> holder.vTabletPicture.setImageResource(R.drawable.pro_v1_black)
        }
    }

    private fun generateBatteryDonutChart(holder: TabletCardViewHolder) {
        val tablet = holder.mainCardTabletUser?.tablet ?: return

        val batteryPercentage = tablet.batteryPercentage ?: 0
        val hasLowBattery = batteryPercentage <= 15
        val hasHighBattery = batteryPercentage > 80

        Timber.d("TabletMainAdapter: Generating battery chart for tablet ${tablet.profileName}, battery: $batteryPercentage%")

        val batteryColorId = when {
            hasLowBattery -> R.color.disconnected_battery_color
            hasHighBattery -> R.color.good_battery_color
            else -> R.color.normal_battery_color
        }

        holder.vBatteryChart.clear()
        val batteryLeft = Segment("", (batteryPercentage / 100f))
        val emptySpace = Segment("", 1 - (batteryPercentage / 100f))
        val batteryColor = SegmentFormatter(ContextCompat.getColor(context, batteryColorId))
        val emptyColor = SegmentFormatter(Color.WHITE)

        val strokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.TRANSPARENT
            xfermode = PorterDuffXfermode(PorterDuff.Mode.SRC_OVER)
            isAntiAlias = true
        }

        batteryColor.apply {
            innerEdgePaint = strokePaint
            outerEdgePaint = strokePaint
            radialEdgePaint = strokePaint
        }

        emptyColor.apply {
            innerEdgePaint = strokePaint
            outerEdgePaint = strokePaint
            radialEdgePaint = strokePaint
        }

        holder.vBatteryChart.addSegment(batteryLeft, batteryColor)
        holder.vBatteryChart.addSegment(emptySpace, emptyColor)
        holder.vBatteryChart.getRenderer(PieRenderer::class.java).setDonutSize(0.7f, PieRenderer.DonutMode.PERCENT)
        holder.vBatteryChart.rotation = -90f
        holder.vBatteryChart.redraw()
    }

    private fun toggleAlertMessage(holder : TabletCardViewHolder) {
        Timber.d("TabletMainAdapter: Toggling alert message visibility")
        if (holder.vBatteryAlertMessage.isInvisible) {
            holder.vBatteryAlertMessage.visibility = View.VISIBLE
            holder.vBatteryDialogClosed.visibility = View.INVISIBLE
        } else {
            holder.vBatteryAlertMessage.visibility = View.INVISIBLE
            holder.vBatteryDialogClosed.visibility = View.VISIBLE
        }
    }

}
