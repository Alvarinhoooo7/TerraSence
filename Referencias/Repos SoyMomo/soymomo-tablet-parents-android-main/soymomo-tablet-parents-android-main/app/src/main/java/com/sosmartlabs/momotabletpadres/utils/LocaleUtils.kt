package com.sosmartlabs.momotabletpadres.utils

import android.os.Build
import java.util.*

class LocaleUtils{
    companion object{
        /**
         * Use this instead of: fun getCurrentLocale(context: Context): Locale, since
         * it requires a higher APK level.
         */
        fun getCurrentLocale(): Locale {
            return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N){
                Locale.getDefault(Locale.Category.FORMAT)
            } else{
                Locale.getDefault()
            }
        }
    }
}