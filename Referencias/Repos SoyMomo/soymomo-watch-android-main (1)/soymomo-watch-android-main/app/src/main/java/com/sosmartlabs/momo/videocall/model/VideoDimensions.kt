package com.sosmartlabs.momo.videocall.model

data class VideoDimensions(
    val width: Int,
    val height: Int
) {
    fun isValid(): Boolean = width > 0 && height > 0
}
