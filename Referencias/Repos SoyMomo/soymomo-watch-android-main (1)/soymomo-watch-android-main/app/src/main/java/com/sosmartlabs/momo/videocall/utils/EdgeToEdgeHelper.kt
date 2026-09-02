package com.sosmartlabs.momo.videocall.utils

import android.view.View
import android.view.ViewGroup
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.updatePadding
import com.sosmartlabs.momo.videocall.CallActivity
import kotlinx.coroutines.ExperimentalCoroutinesApi
import timber.log.Timber

/**
 * Helper object to assist fragments in CallActivity with edge-to-edge insets handling.
 * Provides various strategies for applying window insets based on fragment needs.
 */
@OptIn(ExperimentalCoroutinesApi::class)
object EdgeToEdgeHelper {

    /**
     * Strategy 1: Full-screen view (e.g., video surface)
     * No padding applied - content extends to edges including under transient system bars.
     * Use this for full-screen video, images, or backgrounds.
     */
    fun applyFullScreenInsets(
        view: View,
        activity: CallActivity,
        onInsetsApplied: ((systemBars: androidx.core.graphics.Insets, displayCutout: androidx.core.graphics.Insets, navigationBars: androidx.core.graphics.Insets) -> Unit)? = null
    ) {
        ViewCompat.setOnApplyWindowInsetsListener(view) { v, windowInsets ->
            val systemBars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars())
            val displayCutout = windowInsets.getInsets(WindowInsetsCompat.Type.displayCutout())
            val navigationBars = windowInsets.getInsets(WindowInsetsCompat.Type.navigationBars())

            Timber.d("EdgeToEdgeHelper: Full-screen insets - systemBars $systemBars")
            
            // No padding - full screen
            onInsetsApplied?.invoke(systemBars, displayCutout, navigationBars)
            
            windowInsets
        }
    }

    /**
     * Strategy 2: UI with controls (e.g., call controls, buttons)
     * Applies padding to keep controls visible when system bars appear transiently.
     * Use this for fragments with interactive UI elements.
     */
    fun applyControlsInsets(
        view: View,
        activity: CallActivity,
        applyTop: Boolean = true,
        applyBottom: Boolean = true,
        onInsetsApplied: ((systemBars: androidx.core.graphics.Insets, displayCutout: androidx.core.graphics.Insets, navigationBars: androidx.core.graphics.Insets) -> Unit)? = null
    ) {
        ViewCompat.setOnApplyWindowInsetsListener(view) { v, windowInsets ->
            val systemBars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars())
            val displayCutout = windowInsets.getInsets(WindowInsetsCompat.Type.displayCutout())
            val navigationBars = windowInsets.getInsets(WindowInsetsCompat.Type.navigationBars())

            Timber.d("EdgeToEdgeHelper: Controls insets - systemBars $systemBars, navigationBars $navigationBars")

            val topPadding = if (applyTop) {
                systemBars.top.coerceAtLeast(displayCutout.top)
            } else {
                0
            }

            val shouldApplyBottomInsets = activity.hasButtonNavigation()
            val bottomPadding = if (applyBottom && shouldApplyBottomInsets) {
                navigationBars.bottom.coerceAtLeast(displayCutout.bottom)
            } else {
                0
            }

            view.updatePadding(
                left = systemBars.left.coerceAtLeast(displayCutout.left),
                top = topPadding,
                right = systemBars.right.coerceAtLeast(displayCutout.right),
                bottom = bottomPadding
            )

            onInsetsApplied?.invoke(systemBars, displayCutout, navigationBars)
            
            windowInsets
        }
    }

    /**
     * Strategy 3: Apply insets to specific UI elements (e.g., FAB, bottom bar)
     * Allows precise control over which views get inset padding/margins.
     */
    fun applyBottomInsetMargin(
        view: View,
        activity: CallActivity,
        originalMargin: Int = 0
    ) {
        ViewCompat.setOnApplyWindowInsetsListener(view.parent as View) { _, windowInsets ->
            val navigationBars = windowInsets.getInsets(WindowInsetsCompat.Type.navigationBars())
            val displayCutout = windowInsets.getInsets(WindowInsetsCompat.Type.displayCutout())

            val shouldApplyBottomInsets = activity.hasButtonNavigation()
            val bottomPadding = if (shouldApplyBottomInsets) {
                navigationBars.bottom.coerceAtLeast(displayCutout.bottom)
            } else {
                0
            }

            Timber.d("EdgeToEdgeHelper: Bottom margin - bottomPadding $bottomPadding")

            val params = view.layoutParams as? ViewGroup.MarginLayoutParams
            params?.bottomMargin = originalMargin + bottomPadding
            view.layoutParams = params

            windowInsets
        }
    }

    /**
     * Strategy 4: Get raw insets for custom handling
     * Returns inset values for manual application in fragments.
     */
    fun getInsets(
        view: View,
        callback: (top: Int, bottom: Int, left: Int, right: Int, isButtonNav: Boolean) -> Unit
    ) {
        ViewCompat.setOnApplyWindowInsetsListener(view) { v, windowInsets ->
            val systemBars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars())
            val displayCutout = windowInsets.getInsets(WindowInsetsCompat.Type.displayCutout())
            val navigationBars = windowInsets.getInsets(WindowInsetsCompat.Type.navigationBars())

            val top = systemBars.top.coerceAtLeast(displayCutout.top)
            val left = systemBars.left.coerceAtLeast(displayCutout.left)
            val right = systemBars.right.coerceAtLeast(displayCutout.right)
            
            // Get activity reference for button navigation check
            val activity = v.context as? CallActivity
            val isButtonNav = activity?.hasButtonNavigation() ?: true
            val bottom = if (isButtonNav) {
                navigationBars.bottom.coerceAtLeast(displayCutout.bottom)
            } else {
                0
            }

            Timber.d("EdgeToEdgeHelper: Raw insets - top: $top, bottom: $bottom, left: $left, right: $right")

            callback(top, bottom, left, right, isButtonNav)
            
            windowInsets
        }
    }
}

