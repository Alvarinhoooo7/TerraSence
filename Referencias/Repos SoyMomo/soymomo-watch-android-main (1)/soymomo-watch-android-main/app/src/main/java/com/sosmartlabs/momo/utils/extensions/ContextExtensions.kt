package com.sosmartlabs.momo.utils.extensions

import android.content.Context
import android.content.ContextWrapper
import androidx.appcompat.app.AppCompatActivity

/**
 * Walks the [ContextWrapper] chain to find the hosting [AppCompatActivity].
 *
 * A View's context is not always the Activity. When the View is inflated from a
 * `@AndroidEntryPoint` Fragment, Hilt wraps it in a
 * `ViewComponentManager$FragmentContextWrapper`; theming and other decorators add
 * further [ContextWrapper] layers. A blind `context as AppCompatActivity` cast throws
 * [ClassCastException] in those cases, so always unwrap instead of casting.
 *
 * @return the [AppCompatActivity] hosting this context, or null if none is found.
 */
fun Context.findAppCompatActivity(): AppCompatActivity? {
    var context: Context? = this
    while (context is ContextWrapper) {
        if (context is AppCompatActivity) return context
        context = context.baseContext
    }
    return null
}
