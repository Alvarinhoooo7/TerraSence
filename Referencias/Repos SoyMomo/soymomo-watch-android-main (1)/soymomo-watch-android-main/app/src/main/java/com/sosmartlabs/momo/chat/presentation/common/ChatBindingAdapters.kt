package com.sosmartlabs.momo.chat.presentation.common

import android.annotation.SuppressLint
import android.view.View
import android.widget.ImageView
import android.widget.TextView
import androidx.databinding.BindingAdapter
import com.bumptech.glide.Glide
import com.bumptech.glide.load.resource.bitmap.RoundedCorners
import com.bumptech.glide.request.RequestOptions
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.chat.data.local.entity.*
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import java.text.SimpleDateFormat
import timber.log.Timber

/**
 * Class for binding custom formatted data on Chat layout fields using DataBinding
 */
object ChatBindingAdapters {
    @SuppressLint("SimpleDateFormat")
    private val sdf = SimpleDateFormat("HH:mm")

    /**
     * Uses Glide library for formatting a bitmap before putting it on an ImageView
     * @param view ImageView in which the bitmap will be placed
     * @param image String with the URI of the image resource to load
     */
    @BindingAdapter("app:image")
    @JvmStatic
    fun loadImage(view: ImageView, image: String?) {
        Timber.d("ChatBindingAdapters: loadImage called for viewId=${view.id} with image=$image")
        if (image != null) {
            try {
                Timber.d("ChatBindingAdapters: Attempting to load image: $image into ImageView id=${view.id}")
                Glide.with(view.context)
                    .load(image)
                    .apply(RequestOptions.bitmapTransform(RoundedCorners(8)))
//                    .placeholder(R.drawable.ic_apps_primary)
//                    .error(R.drawable.ic_apps_primary)
                    .into(view)
                view.visibility = View.VISIBLE
                Timber.d("ChatBindingAdapters: Image loaded successfully into ImageView id=${view.id}")
            } catch (e: Exception) {
                Timber.e(e, "ChatBindingAdapters: Error loading image: $image into ImageView id=${view.id}")
                CrashlyticsLog.recordNonFatalError(e, "ChatBindingAdapters: Error loading image: $image into ImageView id=${view.id}")
                view.visibility = View.GONE
            }
        } else {
            Timber.d("ChatBindingAdapters: No image provided, hiding ImageView id=${view.id}")
            view.visibility = View.GONE
        }
    }

    /**
     * Allows to parse a date to the given format for writing it on a TextView
     * @param view TextView in which to write the formatted date
     * @param date Date on UTC timestamp format
     */
    @BindingAdapter("app:messageDate")
    @JvmStatic
    fun parseDate(view: TextView, date: Long) {
        Timber.d("ChatBindingAdapters: parseDate called for viewId=${view.id} with date=$date")
        try {
            val formatted = sdf.format(date)
            view.text = formatted
            Timber.d("ChatBindingAdapters: Date formatted as $formatted for viewId=${view.id}")
        } catch (e: Exception) {
            view.text = view.context.getString(R.string.chat_time_placeholder)
            Timber.e(e, "ChatBindingAdapters: Error formatting timestamp $date for viewId=${view.id}")
            CrashlyticsLog.recordNonFatalError(e, "ChatBindingAdapters: Error formatting timestamp $date for viewId=${view.id}")
        }
    }

    /**
     * Put the appropriate icon on a status ImageView according to the given status
     * @param view ImageView in which to put the icon
     * @param status New ImageView status
     */
    @BindingAdapter("app:status")
    @JvmStatic
    fun showStatusIcon(view: ImageView, status: String?) {
        Timber.d("ChatBindingAdapters: showStatusIcon called for viewId=${view.id} with status=$status")
        try {
            if (status == null) {
                view.setImageResource(R.drawable.ic_message_received)
                Timber.d("ChatBindingAdapters: Status is null, set ic_message_received for viewId=${view.id}")
            } else {
                when (status) {
                    ChatEntity.STATUS_SENDING -> {
                        view.setImageResource(R.drawable.ic_message_wait)
                        Timber.d("ChatBindingAdapters: Status SENDING, set ic_message_wait for viewId=${view.id}")
                    }
                    ChatEntity.STATUS_SENT -> {
                        view.setImageResource(R.drawable.ic_message_send)
                        Timber.d("ChatBindingAdapters: Status SENT, set ic_message_send for viewId=${view.id}")
                    }
                    ChatEntity.STATUS_RECEIVED -> {
                        view.setImageResource(R.drawable.ic_message_received)
                        Timber.d("ChatBindingAdapters: Status RECEIVED, set ic_message_received for viewId=${view.id}")
                    }
                    ChatEntity.STATUS_ERROR -> {
                        view.setImageResource(R.drawable.ic_message_error)
                        Timber.d("ChatBindingAdapters: Status ERROR, set ic_message_error for viewId=${view.id}")
                    }
                    else -> {
                        view.setImageResource(0)
                        Timber.w("ChatBindingAdapters: Unknown status '$status', cleared image for viewId=${view.id}")
                    }
                }
            }
        } catch (e: Exception) {
            Timber.e(e, "ChatBindingAdapters: Error setting status icon for status=$status on viewId=${view.id}")
            CrashlyticsLog.recordNonFatalError(e, "ChatBindingAdapters: Error setting status icon for status=$status on viewId=${view.id}")
        }
    }
}
