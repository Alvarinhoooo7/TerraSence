package com.sosmartlabs.momo.utils.ui.toolbar

import androidx.annotation.StringRes
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.Toolbar
import com.google.firebase.crashlytics.crashlytics
import com.google.firebase.Firebase
import com.sosmartlabs.momo.R
import timber.log.Timber
import javax.inject.Inject

class ToolbarConstructor @Inject constructor(private val activity: AppCompatActivity) {

    private var title : Int = 0
    private var displayHomeAsUpEnabled : Boolean = true
    private var displayShowHomeEnabled : Boolean = true
    private var displayShowTitle : Boolean = true
    private var toolbarId : Int = R.id.toolbar
    private var errorName : String = "Unidentified"
    private var navigationOnClick : ToolbarNavigationType = ToolbarNavigationType.FINISH

    fun build() {
        val mToolbar = activity.findViewById<Toolbar>(toolbarId)
        try {
            activity.setSupportActionBar(mToolbar)
            activity.supportActionBar!!.setDisplayHomeAsUpEnabled(displayHomeAsUpEnabled)
            activity.supportActionBar!!.setDisplayShowHomeEnabled(displayShowHomeEnabled)
            activity.supportActionBar!!.setDisplayShowTitleEnabled(displayShowTitle)

            if (overrideTitle()) {
                activity.supportActionBar!!.title = activity.getString(title)
                mToolbar.setTitle(title)
            }

            when (navigationOnClick) {
                ToolbarNavigationType.FINISH -> {
                    mToolbar.setNavigationOnClickListener { activity.finish() }
                }
                ToolbarNavigationType.SUPPORT_FINISH_AFTER_TRANSITION -> {
                    mToolbar.setNavigationOnClickListener { activity.supportFinishAfterTransition() }
                }
                ToolbarNavigationType.FRAGMENT_POP -> {
                    mToolbar.setNavigationOnClickListener {
                        val fragmentManager = activity.supportFragmentManager
                        if (fragmentManager.backStackEntryCount > 0) {
                            fragmentManager.popBackStackImmediate()
                        } else {
                            activity.finish()
                        }
                    }
                }
            }

        } catch (e: NullPointerException) {
            with(Firebase.crashlytics) {
                log("Error creating: $errorName")
                recordException(e)
            }
            Timber.e(e)
        }
    }

    fun setTitle(@StringRes titleId : Int) : ToolbarConstructor {
        title = titleId
        return this
    }

    @Suppress("unused")
    fun setDisplayHomeAsUp(enabled : Boolean) : ToolbarConstructor {
        displayHomeAsUpEnabled = enabled
        return this
    }

    @Suppress("unused")
    fun setDisplayShowHome(enabled : Boolean) : ToolbarConstructor {
        displayShowHomeEnabled = enabled
        return this
    }

    fun setErrorName(value : String) : ToolbarConstructor {
        errorName = value
        return this
    }

    fun setDisplayShowTitle(enabled : Boolean) : ToolbarConstructor {
        displayShowTitle = enabled
        return this
    }

    fun setNavigationOnClick(navType : ToolbarNavigationType) : ToolbarConstructor {
        navigationOnClick = navType
        return this
    }

    private fun overrideTitle() : Boolean {
        return title != 0
    }
}