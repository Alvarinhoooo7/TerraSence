package com.sosmartlabs.momotabletpadres.viewmodels

import android.app.Application
import androidx.lifecycle.viewModelScope
import com.sosmartlabs.momotabletpadres.core.settings.safewalking.ui.SafeWalkingViewModelBase
import com.sosmartlabs.momotabletpadres.repositories.safewalking.SafeWalkingSettingsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import javax.inject.Inject
import kotlin.coroutines.CoroutineContext

@HiltViewModel
class SafeWalkingViewModel @Inject constructor(
    application: Application,
    override val safeWalkingSettingsRepository: SafeWalkingSettingsRepository
) : SafeWalkingViewModelBase(application) {

    override var ioContext: CoroutineContext = Dispatchers.IO
    override var externalScope: CoroutineScope = viewModelScope
}
