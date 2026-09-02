package com.sosmartlabs.momotabletpadres.utils

import android.app.AlertDialog
import android.content.Context
import com.sosmartlabs.momotabletpadres.R

class ErrorHandlers {

    companion object {

        fun alertDialog(mContext:Context, message: String) {
            val builder = AlertDialog.Builder(mContext)
            builder.setTitle("There was an error")
            builder.setMessage(message)
            builder.setNeutralButton("Ok") { dialog, which -> }
            builder.show()
        }

        fun noConnectionDialog(mContext:Context, message: String?) {
            val builder = AlertDialog.Builder(mContext)
            builder.setTitle(mContext.getString(R.string.internet_connection_disabled))
            if (message != null) {
                builder.setMessage(message)
            }
            builder.setNeutralButton("Ok") { dialog, which -> }
            builder.show()
        }

    }

}