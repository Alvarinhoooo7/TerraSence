package com.sosmartlabs.momotabletpadres.utils

import android.content.ComponentName
import android.content.Context
import android.content.pm.PackageManager
import androidx.core.content.FileProvider

class FileProviderHelper {
    companion object {
        fun getFileProviderAuthority(applicationContext: Context) : String {
            val component = ComponentName(applicationContext, FileProvider::class.java)
            val info = applicationContext.packageManager.getProviderInfo(component,
                PackageManager.GET_META_DATA)
            return info.authority
        }
    }
}