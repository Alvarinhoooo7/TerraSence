package com.sosmartlabs.momo.chat.presentation.adapter

import com.sosmartlabs.momo.chat.data.local.entity.ChatEntity
import org.junit.Assert.assertEquals
import org.junit.Test
import java.util.concurrent.TimeUnit

class ChatMessageSpacingTest {

    @Test
    fun `compacts both sides for same sender messages inside five minutes`() {
        val baseTimestamp = TimeUnit.MINUTES.toMillis(20)
        val messages = listOf(
            message(id = "newer", createdAt = baseTimestamp + TimeUnit.MINUTES.toMillis(4)),
            message(id = "current", createdAt = baseTimestamp),
            message(id = "older", createdAt = baseTimestamp - TimeUnit.MINUTES.toMillis(4))
        )

        val spacing = ChatMessageSpacing.calculate(position = 1, messages = messages)

        assertEquals(MessageSpacing(compactTop = true, compactBottom = true), spacing)
    }

    @Test
    fun `shows timestamp only on newest bottom message in same sender cluster`() {
        val baseTimestamp = TimeUnit.MINUTES.toMillis(20)
        val messages = listOf(
            message(id = "newest", createdAt = baseTimestamp + TimeUnit.MINUTES.toMillis(4)),
            message(id = "middle", createdAt = baseTimestamp),
            message(id = "oldest", createdAt = baseTimestamp - TimeUnit.MINUTES.toMillis(4))
        )

        assertEquals(true, ChatMessageSpacing.calculate(position = 0, messages = messages).showTimestamp)
        assertEquals(false, ChatMessageSpacing.calculate(position = 1, messages = messages).showTimestamp)
        assertEquals(false, ChatMessageSpacing.calculate(position = 2, messages = messages).showTimestamp)
    }

    @Test
    fun `shows group sender header only on oldest top message in same sender cluster`() {
        val baseTimestamp = TimeUnit.MINUTES.toMillis(20)
        val messages = listOf(
            message(id = "newest", createdAt = baseTimestamp + TimeUnit.MINUTES.toMillis(4)),
            message(id = "middle", createdAt = baseTimestamp),
            message(id = "oldest", createdAt = baseTimestamp - TimeUnit.MINUTES.toMillis(4))
        )

        assertEquals(false, ChatMessageSpacing.calculate(position = 0, messages = messages).showGroupSenderHeader)
        assertEquals(false, ChatMessageSpacing.calculate(position = 1, messages = messages).showGroupSenderHeader)
        assertEquals(true, ChatMessageSpacing.calculate(position = 2, messages = messages).showGroupSenderHeader)
    }

    @Test
    fun `shows bubble tail only on oldest top message in same sender cluster`() {
        val baseTimestamp = TimeUnit.MINUTES.toMillis(20)
        val messages = listOf(
            message(id = "newest", createdAt = baseTimestamp + TimeUnit.MINUTES.toMillis(4)),
            message(id = "middle", createdAt = baseTimestamp),
            message(id = "oldest", createdAt = baseTimestamp - TimeUnit.MINUTES.toMillis(4))
        )

        assertEquals(false, ChatMessageSpacing.calculate(position = 0, messages = messages).showBubbleTail)
        assertEquals(false, ChatMessageSpacing.calculate(position = 1, messages = messages).showBubbleTail)
        assertEquals(true, ChatMessageSpacing.calculate(position = 2, messages = messages).showBubbleTail)
    }

    @Test
    fun `shows bubble tail for standalone messages`() {
        val messages = listOf(message(id = "standalone"))

        val spacing = ChatMessageSpacing.calculate(position = 0, messages = messages)

        assertEquals(true, spacing.showBubbleTail)
    }

    @Test
    fun `does not compact messages from different senders`() {
        val messages = listOf(
            message(id = "newer", sender = ChatEntity.SENDER_APP),
            message(id = "current", sender = ChatEntity.SENDER_WATCH)
        )

        val spacing = ChatMessageSpacing.calculate(position = 1, messages = messages)

        assertEquals(MessageSpacing(), spacing)
        assertEquals(true, spacing.showTimestamp)
        assertEquals(true, spacing.showGroupSenderHeader)
        assertEquals(true, spacing.showBubbleTail)
    }

    @Test
    fun `does not compact messages outside five minutes`() {
        val baseTimestamp = TimeUnit.MINUTES.toMillis(20)
        val messages = listOf(
            message(id = "newer", createdAt = baseTimestamp + TimeUnit.MINUTES.toMillis(6)),
            message(id = "current", createdAt = baseTimestamp)
        )

        val spacing = ChatMessageSpacing.calculate(position = 1, messages = messages)

        assertEquals(MessageSpacing(), spacing)
    }

    @Test
    fun `does not compact across separator rows`() {
        val messages = listOf(
            message(id = "newer"),
            message(id = "separator", type = ChatEntity.TYPE_SEPARATOR),
            message(id = "current")
        )

        val spacing = ChatMessageSpacing.calculate(position = 2, messages = messages)

        assertEquals(MessageSpacing(), spacing)
    }

    @Test
    fun `keeps group senders separated when incoming messages are from different members`() {
        val messages = listOf(
            message(id = "newer", receiver = "member-b"),
            message(id = "current", receiver = "member-a")
        )

        val spacing = ChatMessageSpacing.calculate(position = 1, messages = messages)

        assertEquals(MessageSpacing(), spacing)
    }

    @Test
    fun `uses media compact margin when a cluster edge touches image or video`() {
        val messages = listOf(
            message(id = "newer-text", type = ChatEntity.TYPE_TEXT),
            message(id = "current-image", type = ChatEntity.TYPE_IMAGE),
            message(id = "older-video", type = ChatEntity.TYPE_VIDEO)
        )

        val spacing = ChatMessageSpacing.calculate(position = 1, messages = messages)

        assertEquals(MessageSpacing(
            compactTop = true,
            compactBottom = true,
            useMediaTopMargin = true,
            useMediaBottomMargin = true
        ), spacing)
    }

    private fun message(
        id: String,
        createdAt: Long = TimeUnit.MINUTES.toMillis(20),
        sender: String = ChatEntity.SENDER_WATCH,
        receiver: String = "member-a",
        type: String = ChatEntity.TYPE_TEXT
    ): ChatEntity {
        return ChatEntity(
            id = id,
            chatId = "chat-id",
            createdAt = createdAt,
            sender = sender,
            receiver = receiver,
            status = ChatEntity.STATUS_SENT,
            type = type,
            audio = null,
            audioDuration = null,
            image = null,
            text = "hello",
            video = null,
            isIsolatedAudio = false
        )
    }
}
