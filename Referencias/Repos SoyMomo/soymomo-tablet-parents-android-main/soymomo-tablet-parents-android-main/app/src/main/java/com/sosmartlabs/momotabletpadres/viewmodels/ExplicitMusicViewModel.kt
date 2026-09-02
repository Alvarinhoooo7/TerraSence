package com.sosmartlabs.momotabletpadres.viewmodels

import android.app.Application
import com.sosmartlabs.momotabletpadres.appicon.AppIconRepository
import com.sosmartlabs.momotabletpadres.core.common.dug.explicitmusic.model.ExplicitMusicRepository
import com.sosmartlabs.momotabletpadres.core.settings.dug.explicitmusic.ui.ExplicitMusicViewModelBase
import com.sosmartlabs.momotabletpadres.repositories.AppInfoRepositoryImpl
import com.sosmartlabs.momotabletpadres.tabletsettings.appprotection.model.appdata.AppDataRepository
import com.sosmartlabs.momotabletpadres.tabletsettings.appprotection.model.installedapp.InstalledAppsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject

@HiltViewModel
class ExplicitMusicViewModel @Inject constructor(
    application: Application,
    override val installedAppsRepository: InstalledAppsRepository,
    override val appIconRepository: AppIconRepository,
    override val appInfoRepository: AppInfoRepositoryImpl,
    override val appDataRepository: AppDataRepository,
    override val explicitMusicRepository: ExplicitMusicRepository
) : ExplicitMusicViewModelBase(application) {

}