package com.sosmartlabs.momotabletpadres.utils.ui

import com.sosmartlabs.momotabletpadres.R

/**
 * Collection of default icons used by the app.
 *
 * Note: `@JvmField val` rather than `const val` because AGP 9 generates non-final
 * R fields, so `R.drawable.*` is no longer a compile-time constant. Without
 * `@JvmField` the Kotlin codegen is inconsistent: the property is emitted as a
 * plain static-final int field on this object but call sites still resolve
 * `Constants.PROPERTY` through a synthetic getter, which doesn't exist —
 * crash at runtime with `NoSuchMethodError`. `@JvmField` makes both sides
 * agree on a plain field with no getter.
 */
object DefaultIcons {

    /** Default profile icon for older watch models */
    @JvmField val PROFILE_MOMO_CLASSIC = R.drawable.ic_momo

    /** Disabled profile icon for older watch models */
    @JvmField val PROFILE_MOMO_CLASSIC_DISABLED = R.drawable.ic_momo_desactivado

    /** Default profile icon for Space watch models */
    @JvmField val PROFILE_MOMO_SPACE = R.drawable.ic_momo_space

    /** Disabled profile icon for Space watch models */
    @JvmField val PROFILE_MOMO_SPACE_DISABLED = R.drawable.ic_momo_space_desactivado

    /** Default Sim SubscriptionPlan logo */
    @JvmField val SIM_SUBSCRIPTION_PLAN = R.drawable.ic_soymomo_sim

    /** Default Placeholder empty picture */
    @JvmField val PROFILE_PLACEHOLDER = R.drawable.ic_profile_image_placeholder

    @JvmField val PROFILE_MOMO_DEFAULT = R.drawable.momo_picture_default

//    /**
//     * Returns the default profile icon for the given [WatchModel]
//     * @param model [WatchModel] for loading default profile icon
//     * @return Resource Id for default profile icon for given model
//     */
//    fun getTabletModelDefaultProfileIcon(model: TabletModel) = when(model.name) {
//        in listOf(Model.Original, Model.H2O) -> PROFILE_MOMO_CLASSIC
//        else -> PROFILE_MOMO_SPACE
//    }
}