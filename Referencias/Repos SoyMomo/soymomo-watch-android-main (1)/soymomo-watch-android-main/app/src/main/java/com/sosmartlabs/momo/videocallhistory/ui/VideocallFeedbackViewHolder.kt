package com.sosmartlabs.momo.videocallhistory.ui

import androidx.recyclerview.widget.RecyclerView
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.ItemVideoCallInfoBinding
import com.sosmartlabs.momo.utils.ui.DefaultIcons
import com.sosmartlabs.momo.utils.ui.loadImage
import com.sosmartlabs.momo.videocall.model.VideocallFeedback
import java.text.DateFormat
import java.util.concurrent.TimeUnit

/**
 * ViewHolder for VideocallFeedback in VideocallHistory
 */
class VideocallFeedbackViewHolder(private val binding: ItemVideoCallInfoBinding):
    RecyclerView.ViewHolder(binding.root) {
    companion object {
        /**
         * DateFormat for showing dates and times
         */
        private val DATE_FORMAT = DateFormat.getDateTimeInstance(DateFormat.SHORT, DateFormat.SHORT)

        /**
         * Constant for user caller in video call
         */
        private const val USER_CALLER = "user"
    }

    /**
     * VideocallFeedback element in this view
     */
    private var _feedback: VideocallFeedback? = null

    /**
     * Gets/Sets the VideocallFeedback associated to this ViewHolder
     */
    var feedback: VideocallFeedback?
        get() = _feedback
        set(value) {
            _feedback = value ?: return

            with(binding) {
                val context = root.context

                // Load image or use fallback
                watchImage.loadImage(
                    value.watch.image?.url ?: DefaultIcons.PROFILE_MOMO_SPACE,
                    fallback = DefaultIcons.PROFILE_MOMO_SPACE
                )

                watchName.apply {
                    text = value.watch.name()
                    isSelected = true
                }

                videoCallDate.text = DATE_FORMAT.format(value.createdAt)

                // Set call status text and image
                callStatus.text = if (value.sucess == false || value.sucess == null) {
                    context.getText(R.string.video_call_history_missed)
                } else {
                    val duration = value.duration?.toLong() ?: 0L
                    getFormattedCallDuration(duration)
                }

                callStatusImage.setImageResource(determineCallStatusIcon(value))
            }
        }

    private fun determineCallStatusIcon(value: VideocallFeedback): Int {
        val isSuccessful = value.sucess?.not() == false
        val isUserCaller = value.caller == USER_CALLER

        return when {
            isSuccessful && isUserCaller -> R.drawable.ic_outgoing_received_call
            isSuccessful -> R.drawable.ic_incoming_received_call
            isUserCaller -> R.drawable.ic_outgoing_missed_call
            else -> R.drawable.ic_incoming_missed_call
        }
    }

    /**
     * Gets the time duration formatted in minutes and seconds
     * @param duration Call duration, in seconds
     * @return Formatted string with call duration
     */
    private fun getFormattedCallDuration(duration: Long): String {
        val minutes = TimeUnit.SECONDS.toMinutes(duration).toInt()
        val seconds = (duration % 60).toInt()

        val formatRes = if (minutes > 0) R.string.video_call_duration else R.string.video_call_duration_no_minutes

        return itemView.context.getString(formatRes, minutes, seconds)
    }
}