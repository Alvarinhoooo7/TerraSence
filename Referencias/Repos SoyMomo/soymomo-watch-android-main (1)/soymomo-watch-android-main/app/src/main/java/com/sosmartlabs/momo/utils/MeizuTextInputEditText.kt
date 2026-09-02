package com.sosmartlabs.momo.utils

import android.content.Context
import android.os.Build
import android.util.AttributeSet
import android.widget.TextView
import com.google.android.material.textfield.TextInputEditText
import java.util.*

class MeizuTextInputEditText(context: Context, attrs: AttributeSet?) : TextInputEditText(context, attrs){
    override fun getHint(): CharSequence? {
        val manufacturer = Build.MANUFACTURER.uppercase(Locale.getDefault())
        return if (!manufacturer.contains("MEIZU") || Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            super.getHint()
        } else {
            try {
                getSuperHintHack()
            } catch (e: Exception) {
                super.getHint()
            }
        }
    }

    private fun getSuperHintHack(): CharSequence {
        val hintField = TextView::class.java.getDeclaredField("mHint")
        hintField.isAccessible = true
        return hintField.get(this) as CharSequence
    }
}