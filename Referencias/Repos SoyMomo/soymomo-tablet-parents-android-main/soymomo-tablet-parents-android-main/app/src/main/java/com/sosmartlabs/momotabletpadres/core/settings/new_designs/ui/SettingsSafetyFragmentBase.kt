package com.sosmartlabs.momotabletpadres.core.settings.new_designs.ui

import android.content.SharedPreferences
import androidx.viewbinding.ViewBinding
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.tablet.ui.TabletViewModelBase
import com.sosmartlabs.momotabletpadres.core.settings.common.SettingsBaseFragment

abstract class SettingsSafetyFragmentBase: SettingsBaseFragment() {
    protected lateinit var sp : SharedPreferences

    protected abstract val tabletViewModel: TabletViewModelBase

    protected abstract val binding: ViewBinding

    override val titleResId: Int
        get() = R.string.settings_fragment_initial_safety_title

    protected abstract fun setupViewModel()

    protected abstract fun setupViewsRequireTablet(tablet: Tablet)
}