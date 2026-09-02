package com.sosmartlabs.momo.steps.ui

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.sharedprefs.SharedPrefs
import com.sosmartlabs.momo.steps.model.PedometerData
import com.sosmartlabs.momo.steps.repository.PedometerRepository
import com.sosmartlabs.momo.utils.Resource
import com.sosmartlabs.momo.watchsettings.ui.BaseSettingViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import timber.log.Timber
import java.util.*
import javax.inject.Inject

@HiltViewModel
class StepsViewModel @Inject constructor(
    private val stepsRepository: PedometerRepository,
    private val sp: SharedPrefs
) : BaseSettingViewModel() {

    private val _watch = MutableLiveData<Wearer>()
    val watch: LiveData<Wearer> get() = _watch

    private val _pedometerData = MutableLiveData<Resource<List<PedometerData>, Unit>>()
    val pedometerData: LiveData<Resource<List<PedometerData>, Unit>> get() = _pedometerData

    private val _isImperialMeasureSystem = MutableLiveData<Boolean>()
    val isImperialMeasureSystem: LiveData<Boolean> get() = _isImperialMeasureSystem

    override fun onLoadingSettings() {
        Timber.d("StepsViewModel: Loading pedometer data")
        _pedometerData.postValue(Resource(Resource.Status.LOADING))
    }

    override fun onFetchSettingsError(watch: Wearer?) {
        Timber.e("StepsViewModel: Error fetching settings for watch ${watch?.objectId}")
        CrashlyticsLog.log("Failed to fetch settings for steps view, watch ID: ${watch?.objectId}")
        _pedometerData.postValue(Resource(Resource.Status.LOAD_ERROR))
    }

    override suspend fun fetchSettingInformation(watch: Wearer) {
        Timber.d("StepsViewModel: Fetching setting information for watch ${watch.objectId}")
        _watch.postValue(watch)
        
        val cal = Calendar.getInstance()
        cal.add(Calendar.DAY_OF_YEAR, -7)
        val sevenDaysAgo = cal.time
        
        Timber.d("StepsViewModel: Requesting pedometer data from ${sevenDaysAgo.time} for watch ${watch.objectId}")
        CrashlyticsLog.log("Fetching pedometer data for watch ${watch.objectId}")
        
        runCatching {
            stepsRepository.fetchUnifiedPedometerData(watch, sevenDaysAgo, 7, watch.settings?.timeZone)
        }.onSuccess { pedometerData ->
            Timber.d("StepsViewModel: Successfully fetched ${pedometerData.size} pedometer records")
            _isImperialMeasureSystem.postValue(sp.isImperialSystem)
            _pedometerData.postValue(Resource(Resource.Status.LOAD_SUCCESS, pedometerData))
        }.onFailure { error ->
            Timber.e("StepsViewModel: Failed to fetch pedometer data: ${error.message}")
            CrashlyticsLog.recordNonFatalError(error, "Error fetching pedometer data for watch ${watch.objectId}")
            _pedometerData.postValue(Resource(Resource.Status.LOAD_ERROR))
        }
    }
}