package com.sosmartlabs.momotabletpadres.utils

import android.content.Context
import com.sosmartlabs.momotabletpadres.GlobalConstants
import java.io.File

class AndroidIconHelper(val context: Context) {

    fun getFileAppIcon(packageName: String): File {
        val iconsDir = context.getDir(GlobalConstants.USERS_DATA_DIR, Context.MODE_PRIVATE)
        val iconPath = "${packageName}.png"
        return File(iconsDir, iconPath)
    }

}