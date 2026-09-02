package com.sosmartlabs.momo.main.ui.adapter

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import androidx.recyclerview.widget.ListAdapter
import com.bumptech.glide.Glide
import com.bumptech.glide.load.resource.drawable.DrawableTransitionOptions
import com.parse.ParseCloud
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.chat.presentation.activity.ChatListActivity
import com.sosmartlabs.momo.databinding.ItemWatchMenuMainBinding
import com.sosmartlabs.momo.main.model.MainCardWatchUser
import com.sosmartlabs.momo.main.ui.dialog.DisabledUserPermissionDialogFragment
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.utils.Constants
import com.sosmartlabs.momo.utils.DirectionsLauncher
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.main.ui.WatchListener
import com.sosmartlabs.momo.main.ui.dialog.MissingFirstInteractionDialogFragment
import com.sosmartlabs.momo.utils.ui.DefaultIcons
import com.sosmartlabs.momo.utils.ui.loadImage
import com.sosmartlabs.momo.watchrequests.model.UserPermission
import jp.wasabeef.glide.transformations.BlurTransformation
import timber.log.Timber
import androidx.core.view.isVisible

class WatchCardAdapter(
    private val activity: FragmentActivity,
    private val watchListener: WatchListener,
    private val onReviewPositiveAction: () -> Unit
) : ListAdapter<MainCardWatchUser, WatchCardViewHolder>(WatchUserDiffCallback()) {

    private val context: Context = activity
    private val supportFragmentManager = activity.supportFragmentManager

    // Scroll coordination (panning the selector strip, ring cross-fade, settle →
    // selection) lives in MainActivity now; this adapter is a pure card renderer.

    // Read-only fallback for watch users without a stored permission row; shared
    // across binds so it isn't re-allocated on every page swipe.
    private val defaultPermission = UserPermission().apply {
        videocall = true
        call = true
        messages = true
        location = true
        edit = true
    }

    fun updateElement(cardWatchUser: MainCardWatchUser) {
        val watch = cardWatchUser.watchUser.watch
        val index = currentList.indexOfFirst { current ->
            val currentWatch = current.watchUser.watch ?: return@indexOfFirst false
            currentWatch.objectId == watch?.objectId || currentWatch.deviceId == watch?.deviceId
        }
        if (index >= 0) {
            notifyItemChanged(index, Unit)
        } else {
            Timber.w("WatchCardAdapter: updateElement() - Skipping update, watch not found in currentList")
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): WatchCardViewHolder {
        val binding = ItemWatchMenuMainBinding.inflate(
            LayoutInflater.from(parent.context), parent, false
        )
        return WatchCardViewHolder(binding)
    }

    override fun onBindViewHolder(holder: WatchCardViewHolder, position: Int) {
        val mainCardWatchUser = getItem(position)
        holder.mainCardWatchUser = mainCardWatchUser

        // Extract the wearer and its state ONCE per bind: binds run mid-swipe as the
        // next card enters the viewport, and isConnected()/getParseObject() are not
        // free. The snapshot is passed down to every helper below.
        val watchUser = mainCardWatchUser.watchUser
        val wearer = watchUser.getParseObject("watch") as? Wearer ?: return
        val watchUserPermission = watchUser.userPermission ?: defaultPermission
        val isActive = watchUser.active
        val isConnected = wearer.isConnected()
        val hadFirstInteraction = wearer.hasSuccessfulFirstInteraction()

        Timber.d("WatchCardAdapter: bind pos=$position device=${wearer.deviceId} connected=$isConnected active=$isActive firstInteraction=$hadFirstInteraction")

        setCardListeners(holder, wearer, watchUserPermission, isActive, isConnected, hadFirstInteraction)
        setCardValues(holder, wearer, isActive)
        setCurrentCardView(holder, wearer, isActive, isConnected, hadFirstInteraction)
    }

    // View methods

    private fun setCardListeners(
        holder: WatchCardViewHolder,
        wearer: Wearer,
        watchUserPermission: UserPermission,
        isActive: Boolean,
        isConnected: Boolean,
        hadFirstInteraction: Boolean
    ) {
        holder.buttonSettings.imageAlpha = if (isActive && hadFirstInteraction) 255 else 125
        holder.buttonCall.imageAlpha = if (watchUserPermission.call && isConnected && isActive && hadFirstInteraction) 255 else 125
        holder.buttonMessages.imageAlpha = if (watchUserPermission.messages && isConnected && isActive && hadFirstInteraction) 255 else 125
        holder.buttonDirections.imageAlpha = if (watchUserPermission.location && isConnected && isActive && hadFirstInteraction) 255 else 125
        holder.buttonGps.imageAlpha = if (watchUserPermission.location && isConnected && isActive && hadFirstInteraction) 255 else 125

        holder.buttonSettings.setOnClickListener {
            when{
                !isActive -> {
                    //No-Op
                }
                !hadFirstInteraction -> MissingFirstInteractionDialogFragment().show(supportFragmentManager, "")
                else -> watchListener.onOpenSettings(holder.mainCardWatchUser!!, holder.authorizedWatchProfilePicture, holder.authorizedWatchName)
            }
        }
        holder.buttonCall.setOnClickListener {
            when{
                !isActive -> {
                    //No-Op
                }
                !hadFirstInteraction -> MissingFirstInteractionDialogFragment().show(supportFragmentManager, "")
                !watchUserPermission.call -> DisabledUserPermissionDialogFragment().show(supportFragmentManager, "")
                !isConnected -> {
                    //No-Op
                }
                else -> tryCallWearer(wearer)
            }
        }
        holder.buttonMessages.setOnClickListener {
            when{
                !isActive -> {
                    //No-Op
                }
                !hadFirstInteraction -> MissingFirstInteractionDialogFragment().show(supportFragmentManager, "")
                !watchUserPermission.messages -> DisabledUserPermissionDialogFragment().show(supportFragmentManager, "")
                !isConnected -> {
                    //No-Op
                }
                else -> goToMessages(wearer)
            }
        }
        holder.buttonDirections.setOnClickListener {
            when{
                !isActive -> {
                    //No-Op
                }
                !hadFirstInteraction -> MissingFirstInteractionDialogFragment().show(supportFragmentManager, "")
                !watchUserPermission.location -> DisabledUserPermissionDialogFragment().show(supportFragmentManager, "")
                !isConnected -> {
                    //No-Op
                }
                else -> openDirectionsToWearer(wearer)
            }
        }
        holder.buttonGps.setOnClickListener {
            when{
                !isActive -> {
                    //No-Op
                }
                !hadFirstInteraction -> MissingFirstInteractionDialogFragment().show(supportFragmentManager, "")
                !watchUserPermission.location -> DisabledUserPermissionDialogFragment().show(supportFragmentManager, "")
                !isConnected -> {
                    //No-Op
                }
                else -> locateWearerInMap(wearer)
            }
        }
        holder.authorizedWatchModelImage.setOnClickListener {
            toggleBatteryAlertMessage(holder)
        }
    }

    private fun setCardValues(holder: WatchCardViewHolder, wearer: Wearer, isActive: Boolean) {
        val imageUrl = wearer.image?.url ?: DefaultIcons.PROFILE_MOMO_SPACE
        // String? on purpose: ParseDelegate yields null for a missing column.
        val hardwareModel: String? = wearer.hardwareModel
        val watchModelImageId = when (hardwareModel) {
            "Soymomo_Original", "Soymomo_H2O" -> R.drawable.watch_h20blue
            "Soymomo_Space_Lite_v1" -> R.drawable.watch_liteblue
            "Soymomo_Space_v1" -> R.drawable.watch_space1_0blue
            "Soymomo_Space_v2" -> R.drawable.watch_space2_0blue
            "Soymomo_Space_v3" -> R.drawable.watch_space3_0blue
            "Soymomo_Space_v4" -> R.drawable.watch_space4_0black
            else -> R.drawable.watch_space3_0blue
        }

        // Set values for authorized view
        holder.authorizedWatchName.text = if (isActive) wearer.name() else wearer.deviceId
        holder.authorizedWatchName.isSelected = true
        holder.authorizedWatchPhone.text = if (isActive) wearer.phone else " - "
        holder.authorizedWatchProfilePicture.loadImage(imageUrl, fallback = DefaultIcons.PROFILE_MOMO_SPACE)
        holder.authorizedBatteryPercentage.text = context.getString(R.string.item_watch_battery, wearer.batteryPercentage)
        holder.authorizedWatchModelImage.setImageResource(watchModelImageId)
        generateBatteryProgressBar(holder, wearer)

        // Set values for unauthorized view (we will set them always, doesn't matter if we don't show it)
        holder.unauthorizedWatchImei.text = context.getString(R.string.unauthorized_watch_imei, wearer.imei())
        holder.unauthorizedWatchMessage.text = context.getString(R.string.unauthorized_watch_message)
        
        // Load blurred image for unauthorized view
        Glide.with(holder.unauthorizedWatchProfilePicture.context)
            .load(imageUrl)
            .fallback(DefaultIcons.PROFILE_MOMO_SPACE)
            .transform(BlurTransformation(25, 3))
            .transition(DrawableTransitionOptions.withCrossFade())
            .into(holder.unauthorizedWatchProfilePicture)

        // Set values for waiting first interaction view
        holder.firstInteractionWatchName.text = wearer.name()
        holder.firstInteractionWatchProfilePicture.loadImage(imageUrl, fallback = DefaultIcons.PROFILE_MOMO_SPACE)
        holder.firstInteractionWatchModelImage.setImageResource(watchModelImageId)
    }

    private fun setCurrentCardView(
        holder: WatchCardViewHolder,
        wearer: Wearer,
        isWatchUserActive: Boolean,
        isConnected: Boolean,
        hadFirstInteraction: Boolean
    ) {
        val isBatterySaveInUse = wearer.getBoolean("batterySaveInUse")
        val showGPSBatteryWarning = wearer.showBatteryWarning
        val batteryPercentage = wearer.batteryPercentage ?: 0
        // Wearer.ranOutOfBattery() is the single definition of this split — the banner above
        // this card and the chat card read the same one, so all three name the same cause.
        val isDisconnectedByBattery = !isConnected && wearer.ranOutOfBattery()
        val isDisconnectedByProblem = !isConnected && !isDisconnectedByBattery
        val hasLowBattery = batteryPercentage <= 15

        // Select which parent view to show
        when {
            !isWatchUserActive -> {
                holder.unauthorizedView.visibility = View.VISIBLE
                holder.authorizedView.visibility = View.INVISIBLE
                holder.firstInteractionView.visibility = View.INVISIBLE
            }
            !hadFirstInteraction -> {
                holder.unauthorizedView.visibility = View.INVISIBLE
                holder.authorizedView.visibility = View.INVISIBLE
                holder.firstInteractionView.visibility = View.VISIBLE
            }
            else -> {
                holder.unauthorizedView.visibility = View.INVISIBLE
                holder.authorizedView.visibility = View.VISIBLE
                holder.firstInteractionView.visibility = View.INVISIBLE
            }
        }

        // Modify view details based on watch status
        when {
            isDisconnectedByBattery -> {
                holder.cardBackground.background = ContextCompat.getDrawable(context, R.drawable.round_main_card_background_error)

                holder.batteryAlertLayout.visibility = View.VISIBLE
                holder.batteryAlertMessageLayout.visibility = View.INVISIBLE
                holder.batteryAlertMessageText.setText(R.string.battery_alert_battery_off)

                holder.authorizedBatteryLayout.visibility = View.INVISIBLE
                holder.authorizedBatteryPercentage.visibility = View.INVISIBLE
                holder.authorizedBatteryIcon.visibility = View.INVISIBLE
                holder.authorizedBatteryIcon.setImageResource(R.drawable.ic_no_battery)
                holder.authorizedWatchStatusImage.visibility = View.VISIBLE
                holder.authorizedWatchStatusImage.setImageResource(R.drawable.ic_no_battery)
            }
            isDisconnectedByProblem -> {
                holder.cardBackground.background = ContextCompat.getDrawable(context, R.drawable.round_main_card_background_error)

                holder.batteryAlertLayout.visibility = View.VISIBLE
                holder.batteryAlertMessageLayout.visibility = View.INVISIBLE
                holder.batteryAlertMessageText.setText(R.string.battery_alert_disconnected_watch)

                holder.authorizedBatteryLayout.visibility = View.INVISIBLE
                holder.authorizedBatteryPercentage.visibility = View.INVISIBLE
                holder.authorizedBatteryIcon.visibility = View.INVISIBLE
                holder.authorizedBatteryIcon.setImageResource(R.drawable.no_sim)
                holder.authorizedWatchStatusImage.visibility = View.VISIBLE
                holder.authorizedWatchStatusImage.setImageResource(R.drawable.no_sim)
            }
            isBatterySaveInUse -> {
                holder.cardBackground.background = ContextCompat.getDrawable(context, R.drawable.round_main_card_background)

                holder.batteryAlertLayout.visibility = View.VISIBLE
                holder.batteryAlertMessageLayout.visibility = View.INVISIBLE
                holder.batteryAlertMessageText.setText(R.string.battery_alert_battery_save)

                holder.authorizedBatteryLayout.visibility = View.VISIBLE
                holder.authorizedBatteryPercentage.visibility = View.VISIBLE
                holder.authorizedBatteryIcon.visibility = View.VISIBLE
                holder.authorizedBatteryIcon.setImageResource(R.drawable.battery_save)
                holder.authorizedWatchStatusImage.visibility = View.INVISIBLE
                holder.authorizedWatchStatusImage.setImageResource(R.drawable.battery_save)
            }
            showGPSBatteryWarning -> {
                holder.cardBackground.background = ContextCompat.getDrawable(context, R.drawable.round_main_card_background)

                holder.batteryAlertLayout.visibility = View.VISIBLE
                holder.batteryAlertMessageLayout.visibility = View.INVISIBLE
                holder.batteryAlertMessageText.setText(R.string.battery_alert_gps_mode)

                holder.authorizedBatteryLayout.visibility = View.VISIBLE
                holder.authorizedBatteryPercentage.visibility = View.VISIBLE
                holder.authorizedBatteryIcon.visibility = View.VISIBLE
                holder.authorizedBatteryIcon.setImageResource(R.drawable.battery_save)
                holder.authorizedWatchStatusImage.visibility = View.INVISIBLE
                holder.authorizedWatchStatusImage.setImageResource(R.drawable.battery_save)
            }
            hasLowBattery -> {
                holder.cardBackground.background = ContextCompat.getDrawable(context, R.drawable.round_main_card_background)

                holder.batteryAlertLayout.visibility = View.VISIBLE
                holder.batteryAlertMessageLayout.visibility = View.INVISIBLE
                holder.batteryAlertMessageText.setText(R.string.battery_alert_low_battery)

                holder.authorizedBatteryLayout.visibility = View.VISIBLE
                holder.authorizedBatteryPercentage.visibility = View.VISIBLE
                holder.authorizedBatteryIcon.visibility = View.VISIBLE
                holder.authorizedBatteryIcon.setImageResource(R.drawable.low_battery)
                holder.authorizedWatchStatusImage.visibility = View.INVISIBLE
                holder.authorizedWatchStatusImage.setImageResource(R.drawable.low_battery)
            }
            else -> {
                holder.cardBackground.background = ContextCompat.getDrawable(context, R.drawable.round_main_card_background)

                holder.batteryAlertLayout.visibility = View.INVISIBLE
                holder.batteryAlertMessageLayout.visibility = View.INVISIBLE
                // holder.batteryAlertMessageText.setText("")

                holder.authorizedBatteryLayout.visibility = View.VISIBLE
                holder.authorizedBatteryPercentage.visibility = View.VISIBLE
                holder.authorizedBatteryIcon.visibility = View.GONE
                // holder.authorizedBatteryIcon.setImageResource(R.drawable.low_battery)
                holder.authorizedWatchStatusImage.visibility = View.INVISIBLE
                // holder.authorizedWatchStatusImage.setImageResource(R.drawable.low_battery)
            }
        }
    }

    private fun generateBatteryProgressBar(holder: WatchCardViewHolder, wearer: Wearer) {
        val isBatterySaveInUse = wearer.getBoolean("batterySaveInUse")
        val showGPSBatteryWarning = wearer.showBatteryWarning
        val batteryPercentage = wearer.batteryPercentage ?: 0
        val hasLowBattery = batteryPercentage <= 15
        val hasHighBattery = batteryPercentage > 80

        val batteryColorId = when {
            isBatterySaveInUse || showGPSBatteryWarning -> R.color.save_battery_color
            hasLowBattery -> R.color.low_battery_color
            hasHighBattery -> R.color.good_battery_color
            else -> R.color.normal_battery_color
        }

        holder.authorizedBatteryPercentageProgressBar.setProgressCompat(batteryPercentage, true)
        holder.authorizedBatteryPercentageProgressBar.setIndicatorColor(ContextCompat.getColor(context, batteryColorId))
    }

    private fun toggleBatteryAlertMessage(holder: WatchCardViewHolder) {
        val isBatteryAlertMessageVisible = holder.batteryAlertMessageLayout.isVisible
        holder.batteryAlertMessageLayout.visibility = if (isBatteryAlertMessageVisible) View.INVISIBLE else View.VISIBLE
    }

    // Interface methods

    private fun goToMessages(wearer: Wearer) {
        // Route through ChatListActivity to keep all chat entry points unified.
        val intent = Intent(context, ChatListActivity::class.java).apply {
            putExtra(Constants.EXTRA_WATCH, wearer)
        }
        context.startActivity(intent)
    }

    private fun locateWearerInMap(wearer: Wearer) {
        watchListener.onLocateWearer(wearer.objectId)
        val params = hashMapOf("deviceId" to wearer.deviceId)
        ParseCloud.callFunctionInBackground<Any>("sendCR", params) { _, e ->
            if (e != null) CrashlyticsLog.recordNonFatalError(e, "Error calling sendCR cloud function")
        }
        onReviewPositiveAction()
    }

    private fun openDirectionsToWearer(wearer: Wearer) {
        val loc = wearer.lastKnownLocation ?: return
        DirectionsLauncher.open(context, loc.latitude, loc.longitude, wearer.name())
    }

    private fun tryCallWearer(wearer: Wearer) {
        if (wearer.phone.isNullOrEmpty()) {
            watchListener.onNoPhoneNumber(wearer)
        } else {
            watchListener.onPerformCall(wearer)
            onReviewPositiveAction()
        }
    }

}
