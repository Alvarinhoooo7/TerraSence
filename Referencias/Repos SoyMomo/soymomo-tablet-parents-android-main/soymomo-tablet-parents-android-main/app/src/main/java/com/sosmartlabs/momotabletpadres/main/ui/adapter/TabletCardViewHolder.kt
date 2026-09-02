package com.sosmartlabs.momotabletpadres.main.ui.adapter

import android.widget.ImageView
import android.widget.TextView
import androidx.appcompat.widget.LinearLayoutCompat
import androidx.cardview.widget.CardView
import androidx.constraintlayout.widget.ConstraintLayout
import androidx.recyclerview.widget.RecyclerView
import com.androidplot.pie.PieChart
import com.sosmartlabs.momotabletpadres.databinding.ItemTabletMenuMainBinding
import com.sosmartlabs.momotabletpadres.models.MainCardTabletUser

class TabletCardViewHolder(binding: ItemTabletMenuMainBinding): RecyclerView.ViewHolder(binding.root){

    // Store Data
    var mainCardTabletUser : MainCardTabletUser? = null

    // View Bindings.
    var vAuthorizedData : ConstraintLayout = binding.authorizedData
    var vUserUnauthorized : ConstraintLayout = binding.userUnauthorized

    var vImage : ImageView = binding.watchProfilePicture
    var vName : TextView = binding.watchName
    var vTabletModelName : TextView = binding.tabletModel

    var vNormalBattery : TextView = binding.watchNormalBattery
    var vAlertBattery : TextView = binding.watchAlertBattery
    var vBatteryChart : PieChart = binding.batteryChart
    var vBatteryAlertLayout : LinearLayoutCompat = binding.batteryAlertLayout
    val vBatteryIcon : ImageView = binding.batteryIcon

    var vTabletPicture : ImageView = binding.userTablet
    var vBatteryAlert : ConstraintLayout = binding.batteryAlert
    var vBatteryAlertMessage : ConstraintLayout = binding.batteryAlertMessage
    var vBatteryAlertMessageText : TextView = binding.batteryAlertMessageText
    var vBatteryDialogClosed : ImageView = binding.batteryDialogClosed

    var showAlert : Boolean = false
    var cardBackground : LinearLayoutCompat = binding.cardBackground

    var cardParentControl: CardView = binding.parentalControlCard
}