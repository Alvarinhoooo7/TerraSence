package com.sosmartlabs.momotabletpadres.dispatch

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.widget.Toast
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.core.view.WindowInsetsControllerCompat
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.accessdenied.AccessDeniedActivity
import com.sosmartlabs.momotabletpadres.dispatch.model.DispatchResult
import com.sosmartlabs.momotabletpadres.main.MainActivity
import com.sosmartlabs.momotabletpadres.sharedprefs.LinkInvitationPrefs
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import com.sosmartlabs.momotabletpadres.onboarding.OnboardingActivity
import com.sosmartlabs.momotabletpadres.session.SessionActivity
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject
import kotlinx.coroutines.ExperimentalCoroutinesApi
import timber.log.Timber

/**
 * Activity for dispatching to Login, Main Activity, etc...
 */
@OptIn(ExperimentalCoroutinesApi::class)
@AndroidEntryPoint
class DispatchActivity : AppCompatActivity() {

    /**
     * ViewModel for this activity
     */
    private val dispatchViewModel: DispatchViewModel by viewModels()

    @Inject
    lateinit var linkInvitationPrefs: LinkInvitationPrefs

    /**
     * Keeps the system splash on screen while the ViewModel resolves where to
     * route. Flipped to false the moment a DispatchResult arrives, so the
     * splash hands off straight to the destination activity with no blank frame.
     */
    private var keepSplashOnScreen = true

    override fun onCreate(savedInstanceState: Bundle?) {
        val splashScreen = installSplashScreen()
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        splashScreen.setKeepOnScreenCondition { keepSplashOnScreen }
        Timber.d("DispatchActivity: onCreate()")
        CrashlyticsLog.log("DispatchActivity: onCreate()")
        setupToolbar()
        captureDeepLinkIfPresent(intent)
        observeViewModel()
    }

    /**
     * If we were started by an incoming deep link
     * (soymomo-tablet://link/<id> or https://soymomo.com/link/tablet/<id>),
     * extract the tablet id and park it in shared prefs. MainActivity drains
     * it on its next onResume and launches LinkDeviceActivity with the id
     * prefilled into the receiver-side flow. Parking through prefs (instead
     * of threading intent extras) means the link survives the auth dance:
     * users who aren't signed in get routed through SessionActivity first,
     * and the pending id is still there when they finally land in Main.
     */
    private fun captureDeepLinkIfPresent(intent: Intent?) {
        val data: Uri = intent?.data ?: return
        val tabletId = parseTabletInvitationUri(data)
        if (tabletId == null) {
            Timber.d("DispatchActivity: Ignoring non-invitation Uri: $data")
            return
        }
        Timber.i("DispatchActivity: Captured deep-link tabletId=$tabletId from $data")
        CrashlyticsLog.log("DispatchActivity: Captured deep-link tabletId=$tabletId")
        linkInvitationPrefs.setPendingTabletId(tabletId)
    }

    private fun parseTabletInvitationUri(uri: Uri): String? {
        val scheme = uri.scheme ?: return null
        val candidate = when {
            // Custom scheme: soymomo-tablet://link/<id>
            scheme.equals("soymomo-tablet", ignoreCase = true) -> {
                val host = uri.host ?: return null
                if (!host.equals("link", ignoreCase = true)) return null
                uri.pathSegments.firstOrNull()
            }
            // App Link: https://soymomo.com/link/tablet/<id>
            // Scheme/host mirror the manifest intent-filter exactly. Other
            // schemes/hosts (http, www) never reach here as App Links; they
            // fall through to the browser landing page which hands off via
            // the custom scheme instead.
            scheme.equals("https", ignoreCase = true) -> {
                val host = uri.host ?: return null
                if (!host.equals("soymomo.com", ignoreCase = true)) return null
                val segments = uri.pathSegments
                if (segments.size < 3) return null
                if (!segments[0].equals("link", ignoreCase = true)) return null
                if (!segments[1].equals("tablet", ignoreCase = true)) return null
                segments[2]
            }
            else -> null
        }
        // Validate the id shape once, here, so an invalid id is never logged
        // or parked further down the line.
        return candidate?.takeIf { LinkInvitationPrefs.isValidTabletId(it) }
    }

    private fun setupToolbar() {
        Timber.d("DispatchActivity: setupToolbar() - started")
        try {
            WindowInsetsControllerCompat(window, window.decorView).isAppearanceLightStatusBars = false
            Timber.d("DispatchActivity: setupToolbar() - finished")
        } catch (e: Exception) {
            Timber.e(e, "DispatchActivity: Error setting up toolbar")
            CrashlyticsLog.recordException(e, "DispatchActivity: Error setting up toolbar")           
        }
    }

    private fun observeViewModel() {
        Timber.d("DispatchActivity: observeViewModel - Observing dispatchResult LiveData")
        CrashlyticsLog.log("DispatchActivity: observeViewModel - Observing dispatchResult LiveData")        
        dispatchViewModel.dispatchResult.observe(this) { result ->
            Timber.d("DispatchActivity: observeViewModel - dispatchResult changed: $result")
            CrashlyticsLog.log("DispatchActivity: observeViewModel - dispatchResult changed: $result")            
            if (result == null) {
                Timber.e("DispatchActivity: observeViewModel - dispatchResult is null")
                CrashlyticsLog.log("DispatchActivity: observeViewModel - dispatchResult is null")                
                return@observe
            }
            // A routing decision is in — release the splash so it exits into
            // whichever destination activity we start below.
            keepSplashOnScreen = false
            when (result) {
                DispatchResult.OPEN_FIRST_TIME -> {
                    Timber.i("DispatchActivity: observeViewModel - First app launch detected, navigating to tutorial")
                    CrashlyticsLog.log("DispatchActivity: observeViewModel - First app launch detected, navigating to tutorial")                    
                    navigateToTutorialActivity()
                }
                DispatchResult.USER_NULL -> {
                    Timber.i("DispatchActivity: observeViewModel - No user found, redirecting to login")
                    CrashlyticsLog.log("DispatchActivity: observeViewModel - No user found, redirecting to login")                    
                    navigateToLoginActivity()
                }
                DispatchResult.START_MAIN, DispatchResult.NEW_USER -> {
                    Timber.i("DispatchActivity: observeViewModel - Valid user found, proceeding to main activity")
                    CrashlyticsLog.log("DispatchActivity: observeViewModel - Valid user found, proceeding to main activity")                    
                    navigateToMainActivity()
                }
                DispatchResult.IS_TABLET -> {
                    Timber.w("DispatchActivity: observeViewModel - Tablet device detected, access denied")
                    CrashlyticsLog.log("DispatchActivity: observeViewModel - Tablet device detected, access denied")                    
                    navigateToAccessDeniedActivity()
                }
                DispatchResult.SESSION_EXPIRED -> {
                    Timber.w("DispatchActivity: observeViewModel - Session expired, returning to login")
                    CrashlyticsLog.log("DispatchActivity: observeViewModel - Session expired, returning to login")                    
                    Toast.makeText(this, R.string.toast_error_log_in_again, Toast.LENGTH_LONG).show()
                    navigateToLoginActivity()
                }
                DispatchResult.LOGIN_ERROR -> {
                    Timber.e("DispatchActivity: observeViewModel - Login error, returning to login")
                    CrashlyticsLog.log("DispatchActivity: observeViewModel - Login error, returning to login")                    
                    Toast.makeText(this, R.string.toast_error_log_in_again, Toast.LENGTH_LONG).show()
                    navigateToLoginActivity()
                }
                DispatchResult.CONNECTION_ERROR -> {
                    Timber.e("DispatchActivity: observeViewModel - Authentication failed due to connection error")
                    CrashlyticsLog.log("DispatchActivity: observeViewModel - Authentication failed due to connection error")                    
                    Toast.makeText(this, R.string.login_error, Toast.LENGTH_LONG).show()
                    navigateToLoginActivity()
                }
            }
        }
    }

    /**
     * Go to Main Activity when user is already logged!
     */
    private fun navigateToMainActivity() {
        Timber.i("DispatchActivity: navigateToMainActivity - Navigating to MainActivity")
        CrashlyticsLog.log("DispatchActivity: navigateToMainActivity - Navigating to MainActivity")        
        val intent = Intent(this, MainActivity::class.java).apply {
            // Reuse a running MainActivity (e.g. a warm-start deep link) instead of
            // stacking a duplicate on top of it. CLEAR_TOP + SINGLE_TOP brings the
            // existing instance forward; its onResume still drains any parked
            // invitation id.
            addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        }
        startActivity(intent)
        Timber.d("DispatchActivity: navigateToMainActivity - MainActivity started")
        CrashlyticsLog.log("DispatchActivity: navigateToMainActivity - MainActivity started")
        finish()
        Timber.d("DispatchActivity: navigateToMainActivity - DispatchActivity finished")
        CrashlyticsLog.log("DispatchActivity: navigateToMainActivity - DispatchActivity finished")
    }

    /**
     * If user is null, then go to Login activity
     */
    private fun navigateToLoginActivity() {
        Timber.i("DispatchActivity: navigateToLoginActivity - Navigating to SessionActivity (login)")
        CrashlyticsLog.log("DispatchActivity: navigateToLoginActivity - Navigating to SessionActivity (login)")        
        val intent = Intent(this, SessionActivity::class.java)
        startActivity(intent)
        Timber.d("DispatchActivity: navigateToLoginActivity - SessionActivity started")
        CrashlyticsLog.log("DispatchActivity: navigateToLoginActivity - SessionActivity started")
        finish()
        Timber.d("DispatchActivity: navigateToLoginActivity - DispatchActivity finished")
        CrashlyticsLog.log("DispatchActivity: navigateToLoginActivity - DispatchActivity finished")
    }

    /**
     * If is the first launch go to Tutorial.
     */
    private fun navigateToTutorialActivity() {
        Timber.i("DispatchActivity: navigateToTutorialActivity - Navigating to OnboardingActivity (tutorial)")
        CrashlyticsLog.log("DispatchActivity: navigateToTutorialActivity - Navigating to OnboardingActivity (tutorial)")
        val intent = Intent(this, OnboardingActivity::class.java)
        startActivity(intent)
        Timber.d("DispatchActivity: navigateToTutorialActivity - OnBoardingActivity started")
        CrashlyticsLog.log("DispatchActivity: navigateToTutorialActivity - OnBoardingActivity started")
        finish()
        Timber.d("DispatchActivity: navigateToTutorialActivity - DispatchActivity finished")
        CrashlyticsLog.log("DispatchActivity: navigateToTutorialActivity - DispatchActivity finished")
    }

    private fun navigateToAccessDeniedActivity() {
        Timber.i("DispatchActivity: navigateToAccessDeniedActivity - Navigating to AccessDeniedActivity")
        CrashlyticsLog.log("DispatchActivity: navigateToAccessDeniedActivity - Navigating to AccessDeniedActivity")        
        val intent = Intent(this, AccessDeniedActivity::class.java)
        startActivity(intent)
        Timber.d("DispatchActivity: navigateToAccessDeniedActivity - AccessDeniedActivity started")
        CrashlyticsLog.log("DispatchActivity: navigateToAccessDeniedActivity - AccessDeniedActivity started")
        finish()
        Timber.d("DispatchActivity: navigateToAccessDeniedActivity - DispatchActivity finished")
        CrashlyticsLog.log("DispatchActivity: navigateToAccessDeniedActivity - DispatchActivity finished")
    }
}