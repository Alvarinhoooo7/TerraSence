package com.sosmartlabs.momo.chat.data.repository

import com.sosmartlabs.momo.chat.data.local.entity.GroupMessageEntity

object GroupMessageSyncResolver {

    fun normalize(message: GroupMessageEntity): GroupMessageEntity {
        val ulid = message.ulid?.takeIf { it.isNotBlank() }
        val remoteId = message.remoteId?.takeIf { it.isNotBlank() }
            ?: message.id.takeIf { it.isNotBlank() && it != ulid }

        return message.copy(
            id = GroupMessageEntity.buildId(ulid, remoteId, message.id),
            ulid = ulid,
            remoteId = remoteId
        )
    }

    fun acknowledgeLocalSend(message: GroupMessageEntity): GroupMessageEntity {
        val normalized = normalize(message)
        return when {
            GroupMessageEntity.isTerminalStatus(normalized.status) -> normalized
            normalized.status == GroupMessageEntity.STATUS_ERROR -> normalized
            else -> normalized.copy(status = GroupMessageEntity.STATUS_SENT)
        }
    }

    fun merge(existing: GroupMessageEntity, incoming: GroupMessageEntity): GroupMessageEntity {
        val normalizedExisting = normalize(existing)
        val normalizedIncoming = normalize(incoming)
        val mergedUlid = normalizedIncoming.ulid ?: normalizedExisting.ulid
        val mergedRemoteId = normalizedIncoming.remoteId ?: normalizedExisting.remoteId

        return normalizedIncoming.copy(
            id = GroupMessageEntity.buildId(mergedUlid, mergedRemoteId, normalizedIncoming.id),
            remoteId = mergedRemoteId,
            ulid = mergedUlid,
            groupId = normalizedIncoming.groupId.ifBlank { normalizedExisting.groupId },
            createdAt = resolveCreatedAt(normalizedExisting.createdAt, normalizedIncoming.createdAt),
            sender = normalizedIncoming.sender.ifBlank { normalizedExisting.sender },
            senderId = normalizedIncoming.senderId.ifBlank { normalizedExisting.senderId },
            senderName = normalizedIncoming.senderName.ifBlank { normalizedExisting.senderName },
            senderAvatar = normalizedIncoming.senderAvatar ?: normalizedExisting.senderAvatar,
            type = normalizedIncoming.type.ifBlank { normalizedExisting.type },
            text = normalizedIncoming.text ?: normalizedExisting.text,
            audio = normalizedIncoming.audio ?: normalizedExisting.audio,
            audioDuration = normalizedIncoming.audioDuration ?: normalizedExisting.audioDuration,
            image = normalizedIncoming.image ?: normalizedExisting.image,
            video = normalizedIncoming.video ?: normalizedExisting.video,
            status = resolveStatus(normalizedExisting.status, normalizedIncoming.status),
            audioWaveform = normalizedIncoming.audioWaveform ?: normalizedExisting.audioWaveform
        )
    }

    fun collapse(messages: Iterable<GroupMessageEntity>): List<GroupMessageEntity> {
        val deduped = LinkedHashMap<String, GroupMessageEntity>()

        messages.forEach { message ->
            val normalized = normalize(message)
            val key = normalized.ulid ?: normalized.remoteId ?: normalized.id
            deduped[key] = deduped[key]?.let { existing -> merge(existing, normalized) } ?: normalized
        }

        return deduped.values.toList()
    }

    private fun resolveCreatedAt(existing: Long, incoming: Long): Long {
        return when {
            existing <= 0L -> incoming
            incoming <= 0L -> existing
            else -> minOf(existing, incoming)
        }
    }

    private fun resolveStatus(existing: String, incoming: String): String {
        return when {
            incoming.isBlank() -> existing
            existing.isBlank() -> incoming
            incoming == existing -> incoming
            GroupMessageEntity.isTerminalStatus(incoming) -> incoming
            GroupMessageEntity.isTerminalStatus(existing) -> existing
            incoming == GroupMessageEntity.STATUS_ERROR -> GroupMessageEntity.STATUS_ERROR
            existing == GroupMessageEntity.STATUS_ERROR &&
                incoming == GroupMessageEntity.STATUS_SENDING -> GroupMessageEntity.STATUS_SENDING
            else -> incoming
        }
    }
}
