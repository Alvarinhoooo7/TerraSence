package com.sosmartlabs.momotabletpadres.models

import android.app.Activity
import android.graphics.drawable.Drawable

data class Setting (val name: String, val appIcon: Drawable,val activity:Activity): Comparable<Setting> {
    override fun compareTo(other: Setting): Int {
        return name.compareTo(other.name)
    }

    override fun toString(): String {
        return "App Name: $name"
    }
}