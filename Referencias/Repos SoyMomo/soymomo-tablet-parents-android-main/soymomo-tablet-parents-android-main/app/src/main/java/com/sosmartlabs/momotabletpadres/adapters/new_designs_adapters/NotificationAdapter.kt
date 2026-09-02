package com.sosmartlabs.momotabletpadres.adapters.new_designs_adapters

import android.content.Context
import android.graphics.Color
import android.text.format.DateUtils
import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.paging.PagingDataAdapter
import androidx.recyclerview.widget.RecyclerView
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.adapters.NotificationDiffCallback
import com.sosmartlabs.momotabletpadres.databinding.ItemNotificationNewBinding
import com.sosmartlabs.momotabletpadres.glide.loadAppIcon
import com.sosmartlabs.momotabletpadres.models.entity.NotificationEntity
import timber.log.Timber

class NotificationAdapter(private val mContext: Context):
    PagingDataAdapter<NotificationEntity, NotificationAdapter.NotificationViewHolder>(
        NotificationDiffCallback()
    ) {

    interface Listener{
        fun onNotificationClicked(notification: NotificationEntity, position: Int)
    }

    lateinit var listener: Listener

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): NotificationViewHolder {
        return NotificationViewHolder(ItemNotificationNewBinding.inflate(
            LayoutInflater.from(parent.context), parent, false), mContext, listener)
    }

    override fun onBindViewHolder(holder: NotificationViewHolder, position: Int) {
        val notification = getItem(position)
        holder.bind(notification, position)
    }

    fun getNotificationEntity(position: Int): NotificationEntity? {
        Timber.d("getNotificationEntity in position: $position")
        return getItem(position)
    }

    class NotificationViewHolder(private val binding: ItemNotificationNewBinding, private val context: Context, private val listener: Listener) :
        RecyclerView.ViewHolder(binding.root) {

        private val notificationCard get() = binding.notificationCard
        private val notificationTitle get() = binding.notificationTitle
        private val notificationDescription get() = binding.notificationDescription
        private val notificationTabletProfileImage get() = binding.tabletProfileImage
        private val notificationTimeText get() = binding.notificationTimeText

        fun bind(notification: NotificationEntity?, position: Int) {
            setTitleAndDescription(notification)
            setNotificationIcon(notification)
            setTimeText(notification)
            setCardColor(notification)
            setOnClickListener(notification, position)
        }

        private fun setOnClickListener(notification: NotificationEntity?, position: Int) {
                notificationCard.setOnClickListener {
                    listener.onNotificationClicked(notification!!, position)
            }
        }

        private fun setTimeText(notification: NotificationEntity?) {
            notificationTimeText.text = DateUtils.getRelativeTimeSpanString(notification?.createdAt!!)
        }

        private fun setTitleAndDescription(notification: NotificationEntity?) {
            Timber.d("setTitleAndDescription: ${notification?.category?.slug}")
            when(notification?.category?.slug) {
                "unsafe_search" -> {
                    notificationTitle.text = context.getString(R.string.notification_unsafe_search_title)
                    notificationDescription.text = context.getString(R.string.notification_unsafe_search_text, notification.tablet?.profileName)
                }
                "detected_conversation" -> {
                    notificationTitle.text = context.getString(R.string.notification_detected_conversation_title)
                    notificationDescription.text = context.getString(R.string.notification_detected_conversation_text, notification.tablet?.profileName)
                }
                "installed_application" -> {
                    notificationTitle.text = context.getString(R.string.notification_installed_app_title)
                    notificationDescription.text = context.getString(R.string.notification_adapter_installed_app_text, notification.tablet?.profileName)
                }
                "smart_detection" -> {
                    notificationTitle.text = context.getString(R.string.notification_smart_detection_title)
                    notificationDescription.text = context.getString(R.string.notification_smart_detection_text, notification.tablet?.profileName)
                }
                "mood_detection" -> {
                    notificationTitle.text = context.getString(R.string.notification_mood_detection_title_new)
                    notificationDescription.text = context.getString(R.string.notification_mood_detection_text, notification.tablet?.profileName)
                }
                "explicit_music_detection" -> {
                    notificationTitle.text = context.getString(R.string.notification_explicit_music_detection_title_new)
                    notificationDescription.text = context.getString(R.string.notification_explicit_music_detection_text, notification.tablet?.profileName)
                }
                "request_time" -> {
                    notificationTitle.text = context.getString(R.string.notification_time_requested_title)
                    notificationDescription.text = context.getString(R.string.notification_time_requested_text, notification.tablet?.profileName)
                }
                "request_time_app" -> {
                    notificationTitle.text = context.getString(R.string.notification_time_requested_app_title_new)
                    notificationDescription.text = context.getString(R.string.notification_adapter_time_requested_app_text, notification.tablet?.profileName)
                }
                "explicit_music_detection_spotify_enabled" -> {
                    notificationTitle.text = context.getString(R.string.notification_explicit_music_detection_config_title_new)
                    notificationDescription.text = context.getString(R.string.notification_explicit_music_detection_config_text)
                }                
            }
            //notificationDescription.text = notificationTitle.text
            //notificationTitle.text = notification?.tablet?.profileName
        }

        private fun setNotificationIcon(notification: NotificationEntity?) {
            notificationTabletProfileImage.loadAppIcon(
                notification?.category?.iconUrl,
                notification?.category?.categoryName
            )
        }

        private fun setCardColor(notification: NotificationEntity?) {
            /*
            if (notification?.isRead!!) {
                notificationCard.setBackgroundColor(Color.parseColor("#FFFFFF"))
                notificationDescription.setTextColor(Color.parseColor("#808080"))
            }
             */
        }
    }

}