package com.sosmartlabs.momo.chat.data.repository

internal enum class ChatBackend {
    LEGACY_MESSAGE,
    CHAT_USER
}

internal data class ChatBackendResolutionInput(
    val hasModelField: Boolean,
    val modelValue: Int?,
    val legacyCacheCount: Int = 0,
    val chatUserCacheCount: Int = 0
)

internal object ChatBackendResolver {
    private val chatUserModelValues = setOf(6, 8, 9)

    fun resolve(input: ChatBackendResolutionInput): ChatBackend {
        val defaultBackend = when {
            !input.hasModelField -> ChatBackend.CHAT_USER
            input.modelValue in chatUserModelValues -> ChatBackend.CHAT_USER
            input.modelValue != null && input.modelValue > 9 -> ChatBackend.CHAT_USER
            else -> ChatBackend.LEGACY_MESSAGE
        }

        if (shouldApplyCacheOverride(input)) {
            val hasLegacyCache = input.legacyCacheCount > 0
            val hasChatUserCache = input.chatUserCacheCount > 0
            if (hasLegacyCache && !hasChatUserCache) {
                return ChatBackend.LEGACY_MESSAGE
            }
            if (hasChatUserCache && !hasLegacyCache) {
                return ChatBackend.CHAT_USER
            }
        }

        return defaultBackend
    }

    fun isUnknownModelInt(modelValue: Int?): Boolean {
        return modelValue != null && modelValue !in 0..9
    }

    fun shouldUseCacheHints(hasModelField: Boolean, modelValue: Int?): Boolean {
        return !hasModelField || (modelValue != null && modelValue > 9)
    }

    private fun shouldApplyCacheOverride(input: ChatBackendResolutionInput): Boolean {
        return shouldUseCacheHints(input.hasModelField, input.modelValue)
    }
}
