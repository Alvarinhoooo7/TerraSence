package com.sosmartlabs.momo.chat.presentation.model

import com.sosmartlabs.momo.chat.data.local.entity.ChatEntity
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.TimeZone

object ChatDateSeparatorBuilder {

    fun build(
        messages: List<UnifiedMessageItem>,
        todayLabel: String,
        yesterdayLabel: String,
        timeZone: TimeZone = TimeZone.getDefault(),
        locale: Locale = Locale.getDefault(),
        nowTimestamp: Long = System.currentTimeMillis()
    ): List<UnifiedMessageItem> {
        val realMessages = messages.filterNot { it.isSeparator || it.type == ChatEntity.TYPE_SEPARATOR }
        if (realMessages.isEmpty()) {
            return emptyList()
        }

        val separatedMessages = mutableListOf<UnifiedMessageItem>()
        var currentDay: DayContext? = null
        var currentDayKey: String? = null
        var currentDayOldestTimestamp = 0L

        realMessages.forEach { message ->
            val messageDay = buildDayContext(
                timestamp = message.timestamp,
                timeZone = timeZone,
                locale = locale
            )

            val previousDay = currentDay
            if (previousDay != null && messageDay.key != currentDayKey) {
                separatedMessages.add(
                    buildSeparator(
                        day = previousDay,
                        timestamp = currentDayOldestTimestamp,
                        nowTimestamp = nowTimestamp,
                        timeZone = timeZone,
                        locale = locale,
                        todayLabel = todayLabel,
                        yesterdayLabel = yesterdayLabel
                    )
                )
            }

            if (currentDay == null || messageDay.key != currentDayKey) {
                currentDay = messageDay
                currentDayKey = messageDay.key
            }

            separatedMessages.add(message)
            currentDayOldestTimestamp = message.timestamp
        }

        val finalDay = currentDay
        if (finalDay != null) {
            separatedMessages.add(
                buildSeparator(
                    day = finalDay,
                    timestamp = currentDayOldestTimestamp,
                    nowTimestamp = nowTimestamp,
                    timeZone = timeZone,
                    locale = locale,
                    todayLabel = todayLabel,
                    yesterdayLabel = yesterdayLabel
                )
            )
        }

        return separatedMessages
    }

    fun latestRealMessageTimestamp(messages: List<UnifiedMessageItem>): Long {
        return messages.asSequence()
            .filterNot { it.isSeparator || it.type == ChatEntity.TYPE_SEPARATOR }
            .maxOfOrNull(UnifiedMessageItem::timestamp)
            ?: 0L
    }

    private fun buildSeparator(
        day: DayContext,
        timestamp: Long,
        nowTimestamp: Long,
        timeZone: TimeZone,
        locale: Locale,
        todayLabel: String,
        yesterdayLabel: String
    ): UnifiedMessageItem {
        return UnifiedMessageItem(
            id = "separator:${day.key}",
            timestamp = timestamp,
            senderId = "",
            senderName = "",
            isMine = false,
            type = ChatEntity.TYPE_SEPARATOR,
            text = formatLabel(
                day = day,
                nowTimestamp = nowTimestamp,
                timeZone = timeZone,
                locale = locale,
                todayLabel = todayLabel,
                yesterdayLabel = yesterdayLabel
            ),
            status = ChatEntity.STATUS_SENT,
            isSeparator = true
        )
    }

    private fun formatLabel(
        day: DayContext,
        nowTimestamp: Long,
        timeZone: TimeZone,
        locale: Locale,
        todayLabel: String,
        yesterdayLabel: String
    ): String {
        val today = buildDayContext(
            timestamp = nowTimestamp,
            timeZone = timeZone,
            locale = locale
        )
        val yesterday = buildDayContext(
            timestamp = calendarFor(nowTimestamp, timeZone, locale).apply {
                add(Calendar.DAY_OF_YEAR, -1)
            }.timeInMillis,
            timeZone = timeZone,
            locale = locale
        )

        return when {
            day.key == today.key -> todayLabel
            day.key == yesterday.key -> yesterdayLabel
            day.year == today.year -> dateFormatter("EEEE, MMMM d", locale, timeZone).format(Date(day.anchorTimestamp))
            else -> dateFormatter("EEEE, MMMM d, yyyy", locale, timeZone).format(Date(day.anchorTimestamp))
        }
    }

    private fun buildDayContext(
        timestamp: Long,
        timeZone: TimeZone,
        locale: Locale
    ): DayContext {
        val calendar = calendarFor(timestamp, timeZone, locale)
        return DayContext(
            key = dateFormatter("yyyy-MM-dd", Locale.ROOT, timeZone).format(Date(timestamp)),
            year = calendar.get(Calendar.YEAR),
            anchorTimestamp = timestamp
        )
    }

    private fun calendarFor(timestamp: Long, timeZone: TimeZone, locale: Locale): Calendar {
        return Calendar.getInstance(timeZone, locale).apply {
            timeInMillis = timestamp
        }
    }

    private fun dateFormatter(pattern: String, locale: Locale, timeZone: TimeZone): SimpleDateFormat {
        return SimpleDateFormat(pattern, locale).apply {
            this.timeZone = timeZone
        }
    }

    private data class DayContext(
        val key: String,
        val year: Int,
        val anchorTimestamp: Long
    )
}
