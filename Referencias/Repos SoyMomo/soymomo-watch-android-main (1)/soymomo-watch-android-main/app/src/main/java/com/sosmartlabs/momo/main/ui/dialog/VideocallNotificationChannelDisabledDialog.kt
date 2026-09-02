package com.sosmartlabs.momo.main.ui.dialog

import android.os.Bundle
import androidx.fragment.app.DialogFragment
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.pushnotifications.model.NotificationChannelCategory
import com.sosmartlabs.momo.pushnotifications.ui.NotificationChannelChecker
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class VideocallNotificationChannelDisabledDialog: DialogFragment() {

    @Inject
    lateinit var notificationChannelChecker: NotificationChannelChecker

    override fun onCreateDialog(savedInstanceState: Bundle?) = MaterialAlertDialogBuilder(requireContext())
        .setTitle(getString(R.string.videocall_notification_channel_disabled_title))
        .setMessage(getString(R.string.videocall_notification_channel_disabled_description))
        .setIcon(R.drawable.settings_app_videocalls)
        .setPositiveButton(R.string.videocall_notification_channel_disabled_enable) { _, _ ->
            notificationChannelChecker.openAppNotificationSettings(requireContext(), NotificationChannelCategory.VIDEOCALL.id)
        }
        .setNegativeButton(R.string.videocall_notification_channel_disabled_dismiss, null)
        .create()

}