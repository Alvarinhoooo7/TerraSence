package com.sosmartlabs.momotabletpadres.security

/**
 * Result of a device key fetch operation.
 */
data class DeviceKeyResult(
    val deviceKey: String,
    val keyVersion: Int,
    val keyAlg: String,
    val deviceObjectId: String
)