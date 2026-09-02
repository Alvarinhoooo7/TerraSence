package com.sosmartlabs.momotabletpadres.core.settings.common

import androidx.fragment.app.Fragment

/**
 * Base fragment for settings
 */
abstract class SettingsBaseFragment: Fragment() {

    /**
     * Resource id for the fragment's title
     */
    protected abstract val titleResId: Int

}