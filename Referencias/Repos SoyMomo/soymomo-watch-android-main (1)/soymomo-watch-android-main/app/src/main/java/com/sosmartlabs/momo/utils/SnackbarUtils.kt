package com.sosmartlabs.momo.utils

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.view.View
import android.widget.Toast
import androidx.core.content.ContextCompat
import com.google.android.material.snackbar.Snackbar
import com.sosmartlabs.momo.R

/**
 * @author mrg
 * @date 11/20/17
 */

class SnackbarUtils {
    companion object {
        fun showNotConnected(context: Context, view: View) {
            val snackbar = Snackbar.make(
                view,
                context.getString(R.string.snackbar_momo_disconnected),
                Snackbar.LENGTH_LONG
            )
            snackbar.setActionTextColor(Color.WHITE)
            snackbar.setAction(context.getString(R.string.snackbar_action_learn_more)) {
                try {
                    val intent = Intent(Intent.ACTION_VIEW)
                    intent.data = Uri.parse("https://soymomo.zendesk.com/hc/articles/360011475474")
                    context.startActivity(intent)
                } catch (e: ActivityNotFoundException) {
                    Toast.makeText(context, R.string.toast_error_opening_url, Toast.LENGTH_LONG)
                        .show()
                }
            }
            snackbar.view.setBackgroundColor(ContextCompat.getColor(context, R.color.colorAccent))
            snackbar.show()
        }
    }
}