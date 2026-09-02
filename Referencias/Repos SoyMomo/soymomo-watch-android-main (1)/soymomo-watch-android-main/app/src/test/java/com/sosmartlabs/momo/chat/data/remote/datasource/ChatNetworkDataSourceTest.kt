package com.sosmartlabs.momo.chat.data.remote.datasource

import com.sosmartlabs.momo.chat.data.local.entity.ChatEntity
import com.sosmartlabs.momo.chat.data.local.entity.ChatWebUpdate
import org.junit.Assert.assertEquals
import org.junit.Test

class ChatNetworkDataSourceTest {

    @Test
    fun `acknowledgeDirectChatSend promotes sending to sent`() {
        val acknowledged = acknowledgeDirectChatSend(
            update(status = ChatEntity.STATUS_SENDING)
        )

        assertEquals(ChatEntity.STATUS_SENT, acknowledged.status)
    }

    @Test
    fun `acknowledgeDirectChatSend preserves received status`() {
        val acknowledged = acknowledgeDirectChatSend(
            update(status = ChatEntity.STATUS_RECEIVED)
        )

        assertEquals(ChatEntity.STATUS_RECEIVED, acknowledged.status)
    }

    @Test
    fun `acknowledgeDirectChatSend preserves error status`() {
        val acknowledged = acknowledgeDirectChatSend(
            update(status = ChatEntity.STATUS_ERROR)
        )

        assertEquals(ChatEntity.STATUS_ERROR, acknowledged.status)
    }

    private fun update(status: String): ChatWebUpdate {
        return ChatWebUpdate(
            id = "watch_123",
            chatId = "chat_123",
            createdAt = 123L,
            sender = ChatEntity.SENDER_APP,
            receiver = "watch",
            type = ChatEntity.TYPE_TEXT,
            status = status,
            text = "hello",
            image = null,
            audio = null,
            video = null,
            isIsolatedAudio = false
        )
    }
}
