package com.sosmartlabs.momotabletpadres.utils

import android.annotation.SuppressLint
import android.content.Context
import android.util.AttributeSet
import android.view.View

/**
 * @author mrg
 * @date 9/22/17
 */

class MoveUpBehavior(context: Context, attrs: AttributeSet) : androidx.coordinatorlayout.widget.CoordinatorLayout.Behavior<View>(context, attrs) {
    // Intentional access to Material's SnackbarLayout for a custom move-up behavior.
    @SuppressLint("RestrictedApi")
    override fun layoutDependsOn(parent: androidx.coordinatorlayout.widget.CoordinatorLayout, child: View, dependency: View): Boolean {
        return dependency is com.google.android.material.snackbar.Snackbar.SnackbarLayout
    }

    override fun onDependentViewChanged(parent: androidx.coordinatorlayout.widget.CoordinatorLayout, child: View, dependency: View): Boolean {
        val translationY = Math.min(0f, dependency.translationY - dependency.height)
        child.translationY = translationY
        return true
    }
}
