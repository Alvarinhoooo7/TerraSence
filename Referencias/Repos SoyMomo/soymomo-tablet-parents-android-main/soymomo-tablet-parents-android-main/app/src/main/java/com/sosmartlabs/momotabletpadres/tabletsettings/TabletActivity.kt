package com.sosmartlabs.momotabletpadres.tabletsettings

import android.os.Build
import android.os.Bundle
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowInsetsControllerCompat
import androidx.navigation.fragment.NavHostFragment
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.core.settings.dug.common.SettingsConstants.TABLET_OBJECT_EXTRA
import com.sosmartlabs.momotabletpadres.databinding.ActivityTabletSettingsBinding
import com.sosmartlabs.momotabletpadres.utils.Constants
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import com.sosmartlabs.momotabletpadres.viewmodels.KidProfileViewModel
import com.sosmartlabs.momotabletpadres.tablet.TabletViewModel
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber

/**
 * Container for Tablet Info Fragments
 */
@AndroidEntryPoint
class TabletActivity : AppCompatActivity() {

    private lateinit var binding: ActivityTabletSettingsBinding
    private val tabletViewModel: TabletViewModel by viewModels()
    private val kidProfileViewModel: KidProfileViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        Timber.d("TabletActivity: onCreate() - started")
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        binding = ActivityTabletSettingsBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setupToolbar()
        setupTablet()
        setupNavigation()
        Timber.d("TabletActivity: onCreate() - finished")
    }

    private fun setupToolbar() {
        Timber.d("TabletActivity: setupToolbar() - started")
        try {
            WindowInsetsControllerCompat(window, window.decorView).isAppearanceLightStatusBars = false
            WindowInsetsControllerCompat(window, window.decorView).isAppearanceLightNavigationBars = true
            Timber.d("TabletActivity: setupToolbar() - finished")
        } catch (e: Exception) {
            Timber.e(e, "TabletActivity: Error setting up toolbar")
            CrashlyticsLog.recordException(e, "TabletActivity: Error setting up toolbar")
        }
    }

    private fun setupTablet() {
        Timber.d("TabletActivity: setupTablet() - started")
        val extras = intent.extras
        if (extras != null) {
            Timber.d("TabletActivity: Found intent extras")
            for (key in extras.keySet()) {
                Timber.d("TabletActivity: Intent Extra - Key: $key, Value: ${extras.get(key)}")
            }
        } else {
            Timber.e("TabletActivity: No intent extras found!")
            CrashlyticsLog.log("TabletActivity: No intent extras found!")
        }

        val deepLinkExtras = extras?.getBundle("android-support-nav:controller:deepLinkExtras")
        if (deepLinkExtras != null) {
            Timber.d("TabletActivity: Found deepLinkExtras bundle")
        } else {
            Timber.d("TabletActivity: No deepLinkExtras bundle found")
        }

        val tablet: Tablet? = try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                deepLinkExtras?.getParcelable(TABLET_OBJECT_EXTRA, Tablet::class.java)
                    ?: intent.getParcelableExtra(TABLET_OBJECT_EXTRA, Tablet::class.java)
            } else {
                @Suppress("DEPRECATION")
                deepLinkExtras?.getParcelable<Tablet>(TABLET_OBJECT_EXTRA)
                    ?: intent.getParcelableExtra(TABLET_OBJECT_EXTRA)
            }
        } catch (e: Exception) {
            Timber.e(e, "TabletActivity: Error retrieving Tablet from extras")
            CrashlyticsLog.recordException(e, "TabletActivity: Error retrieving Tablet from extras")
            null
        }

        if (tablet != null) {
            Timber.d("TabletActivity: Tablet found with HID: ${tablet.hid}")
            setCurrentTablet(tablet)
        } else {
            Timber.e("TabletActivity: No tablet found in intent or deepLink extras!")
            CrashlyticsLog.log("TabletActivity: No tablet found in intent or deepLink extras!")
        }
        Timber.d("TabletActivity: setupTablet() - finished")
    }

    private fun setupNavigation() {
        Timber.d("TabletActivity: setupNavigation() - started")
        try {
            val navHostFragment = supportFragmentManager.findFragmentById(binding.navHostFragment.id)
            if (navHostFragment == null) {
                Timber.e("TabletActivity: navHostFragment not found!")
                CrashlyticsLog.log("TabletActivity: navHostFragment not found!")
                return
            }
            val navHost = navHostFragment as? NavHostFragment
            if (navHost == null) {
                Timber.e("TabletActivity: navHostFragment is not a NavHostFragment!")
                CrashlyticsLog.log("TabletActivity: navHostFragment is not a NavHostFragment!")
                return
            }
            val navController = navHost.navController
            val graph = navController.navInflater.inflate(R.navigation.new_nav_graph)
            navController.setGraph(graph, intent.extras)
            Timber.d("TabletActivity: Navigation graph set")

            val quickAccessFragment = intent.extras?.getString(Constants.FRAGMENT_QUICK_ACCESS)
            if (quickAccessFragment != null) {
                Timber.d("TabletActivity: Navigating to quick access fragment: $quickAccessFragment")
                when (quickAccessFragment) {
                    Constants.TABLET_KID_PROFILE_EDIT -> {
                        Timber.d("TabletActivity: Navigating to editKidProfileFragment")
                        navController.navigate(R.id.editKidProfileFragment)
                    }
                    Constants.TABLET_SAFETY -> {
                        Timber.d("TabletActivity: Navigating to tabletSafetyFragment")
                        navController.navigate(R.id.tabletSafetyFragment)
                    }
                    // All Dug detection categories now open the unified Dug hub
                    // (filterable by chip there) instead of the old per-category screens.
                    Constants.TABLET_DUG_SMART_DETECTION,
                    Constants.TABLET_DUG_MESSAGES_DETECTION,
                    Constants.TABLET_DUG_SEARCH_DETECTION,
                    Constants.TABLET_DUG_MUSIC_DETECTION,
                    Constants.TABLET_DUG_MOOD_DETECTION -> {
                        Timber.d("TabletActivity: Navigating to tabletFragmentDugUnified")
                        navController.navigate(R.id.tabletFragmentDugUnified)
                    }
                    Constants.TABLET_SETTINGS_APP_MAIN -> {
                        Timber.d("TabletActivity: Navigating to tabletFragmentAppsMain")
                        navController.navigate(R.id.tabletFragmentAppsMain)
                    }
                    else -> {
                        Timber.w("TabletActivity: Unknown quick access fragment: $quickAccessFragment")
                        CrashlyticsLog.log("TabletActivity: Unknown quick access fragment: $quickAccessFragment")
                    }
                }
            } else {
                Timber.d("TabletActivity: No quick access fragment specified")
            }
        } catch (e: Exception) {
            Timber.e(e, "TabletActivity: Error setting up navigation")
            CrashlyticsLog.recordException(e, "TabletActivity: Error setting up navigation")
        }
        Timber.d("TabletActivity: setupNavigation() - finished")
    }

    override fun onSupportNavigateUp(): Boolean {
        Timber.d("TabletActivity: onSupportNavigateUp() - Handling up navigation")
        onBackPressed()
        return true
    }

    private fun setCurrentTablet(tablet: Tablet) {
        Timber.d("TabletActivity: setCurrentTablet() - Setting current tablet in ViewModels (HID: ${tablet.hid})")
        try {
            tabletViewModel.setCurrentTablet(tablet)
            kidProfileViewModel.setCurrentTablet(tablet)
            Timber.d("TabletActivity: setCurrentTablet() - Tablet set in ViewModels")
        } catch (e: Exception) {
            Timber.e(e, "TabletActivity: Error setting current tablet in ViewModels")
            CrashlyticsLog.recordException(e, "TabletActivity: Error setting current tablet in ViewModels")
        }
    }
}