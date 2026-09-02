package com.sosmartlabs.momotabletpadres.viewmodels

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.core.settings.dug.common.model.DugFeature
import com.sosmartlabs.momotabletpadres.core.settings.dug.common.model.DugFeatureType
import com.sosmartlabs.momotabletpadres.core.settings.dug.common.model.DugFeaturesRepository
import com.sosmartlabs.momotabletpadres.tablet.TabletRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject

@HiltViewModel
class DugViewModel @Inject constructor(
    application: Application,
    private val dugFeaturesRepository: DugFeaturesRepository,
    private val tabletRepository: TabletRepository
) : AndroidViewModel(application) {

    private val _tabletDugFeatures = MutableLiveData<List<DugFeature>>()
    val tabletDugFeatures: LiveData<List<DugFeature>> get() = _tabletDugFeatures

    private val _dugFeatureUpdateStatus = MutableLiveData<DugFeatureUpdateStatus>()
    val dugFeatureUpdateStatus: LiveData<DugFeatureUpdateStatus> get() = _dugFeatureUpdateStatus

    /**
     * Tablet for show in this ViewModel
     */
    private lateinit var tablet: Tablet

    fun getTabletFeatures(tablet: Tablet) {
        this.tablet = tablet
        viewModelScope.launch(Dispatchers.IO) {
            _tabletDugFeatures.postValue(
                dugFeaturesRepository.getDugFeaturesByTabletModel(tablet)
            )
        }
    }

    fun setDugFeatureEnabled(feature: DugFeature, enabled: Boolean) {
        _dugFeatureUpdateStatus.value = DugFeatureUpdateStatus.UPDATING
        viewModelScope.launch(Dispatchers.IO) {
            runCatching {
                setTabletDugFeature(feature.featureType, enabled)
                tabletRepository.update(tablet)
            }.onSuccess {
                feature.enabled = enabled
                _dugFeatureUpdateStatus.postValue(DugFeatureUpdateStatus.UPDATE_SUCCESS)
            }.onFailure {
                Timber.e(it)
                _dugFeatureUpdateStatus.postValue(DugFeatureUpdateStatus.UPDATE_FAILED)
            }
        }
    }

    private fun setTabletDugFeature(featureType: DugFeatureType, enabled: Boolean) {
        when(featureType) {
            DugFeatureType.SMART_DETECTOR -> tablet.smartDetectionEnabled = enabled
            DugFeatureType.PROFANITY_DETECTOR -> tablet.profanityDetectionEnabled = enabled
            DugFeatureType.UNSAFE_SEARCH_DETECTOR -> tablet.unsafeSearchDetectionEnabled = enabled
            DugFeatureType.MOOD_DETECTOR -> tablet.moodDetectionEnabled = enabled
            DugFeatureType.EXPLICIT_MUSIC_DETECTOR -> tablet.explicitMusicDetectionEnabled = enabled
        }
    }
}

/**
 * Enum for give the user feedback about the update status of a Dug feature
 */
enum class DugFeatureUpdateStatus {
    UPDATING,
    UPDATE_SUCCESS,
    UPDATE_FAILED
}