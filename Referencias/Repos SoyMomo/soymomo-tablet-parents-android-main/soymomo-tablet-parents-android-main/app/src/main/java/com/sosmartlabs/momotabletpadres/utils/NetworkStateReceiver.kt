package com.sosmartlabs.momotabletpadres.utils

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.net.ConnectivityManager
import android.net.NetworkInfo

/**
 * @author mrg
 * @date 10/4/17
 */

class NetworkStateReceiver(private val listener: NetworkStateListener) : BroadcastReceiver() {
    private var isConnected = true

    override fun onReceive(context: Context, intent: Intent?) {
        if (intent == null || intent.extras == null) return
        val manager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val ni = manager.activeNetworkInfo
        if (ni?.state == NetworkInfo.State.CONNECTED) {
            isConnected = true
        } else if (intent.getBooleanExtra(ConnectivityManager.EXTRA_NO_CONNECTIVITY, false)) {
            isConnected = false
        }
        notifyState()
    }

    private fun notifyState() {
        if(isConnected) listener.onNetworkAvailable() else listener.onNetworkUnavailable()
    }

    interface NetworkStateListener {
        fun onNetworkAvailable()
        fun onNetworkUnavailable()
    }
}
