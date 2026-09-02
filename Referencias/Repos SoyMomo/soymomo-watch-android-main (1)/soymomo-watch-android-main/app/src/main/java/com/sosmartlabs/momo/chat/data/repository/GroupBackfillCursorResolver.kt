package com.sosmartlabs.momo.chat.data.repository

import com.sosmartlabs.momo.chat.data.remote.model.GroupMessage

internal enum class InitialBackfillCursorSource(val logValue: String) {
    INITIAL_PAGE("initial_page"),
    MERGED_FALLBACK("merged_fallback"),
    NONE("none")
}

internal data class InitialBackfillCursorSelection(
    val beforeUlid: String?,
    val source: InitialBackfillCursorSource
)

internal object GroupBackfillCursorResolver {
    fun resolveInitialBackfillCursor(
        newMessageUpdates: List<GroupMessage>,
        mergedUpdates: List<GroupMessage>
    ): InitialBackfillCursorSelection {
        return resolveInitialBackfillCursorFromUlids(
            newMessageUlids = newMessageUpdates.map { it.ulid },
            mergedUlids = mergedUpdates.map { it.ulid }
        )
    }
    internal fun resolveInitialBackfillCursorFromUlids(
        newMessageUlids: List<String?>,
        mergedUlids: List<String?>
    ): InitialBackfillCursorSelection {
        val initialPageCursor = oldestUlidOrNull(newMessageUlids)
        if (initialPageCursor != null) {
            return InitialBackfillCursorSelection(
                beforeUlid = initialPageCursor,
                source = InitialBackfillCursorSource.INITIAL_PAGE
            )
        }

        val mergedFallbackCursor = oldestUlidOrNull(mergedUlids)
        if (mergedFallbackCursor != null) {
            return InitialBackfillCursorSelection(
                beforeUlid = mergedFallbackCursor,
                source = InitialBackfillCursorSource.MERGED_FALLBACK
            )
        }

        return InitialBackfillCursorSelection(
            beforeUlid = null,
            source = InitialBackfillCursorSource.NONE
        )
    }

    private fun oldestUlidOrNull(candidates: List<String?>): String? {
        return candidates
            .mapNotNull { it?.trim()?.takeIf(String::isNotBlank) }
            .minOrNull()
    }
}
