package com.sosmartlabs.momo.chat.presentation.model

import com.sosmartlabs.momo.chat.data.local.entity.ChatEntity
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.Calendar
import java.util.Locale
import java.util.TimeZone

class ChatDateSeparatorBuilderTest {

    private val timeZone: TimeZone = TimeZone.getTimeZone("America/Santiago")
    private val todayTimestamp: Long = atMillis(2026, 4, 20, 12, 0)

    @Test
    fun `build returns empty list for empty messages`() {
        val result = ChatDateSeparatorBuilder.build(
            messages = emptyList(),
            todayLabel = "Today",
            yesterdayLabel = "Yesterday",
            timeZone = timeZone,
            locale = Locale.US,
            nowTimestamp = todayTimestamp
        )

        assertTrue(result.isEmpty())
    }

    @Test
    fun `build inserts one separator for a single day bucket`() {
        val result = ChatDateSeparatorBuilder.build(
            messages = listOf(
                message(id = "m2", timestamp = atMillis(2026, 4, 20, 12, 0)),
                message(id = "m1", timestamp = atMillis(2026, 4, 20, 9, 0))
            ),
            todayLabel = "Today",
            yesterdayLabel = "Yesterday",
            timeZone = timeZone,
            locale = Locale.US,
            nowTimestamp = todayTimestamp
        )

        assertEquals(listOf("m2", "m1", "separator:2026-04-20"), result.map { it.id })
        assertEquals("Today", result.last().text)
    }

    @Test
    fun `build inserts separators after each day bucket in newest first order`() {
        val result = ChatDateSeparatorBuilder.build(
            messages = listOf(
                message(id = "today-newer", timestamp = atMillis(2026, 4, 20, 20, 0)),
                message(id = "today-older", timestamp = atMillis(2026, 4, 20, 8, 0)),
                message(id = "yesterday-newer", timestamp = atMillis(2026, 4, 19, 19, 0)),
                message(id = "yesterday-older", timestamp = atMillis(2026, 4, 19, 7, 0))
            ),
            todayLabel = "Today",
            yesterdayLabel = "Yesterday",
            timeZone = timeZone,
            locale = Locale.US,
            nowTimestamp = todayTimestamp
        )

        assertEquals(
            listOf(
                "today-newer",
                "today-older",
                "separator:2026-04-20",
                "yesterday-newer",
                "yesterday-older",
                "separator:2026-04-19"
            ),
            result.map { it.id }
        )
        assertEquals(listOf("Today", "Yesterday"), result.filter { it.isSeparator }.mapNotNull { it.text })
    }

    @Test
    fun `build formats older separators without year inside current year`() {
        val result = ChatDateSeparatorBuilder.build(
            messages = listOf(
                message(id = "m1", timestamp = atMillis(2026, 4, 15, 15, 0))
            ),
            todayLabel = "Today",
            yesterdayLabel = "Yesterday",
            timeZone = timeZone,
            locale = Locale.US,
            nowTimestamp = todayTimestamp
        )

        assertEquals("Wednesday, April 15", result.last().text)
    }

    @Test
    fun `build formats older separators with year outside current year`() {
        val result = ChatDateSeparatorBuilder.build(
            messages = listOf(
                message(id = "m1", timestamp = atMillis(2025, 4, 15, 15, 0))
            ),
            todayLabel = "Today",
            yesterdayLabel = "Yesterday",
            timeZone = timeZone,
            locale = Locale.US,
            nowTimestamp = todayTimestamp
        )

        assertEquals("Tuesday, April 15, 2025", result.last().text)
    }

    @Test
    fun `build is stable across status only updates`() {
        val original = ChatDateSeparatorBuilder.build(
            messages = listOf(
                message(
                    id = "m1",
                    timestamp = atMillis(2026, 4, 20, 10, 0),
                    status = ChatEntity.STATUS_SENDING
                )
            ),
            todayLabel = "Today",
            yesterdayLabel = "Yesterday",
            timeZone = timeZone,
            locale = Locale.US,
            nowTimestamp = todayTimestamp
        )
        val updated = ChatDateSeparatorBuilder.build(
            messages = listOf(
                message(
                    id = "m1",
                    timestamp = atMillis(2026, 4, 20, 10, 0),
                    status = ChatEntity.STATUS_SENT
                )
            ),
            todayLabel = "Today",
            yesterdayLabel = "Yesterday",
            timeZone = timeZone,
            locale = Locale.US,
            nowTimestamp = todayTimestamp
        )

        assertEquals("separator:2026-04-20", original.last().id)
        assertEquals(original.last().id, updated.last().id)
        assertEquals(original.last().timestamp, updated.last().timestamp)
    }

    @Test
    fun `latestRealMessageTimestamp ignores separator rows`() {
        val messages = listOf(
            message(id = "m1", timestamp = atMillis(2026, 4, 20, 10, 0)),
            UnifiedMessageItem(
                id = "separator:2026-04-20",
                timestamp = atMillis(2026, 4, 20, 1, 0),
                senderId = "",
                senderName = "",
                isMine = false,
                type = ChatEntity.TYPE_SEPARATOR,
                text = "Today",
                status = ChatEntity.STATUS_SENT,
                isSeparator = true
            )
        )

        val latestTimestamp = ChatDateSeparatorBuilder.latestRealMessageTimestamp(messages)

        assertEquals(atMillis(2026, 4, 20, 10, 0), latestTimestamp)
    }

    private fun message(
        id: String,
        timestamp: Long,
        status: String = ChatEntity.STATUS_SENT
    ): UnifiedMessageItem {
        return UnifiedMessageItem(
            id = id,
            timestamp = timestamp,
            senderId = "sender-id",
            senderName = "Sender",
            isMine = false,
            type = ChatEntity.TYPE_TEXT,
            text = "hello",
            status = status
        )
    }

    private fun atMillis(year: Int, month: Int, day: Int, hour: Int, minute: Int): Long {
        return Calendar.getInstance(timeZone, Locale.US).apply {
            set(Calendar.YEAR, year)
            set(Calendar.MONTH, month - 1)
            set(Calendar.DAY_OF_MONTH, day)
            set(Calendar.HOUR_OF_DAY, hour)
            set(Calendar.MINUTE, minute)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }.timeInMillis
    }
}
