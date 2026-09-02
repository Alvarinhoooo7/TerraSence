package com.sosmartlabs.momo.models

data class UserPermissionFeature(
    val icon: Int,
    val title: Int,
    val switchStatePermission: Boolean,
    val description: Int = 0
) {
    fun isSamePermission(other: UserPermissionFeature): Boolean {
        return icon == other.icon && title == other.title
    }
}