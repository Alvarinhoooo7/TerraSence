package com.sosmartlabs.momotabletpadres.models

data class AppDetail(val appName: String, val packageName: String, val appIcon: String, var allowed: Boolean) : Comparable<AppDetail> {
    override fun compareTo(other: AppDetail): Int {
        return appName.compareTo(other.appName)
    }

    override fun toString(): String {
        return "App Name: $appName, Package Name: $packageName, Allowed: $allowed"
    }
}