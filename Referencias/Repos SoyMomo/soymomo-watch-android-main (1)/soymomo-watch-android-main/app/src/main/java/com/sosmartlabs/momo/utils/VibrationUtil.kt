package com.sosmartlabs.momo.utils

import android.content.Context
import android.os.Vibrator

class VibrationUtil {

    companion object {

        fun startVibration(context: Context, pattern: LongArray) {
            val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            vibrator.vibrate(pattern, 0)
        }

        fun stopVibration(context: Context) {
            val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            vibrator.cancel()
        }
    }

}