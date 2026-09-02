package com.sosmartlabs.momo.chat.data.repository

import com.sosmartlabs.momo.chat.data.local.entity.GroupMessageEntity
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class GroupMessageSyncResolverTest {

    @Test
    fun `normalize promotes ulid to local id and preserves legacy remote id`() {
        val normalized = GroupMessageSyncResolver.normalize(
            message(
                id = "parse-object-id",
                remoteId = null,
                ulid = "01HXYZULID"
            )
        )

        assertEquals("01HXYZULID", normalized.id)
        assertEquals("01HXYZULID", normalized.ulid)
        assertEquals("parse-object-id", normalized.remoteId)
    }

    @Test
    fun `merge upgrades remote metadata and preserves local waveform fields`() {
        val existing = message(
            id = "01HXYZULID",
            remoteId = null,
            ulid = "01HXYZULID",
            createdAt = 2_000L,
            status = GroupMessageEntity.STATUS_ERROR,
            audio = "file:///tmp/local.m4a",
            audioDuration = 12_345L,
            audioWaveform = "1,2,3"
        )
        val incoming = message(
            id = "01HXYZULID",
            remoteId = "parse-object-id",
            ulid = "01HXYZULID",
            createdAt = 3_000L,
            status = GroupMessageEntity.STATUS_SENT,
            audio = "https://cdn.example.com/audio.m4a",
            audioDuration = null,
            audioWaveform = null
        )

        val merged = GroupMessageSyncResolver.merge(existing, incoming)

        assertEquals("01HXYZULID", merged.id)
        assertEquals("parse-object-id", merged.remoteId)
        assertEquals(GroupMessageEntity.STATUS_SENT, merged.status)
        assertEquals("https://cdn.example.com/audio.m4a", merged.audio)
        assertEquals(12_345L, merged.audioDuration)
        assertEquals("1,2,3", merged.audioWaveform)
        assertEquals(2_000L, merged.createdAt)
    }

    @Test
    fun `acknowledgeLocalSend promotes sending state to sent`() {
        val acknowledged = GroupMessageSyncResolver.acknowledgeLocalSend(
            message(
                id = "01HXYZULID",
                remoteId = "parse-object-id",
                ulid = "01HXYZULID",
                status = GroupMessageEntity.STATUS_SENDING
            )
        )

        assertEquals(GroupMessageEntity.STATUS_SENT, acknowledged.status)
        assertEquals("parse-object-id", acknowledged.remoteId)
    }

    @Test
    fun `merge keeps local sent status when late remote snapshot still says sending`() {
        val existing = message(
            id = "01HXYZULID",
            remoteId = "parse-object-id",
            ulid = "01HXYZULID",
            status = GroupMessageEntity.STATUS_SENT
        )
        val incoming = message(
            id = "01HXYZULID",
            remoteId = "parse-object-id",
            ulid = "01HXYZULID",
            status = GroupMessageEntity.STATUS_SENDING
        )

        val merged = GroupMessageSyncResolver.merge(existing, incoming)

        assertEquals(GroupMessageEntity.STATUS_SENT, merged.status)
    }

    @Test
    fun `merge adopts rewritten server ulid while preserving local metadata`() {
        val existing = message(
            id = "01CLIENTULID",
            remoteId = null,
            ulid = "01CLIENTULID",
            status = GroupMessageEntity.STATUS_SENDING,
            audio = "file:/tmp/local.m4a",
            audioDuration = 42_000L,
            audioWaveform = "1,3,5"
        )
        val incoming = message(
            id = "01SERVERULID",
            remoteId = "parse-object-id",
            ulid = "01SERVERULID",
            status = GroupMessageEntity.STATUS_SENT,
            audio = "https://cdn.example.com/audio.m4a"
        )

        val merged = GroupMessageSyncResolver.merge(existing, incoming)

        assertEquals("01SERVERULID", merged.id)
        assertEquals("01SERVERULID", merged.ulid)
        assertEquals("parse-object-id", merged.remoteId)
        assertEquals(GroupMessageEntity.STATUS_SENT, merged.status)
        assertEquals("https://cdn.example.com/audio.m4a", merged.audio)
        assertEquals(42_000L, merged.audioDuration)
        assertEquals("1,3,5", merged.audioWaveform)
    }

    @Test
    fun `collapse keeps one row per ulid`() {
        val pending = message(
            id = "01HXYZULID",
            remoteId = null,
            ulid = "01HXYZULID",
            status = GroupMessageEntity.STATUS_SENDING,
            text = "hello"
        )
        val ack = message(
            id = "01HXYZULID",
            remoteId = "parse-object-id",
            ulid = "01HXYZULID",
            status = GroupMessageEntity.STATUS_SENT,
            text = "hello"
        )

        val collapsed = GroupMessageSyncResolver.collapse(listOf(pending, ack))

        assertEquals(1, collapsed.size)
        assertEquals("01HXYZULID", collapsed.single().id)
        assertEquals("parse-object-id", collapsed.single().remoteId)
        assertEquals(GroupMessageEntity.STATUS_SENT, collapsed.single().status)
    }

    @Test
    fun `collapse keeps legacy row when ulid is missing`() {
        val collapsed = GroupMessageSyncResolver.collapse(
            listOf(
                message(
                    id = "legacy-object-id",
                    remoteId = null,
                    ulid = null
                )
            )
        )

        assertEquals(1, collapsed.size)
        assertEquals("legacy-object-id", collapsed.single().id)
        assertNull(collapsed.single().ulid)
        assertEquals("legacy-object-id", collapsed.single().remoteId)
    }

    private fun message(
        id: String,
        remoteId: String? = "parse-object-id",
        ulid: String? = "01HXYZULID",
        createdAt: Long = 1_000L,
        status: String = GroupMessageEntity.STATUS_SENDING,
        text: String? = null,
        audio: String? = null,
        audioDuration: Long? = null,
        image: String? = null,
        audioWaveform: String? = null
    ): GroupMessageEntity {
        return GroupMessageEntity(
            id = id,
            remoteId = remoteId,
            groupId = "group-id",
            createdAt = createdAt,
            sender = GroupMessageEntity.SENDER_USER,
            senderId = "sender-id",
            senderName = "Sender",
            senderAvatar = null,
            type = when {
                audio != null -> GroupMessageEntity.TYPE_AUDIO
                image != null -> GroupMessageEntity.TYPE_IMAGE
                else -> GroupMessageEntity.TYPE_TEXT
            },
            text = text,
            audio = audio,
            audioDuration = audioDuration,
            image = image,
            video = null,
            status = status,
            ulid = ulid,
            audioWaveform = audioWaveform
        )
    }
}
