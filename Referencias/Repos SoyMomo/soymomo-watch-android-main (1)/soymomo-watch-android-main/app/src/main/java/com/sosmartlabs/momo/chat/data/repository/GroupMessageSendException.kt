package com.sosmartlabs.momo.chat.data.repository

class GroupMessageSendException(
    val ulid: String,
    val retryable: Boolean,
    message: String,
    cause: Throwable? = null
) : Exception(message, cause)
