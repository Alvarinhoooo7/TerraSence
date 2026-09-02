package com.sosmartlabs.momo.watchinfo.model

import com.google.gson.annotations.SerializedName

/**
 * Class for JSON encoded watch build info
 */
data class BuildInfo(
    @SerializedName("CODENAME") val codename: String,
    @SerializedName("FINGERPRINT") val fingerprint: String,
    @SerializedName("HARDWARE") val hardware: String,
    @SerializedName("RADIO") val radio: String,
    @SerializedName("BOARD") val board: String,
    @SerializedName("INCREMENTAL") val incremental: String,
    @SerializedName("PRODUCT") val product: String,
    @SerializedName("DISPLAY") val display: String,
    @SerializedName("SDK") val sdk: String,
    @SerializedName("HOS") val hos: String,
    @SerializedName("USER") val user: String,
    @SerializedName("DEVICE") val device: String,
    @SerializedName("TAGS") val tags: String,
    @SerializedName("MODEL") val model: String,
    @SerializedName("BOOTLOADER") val bootloader: String,
    @SerializedName("CPU_ABI") val cpuAbi: String,
    @SerializedName("CPU_ABI2") val cpuAbi2: String,
    @SerializedName("ID") val id: String,
    @SerializedName("RELEASE") val release: String,
    @SerializedName("PARTITION_NAME_SYSTEM") val partitionNameSystem: String,
    @SerializedName("MANUFACTURER") val manufacturer: String,
    @SerializedName("BRAND") val brand: String,
    @SerializedName("TYPE") val type: String,
    @SerializedName("buildNumber") val buildNumber: String,
)
