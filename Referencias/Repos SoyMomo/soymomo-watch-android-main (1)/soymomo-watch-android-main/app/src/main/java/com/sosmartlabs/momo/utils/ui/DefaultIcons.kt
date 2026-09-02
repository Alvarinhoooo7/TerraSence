package com.sosmartlabs.momo.utils.ui

import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.models.Lite1
import com.sosmartlabs.momo.models.Space1
import com.sosmartlabs.momo.models.Space2
import com.sosmartlabs.momo.models.Space3
import com.sosmartlabs.momo.models.Space4
import com.sosmartlabs.momo.models.WatchModel

/**
 * Collection of default icons used by the app
 */
object DefaultIcons {

    val PROFILE_MOMO_CLASSIC = R.drawable.ic_momo
    val PROFILE_MOMO_CLASSIC_DISABLED = R.drawable.ic_momo_desactivado

    val PROFILE_MOMO_SPACE = R.drawable.ic_momo_space
    val PROFILE_MOMO_SPACE_DISABLED = R.drawable.ic_momo_space_desactivado

    val SIM_SUBSCRIPTION_PLAN = R.drawable.ic_soymomo_sim

    val PROFILE_PLACEHOLDER = R.drawable.ic_profile_image_placeholder
    val PROFILE_MOMO_DEFAULT = R.drawable.momo_picture_default

    /**
     * Returns the default profile icon for the given [WatchModel]
     * @param model [WatchModel] for loading default profile icon
     * @return Resource Id for default profile icon for given model
     */
    fun getWatchModelDefaultProfileIcon(model: WatchModel) = when(model) {
        in listOf(Space1, Space2, Space3, Space4, Lite1) -> PROFILE_MOMO_SPACE
        else -> PROFILE_MOMO_CLASSIC
    }
}
