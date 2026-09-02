package com.sosmartlabs.momo.calendarevent

import android.annotation.SuppressLint
import android.os.Build
import android.os.Bundle
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.fragment.app.Fragment
import com.google.firebase.crashlytics.crashlytics
import com.google.firebase.Firebase
import com.parse.ParseObject
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.calendarevent.ui.CalendarEventEditFragment
import com.sosmartlabs.momo.calendarevent.ui.CalendarEventListFragment
import com.sosmartlabs.momo.calendarevent.ui.CalendarEventListener
import com.sosmartlabs.momo.databinding.ActivityCalendarEventBinding
import com.sosmartlabs.momo.utils.Constants
import com.sosmartlabs.momo.utils.EdgeToEdgeUtils
import com.sosmartlabs.momo.utils.ui.toolbar.ToolbarConstructor
import com.sosmartlabs.momo.utils.ui.toolbar.ToolbarNavigationType
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber
import javax.inject.Inject

@AndroidEntryPoint
class CalendarEventActivity: AppCompatActivity(),
    CalendarEventListener {
    @Inject lateinit var toolbarConstructor: ToolbarConstructor
    private lateinit var binding: ActivityCalendarEventBinding
    private var mSelectedEvent: ParseObject? = null
    private var mWearer: ParseObject? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Timber.d("CalendarEventActivity: onCreate")
        
        enableEdgeToEdge()
        binding = ActivityCalendarEventBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setupEdgeToEdge()

        toolbarConstructor
            .setDisplayShowTitle(false)
            .setErrorName("CalendarEventActivity")
            .setNavigationOnClick(ToolbarNavigationType.FRAGMENT_POP)
            .build()

        replaceFragment(CalendarEventListFragment(), false)
    }

    override fun onResume() {
        super.onResume()
        if (!intent.hasExtra(Constants.EXTRA_WEARER_ID) || !intent.hasExtra(Constants.EXTRA_DEVICE_ID)) finish()
        mWearer = ParseObject.createWithoutData("Wearer", intent.getStringExtra(Constants.EXTRA_WEARER_ID))
        mWearer?.put("deviceId", intent.getStringExtra(Constants.EXTRA_DEVICE_ID)!!)
    }

    private fun replaceFragment(fragment: Fragment, addToBackStack: Boolean) {
        val transaction = supportFragmentManager.beginTransaction()
        transaction.replace(R.id.container, fragment)
        if (addToBackStack) transaction.addToBackStack(null)
        transaction.commit()
    }

    override fun setTitle(title: String?) {
        try {
            binding.toolbar.title = title
        } catch (e: java.lang.NullPointerException) {
            with(Firebase.crashlytics) {
                log("Error setting title in CalendarEventActivity")
                recordException(e)
            }
            Timber.e(e)
        }
    }

    override fun getWearer(): ParseObject? {
        return mWearer
    }

    override fun getSelectedEvent(): ParseObject? {
        return mSelectedEvent
    }

    override fun editEvent(event: ParseObject) {
        mSelectedEvent = event
        replaceFragment(CalendarEventEditFragment(), true)
    }

    override fun onEditedEvent() {
        supportFragmentManager.popBackStackImmediate()
    }

    private fun setupEdgeToEdge() {
        Timber.d("CalendarEventActivity: setupEdgeToEdge")

        // Set dark status bar appearance (colorPrimary is dark purple)
        WindowCompat.getInsetsController(window, window.decorView).isAppearanceLightStatusBars = false
        
        ViewCompat.setOnApplyWindowInsetsListener(binding.root) { view, windowInsets ->
            val systemBars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars())
            val displayCutout = windowInsets.getInsets(WindowInsetsCompat.Type.displayCutout())
            val navigationBars = windowInsets.getInsets(WindowInsetsCompat.Type.navigationBars())

            Timber.d("CalendarEventActivity: systemBars $systemBars")
            Timber.d("CalendarEventActivity: displayCutout $displayCutout")
            Timber.d("CalendarEventActivity: navigationBars $navigationBars")

            // Apply top padding to AppBarLayout to extend colorPrimary background into status bar area
            binding.appBar.setPadding(
                systemBars.left.coerceAtLeast(displayCutout.left),
                systemBars.top.coerceAtLeast(displayCutout.top),
                systemBars.right.coerceAtLeast(displayCutout.right),
                binding.appBar.paddingBottom
            )

            // Apply bottom insets conditionally based on navigation type
            val shouldApplyBottomInsets = EdgeToEdgeUtils.hasButtonNavigation(applicationContext)
            val bottomPadding = if (shouldApplyBottomInsets) {
                navigationBars.bottom.coerceAtLeast(displayCutout.bottom)
            } else {
                0
            }

            Timber.d("CalendarEventActivity: shouldApplyBottomInsets $shouldApplyBottomInsets, bottomPadding $bottomPadding")

            // Apply bottom padding to container FrameLayout for navigation bar
            binding.container.setPadding(
                binding.container.paddingLeft,
                binding.container.paddingTop,
                binding.container.paddingRight,
                bottomPadding
            )

            windowInsets
        }
    }
}