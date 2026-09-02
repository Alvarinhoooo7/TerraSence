package com.sosmartlabs.momo.utils.ui

import android.view.View
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.fragment.app.Fragment
import timber.log.Timber

/**
 * Sets up edge-to-edge display for fragment toolbar/AppBar areas.
 * Applies top padding to handle status bar and display cutouts.
 *
 * @param appBarLayout The AppBarLayout or toolbar container to apply insets to
 */
fun Fragment.setupFragmentEdgeToEdge(appBarLayout: View) {
    Timber.d("${this::class.simpleName}: setupFragmentEdgeToEdge")
    
    // Handle window insets for AppBarLayout to extend into status bar area
    ViewCompat.setOnApplyWindowInsetsListener(appBarLayout) { view, windowInsets ->
        val systemBars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars())
        val displayCutout = windowInsets.getInsets(WindowInsetsCompat.Type.displayCutout())
        
        Timber.d("${this::class.simpleName}: systemBars $systemBars, displayCutout $displayCutout")
        
        // Apply top padding to AppBarLayout to extend into status bar area
        view.setPadding(
            systemBars.left.coerceAtLeast(displayCutout.left),
            systemBars.top.coerceAtLeast(displayCutout.top),
            systemBars.right.coerceAtLeast(displayCutout.right),
            view.paddingBottom
        )
        
        windowInsets
    }
}

