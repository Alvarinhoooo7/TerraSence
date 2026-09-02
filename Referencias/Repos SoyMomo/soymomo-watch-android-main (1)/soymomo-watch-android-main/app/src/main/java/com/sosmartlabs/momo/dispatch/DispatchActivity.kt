package com.sosmartlabs.momo.dispatch

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.widget.Toast
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.dispatch.ui.DispatchResult
import com.sosmartlabs.momo.dispatch.ui.DispatchViewModel
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.main.MainActivity
import com.sosmartlabs.momo.onboarding.OnBoardingActivity
import com.sosmartlabs.momo.session.SessionActivity
import com.sosmartlabs.momo.sharedprefs.SharedPrefs
import com.sosmartlabs.momo.utils.Constants
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber
import javax.inject.Inject

@AndroidEntryPoint
class DispatchActivity : AppCompatActivity() {

    private val dispatchViewModel: DispatchViewModel by viewModels()
    private var keepSplashOnScreen = true

    @Inject
    lateinit var sharedPrefs: SharedPrefs

    companion object {
        const val EXTRA_FROM_ADD_WATCH_FLOW = "extra_from_add_watch_flow"

        // Watch device ids are numeric (typically ~10 chars). Accept 6..32
        // alphanumeric to tolerate future schema changes while rejecting garbage.
        // Validating at the parse site keeps unvalidated, attacker-controlled
        // path segments out of Timber/Crashlytics and out of shared prefs.
        private val DEVICE_ID_REGEX = Regex("^[A-Za-z0-9]{6,32}$")
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        val splashScreen = installSplashScreen()
        super.onCreate(savedInstanceState)
        splashScreen.setKeepOnScreenCondition { keepSplashOnScreen }
        Timber.d("DispatchActivity: onCreate called")
        CrashlyticsLog.log("DispatchActivity: Creating DispatchActivity")
        captureDeepLinkIfPresent(intent)
        observeViewModel()
    }

    /**
     * If we were started by an incoming deep link
     * (soymomo-watch://link/<id> or https://soymomo.com/link/watch/<id>),
     * extract the watch deviceId and park it in shared prefs. MainActivity
     * drains it on its next onResume and launches AddFirstMomoActivity with
     * the id prefilled into the receiver-side enter-IMEI flow. Parking through
     * prefs (instead of threading intent extras) means the link survives the
     * auth dance: users who aren't signed in get routed through SessionActivity
     * first, and the pending id is still there when they finally land in Main.
     */
    private fun captureDeepLinkIfPresent(intent: Intent?) {
        val data: Uri = intent?.data ?: return
        val deviceId = parseWatchInvitationUri(data)
        if (deviceId == null) {
            Timber.d("DispatchActivity: Ignoring non-invitation Uri: $data")
            return
        }
        Timber.i("DispatchActivity: Captured deep-link deviceId=$deviceId from $data")
        CrashlyticsLog.log("DispatchActivity: Captured deep-link deviceId=$deviceId")
        sharedPrefs.setPendingInvitationDeviceId(deviceId)
    }

    private fun parseWatchInvitationUri(uri: Uri): String? {
        val scheme = uri.scheme ?: return null
        val rawDeviceId = when {
            // Custom scheme: soymomo-watch://link/<id>
            scheme.equals("soymomo-watch", ignoreCase = true) -> {
                val host = uri.host ?: return null
                if (!host.equals("link", ignoreCase = true)) return null
                uri.pathSegments.firstOrNull()
            }
            // App Link: https://soymomo.com/link/watch/<id>
            scheme.equals("https", ignoreCase = true) || scheme.equals("http", ignoreCase = true) -> {
                val host = uri.host ?: return null
                if (!host.equals("soymomo.com", ignoreCase = true)
                    && !host.equals("www.soymomo.com", ignoreCase = true)) return null
                val segments = uri.pathSegments
                if (segments.size < 3) return null
                if (!segments[0].equals("link", ignoreCase = true)) return null
                if (!segments[1].equals("watch", ignoreCase = true)) return null
                segments[2]
            }
            else -> null
        }
        // Reject anything that isn't a plausible device id before the caller logs
        // or parks it, so a crafted link can't inject arbitrary strings downstream.
        return rawDeviceId?.takeIf { DEVICE_ID_REGEX.matches(it) }
    }

    private fun observeViewModel() {
        Timber.d("DispatchActivity: observeViewModel called")
        dispatchViewModel.dispatchResult.observe(this) { result ->
            Timber.d("DispatchActivity: dispatchResult observed: $result")
            if (result != null) {
                handleResult(result)
            } else {
                Timber.w("DispatchActivity: Received null dispatch result")
                CrashlyticsLog.log("DispatchActivity: Received null dispatch result")
                keepSplashOnScreen = false
                finish()
            }
        }
    }

    private fun handleResult(result: DispatchResult) {
        Timber.d("DispatchActivity: handleResult called with result=$result")

        val intentToStart: Intent = when (result) {
            DispatchResult.OPEN_FIRST_TIME -> {
                Timber.i("DispatchActivity: DispatchResult.OPEN_FIRST_TIME - Starting OnBoardingActivity")
                Intent(this, OnBoardingActivity::class.java).apply {
                    putExtra(Constants.EXTRA_FIRST_TIME, true)
                }
            }
            DispatchResult.USER_NULL -> {
                Timber.i("DispatchActivity: DispatchResult.USER_NULL - Starting SessionActivity")
                Intent(this, SessionActivity::class.java)
            }
            DispatchResult.SESSION_EXPIRED -> {
                Timber.i("DispatchActivity: DispatchResult.SESSION_EXPIRED - Starting SessionActivity and showing toast")
                showMessage(R.string.toast_error_log_in_again)
                Intent(this, SessionActivity::class.java)
            }
            DispatchResult.NEW_USER -> {
                Timber.i("DispatchActivity: DispatchResult.NEW_USER - Starting MainActivity with EXTRA_NEW_USER")
                Intent(this, MainActivity::class.java).apply {
                    putExtra(Constants.EXTRA_NEW_USER, true)
                }
            }
            DispatchResult.START_MAIN -> {
                Timber.i("DispatchActivity: DispatchResult.START_MAIN - Starting MainActivity")
                Intent(this, MainActivity::class.java).apply {
                    val fromAddWatchFlow = try {
                        intent.getBooleanExtra(EXTRA_FROM_ADD_WATCH_FLOW, false)
                    } catch (e: Exception) {
                        Timber.e(e, "DispatchActivity: Error reading EXTRA_FROM_ADD_WATCH_FLOW")
                        CrashlyticsLog.recordNonFatalError(e, "DispatchActivity: Error reading EXTRA_FROM_ADD_WATCH_FLOW")
                        false
                    }
                    if (fromAddWatchFlow) {
                        Timber.d("DispatchActivity: START_MAIN from add watch flow, setting flags")
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
                    }
                }
            }
            DispatchResult.CONNECTION_ERROR, DispatchResult.LOGIN_ERROR -> {
                Timber.e("DispatchActivity: DispatchResult.CONNECTION_ERROR or LOGIN_ERROR - Showing error and finishing")
                showMessage(R.string.unknown_error)
                CrashlyticsLog.log("DispatchActivity: CONNECTION_ERROR or LOGIN_ERROR")
                keepSplashOnScreen = false
                finish()
                return
            }
        }

        Timber.d("DispatchActivity: Starting activity: ${intentToStart.component?.className}")
        keepSplashOnScreen = false
        startActivity(intentToStart)
        finish()
    }

    private fun showMessage(messageResourceId: Int) {
        Timber.d("DispatchActivity: showMessage called with resourceId=$messageResourceId")
        try {
            Toast.makeText(this, messageResourceId, Toast.LENGTH_SHORT).show()
        } catch (e: Exception) {
            Timber.e(e, "DispatchActivity: Error showing Toast message")
            CrashlyticsLog.recordNonFatalError(e, "DispatchActivity: Error showing Toast message")
        }
    }
}
