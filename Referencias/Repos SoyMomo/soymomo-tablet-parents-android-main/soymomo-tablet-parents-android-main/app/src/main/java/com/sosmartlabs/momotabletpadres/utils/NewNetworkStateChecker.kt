package com.sosmartlabs.momotabletpadres.utils

import android.content.Context
import android.net.ConnectivityManager

class NewNetworkStateChecker{
    companion object {
        fun isThereInternetConnection(context: Context): Boolean {
            val isConnected: Boolean
            val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
            val networkInfo = connectivityManager.activeNetworkInfo
            isConnected = networkInfo != null && networkInfo.isConnectedOrConnecting
            return isConnected
        }
    }
}