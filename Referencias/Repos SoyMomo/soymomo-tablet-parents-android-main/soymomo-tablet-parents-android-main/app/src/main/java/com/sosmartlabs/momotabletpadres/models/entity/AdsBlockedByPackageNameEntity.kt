package com.sosmartlabs.momotabletpadres.models.entity

data class AdsBlockedByPackageNameEntity (
    val appName: String,
    val packageName: String,
    val blockCounter: Int,
    val category: String,
)