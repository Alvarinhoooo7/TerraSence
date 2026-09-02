package com.sosmartlabs.momo.main.ui.adapter

import android.widget.ImageView
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.widget.LinearLayoutCompat
import androidx.constraintlayout.widget.ConstraintLayout
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.floatingactionbutton.FloatingActionButton
import com.google.android.material.progressindicator.CircularProgressIndicator
import com.sosmartlabs.momo.databinding.ItemWatchMenuMainBinding
import com.sosmartlabs.momo.main.model.MainCardWatchUser

class WatchCardViewHolder(binding: ItemWatchMenuMainBinding) : RecyclerView.ViewHolder(binding.root) {

    var mainCardWatchUser: MainCardWatchUser? = null

    // Layout views
    val cardBackground: LinearLayoutCompat = binding.cardBackground
    val authorizedView: ConstraintLayout = binding.authorizedData
    val unauthorizedView: ConstraintLayout = binding.unauthorizedData
    val firstInteractionView: ConstraintLayout = binding.firstInteractionData

    // Unauthorized view components
    val unauthorizedWatchProfilePicture: ImageView = binding.unauthorizedWatchProfilePicture
    val unauthorizedWatchImei: TextView = binding.unauthorizedWatchImei
    val unauthorizedWatchMessage: TextView = binding.unauthorizedWatchMessage

    // Authorized view components
    val authorizedWatchProfilePicture: ImageView = binding.watchProfilePicture
    val authorizedWatchName: TextView = binding.watchName
    val authorizedWatchPhone: TextView = binding.watchNumber
    val authorizedBatteryLayout: ConstraintLayout = binding.batteryLayout
    val authorizedBatteryPercentage: TextView = binding.batteryPercentage
    val authorizedBatteryPercentageProgressBar: CircularProgressIndicator = binding.batteryPercentageProgress
    val authorizedBatteryIcon: ImageView = binding.batteryIcon
    val authorizedWatchStatusImage: ImageView = binding.watchStatusImage
    val authorizedWatchModelImage: ImageView = binding.authorizedWatchModelImage

    // First interaction view components
    val firstInteractionText: TextView = binding.firstInteractionWatchText
    val firstInteractionWatchName: TextView = binding.firstInteractionWatchName
    val firstInteractionWatchProfilePicture: ImageView = binding.firstInteractionWatchProfilePicture
    val firstInteractionProgressBar: ProgressBar = binding.firstInteractionProgressBar
    val firstInteractionWatchModelImage: ImageView = binding.firstInteractionWatchModelImage

    // Action buttons
    val buttonCall: FloatingActionButton = binding.buttonActionCall
    val buttonMessages: FloatingActionButton = binding.buttonActionMessage
    val buttonDirections: FloatingActionButton = binding.buttonActionDirections
    val buttonGps: FloatingActionButton = binding.buttonActionLocation
    val buttonSettings: FloatingActionButton = binding.buttonActionSettings

    // Battery alert components
    val batteryAlertLayout: ConstraintLayout = binding.batteryAlertLayout
    val batteryAlertMessageLayout: ConstraintLayout = binding.batteryAlertMessageLayout
    val batteryAlertMessageText: TextView = binding.batteryAlertMessageText

    fun getFloatingButtons() = listOf(
        buttonSettings,
        buttonCall,
        buttonMessages,
        buttonDirections,
        buttonGps
    )
}