package com.sosmartlabs.momo.chat.presentation.common

import android.content.Context
import com.sosmartlabs.momo.R
import java.text.DateFormat
import java.util.Date

object ChatTimeFormatter {
    private const val ONE_MINUTE_MS = 60_000L
    private const val ONE_HOUR_MS = 60 * ONE_MINUTE_MS
    private const val ONE_DAY_MS = 24 * ONE_HOUR_MS
    private const val ONE_WEEK_MS = 7 * ONE_DAY_MS

    fun formatRelative(
        context: Context,
        timestamp: Long,
        now: Long = System.currentTimeMillis()
    ): String {
        if (timestamp <= 0L) {
            return context.getString(R.string.chat_time_placeholder)
        }

        val diff = (now - timestamp).coerceAtLeast(0L)
        return when {
            diff < ONE_MINUTE_MS -> context.getString(R.string.chat_relative_now)
            diff < ONE_HOUR_MS -> context.getString(
                R.string.chat_relative_minutes_short,
                diff / ONE_MINUTE_MS
            )

            diff < ONE_DAY_MS -> context.getString(
                R.string.chat_relative_hours_short,
                diff / ONE_HOUR_MS
            )

            diff < ONE_WEEK_MS -> context.getString(
                R.string.chat_relative_days_short,
                diff / ONE_DAY_MS
            )

            else -> runCatching {
                DateFormat.getDateInstance(DateFormat.SHORT).format(Date(timestamp))
            }.getOrElse {
                context.getString(R.string.chat_time_placeholder)
            }
        }
    }
}
