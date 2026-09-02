package com.sosmartlabs.momo.utils

import android.content.Context
import android.util.Patterns.EMAIL_ADDRESS
import android.view.View
import android.view.inputmethod.InputMethodManager

object ValidationToUserProfile {

    fun String.isValidEmail() = isNotEmpty() || EMAIL_ADDRESS.matcher(this).matches()
    fun String.isValidData() = isNotEmpty() && isNotBlank()

    fun hideKeyboard(view: View, context: Context) {
        val imm = context.getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager
        imm.hideSoftInputFromWindow(view.applicationWindowToken, 0)
    }
}