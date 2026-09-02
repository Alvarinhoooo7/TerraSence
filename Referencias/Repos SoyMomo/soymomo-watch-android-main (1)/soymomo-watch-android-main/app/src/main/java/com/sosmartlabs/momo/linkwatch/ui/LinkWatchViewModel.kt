package com.sosmartlabs.momo.linkwatch.ui

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.analytics.FirebaseAnalytics
import com.google.firebase.analytics.logEvent
import com.sosmartlabs.momo.addfirstwatch.model.WearerStatus
import com.sosmartlabs.momo.addfirstwatch.model.remote.MobileNetworkOperator
import com.sosmartlabs.momo.addfirstwatch.repository.WearerRepository
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.linkwatch.data.WearerColor
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.sharedprefs.SharedPrefs
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import timber.log.Timber
import java.util.Date
import javax.inject.Inject
import kotlin.coroutines.CoroutineContext

@HiltViewModel
class LinkWatchViewModel @Inject constructor(private val ioContext: CoroutineContext,
                                             private val sharedPrefs: SharedPrefs,
                                             private val wearerRepository: WearerRepository,
                                             private val firebaseAnalytics: FirebaseAnalytics): ViewModel() {

    private val _completedSteps: MutableLiveData<Int> = MutableLiveData(0)
    val completedSteps: LiveData<Int>
        get() = _completedSteps

    private var _wearerStatus = MutableLiveData<WearerStatus>()
    val wearerStatus: LiveData<WearerStatus>
        get() = _wearerStatus

    private var _currentWearer = MutableLiveData<Wearer>()
    val currentWearer: LiveData<Wearer>
        get() = _currentWearer

    private var _wearerColor = MutableLiveData<WearerColor>()
    val wearerColor: LiveData<WearerColor>
        get() = _wearerColor

    private var stepSet: MutableSet<String> = mutableSetOf()

    fun incrementCompletedSteps(stepKey: String) {
        stepSet.add(stepKey)
        _completedSteps.value = stepSet.size
        saveCompletedSteps()
    }

    private fun saveCompletedSteps() {
        Timber.d("saveCompletedSteps, saving: ${_completedSteps.value} steps")
        sharedPrefs.putInt("completedSteps", _completedSteps.value ?: 0)
    }

    fun resetCompletedSteps() {
        stepSet = mutableSetOf()
        _completedSteps.value = 0
        sharedPrefs.remove("wearer")
        saveCompletedSteps()
    }

    fun setWearerColor(wearerColor: WearerColor) {
        Timber.d("setWearerColor, color: $wearerColor")
        _wearerColor.value = wearerColor
    }

    fun loadCompletedSteps() {
        Timber.d("loadCompletedSteps, loading: ${sharedPrefs.getInt("completedSteps")} steps")
        val step = sharedPrefs.getInt("completedSteps")
        stepSet = mutableSetOf()
        val values = listOf("imei", "admin", "child", "sim")
        for (i in 0 until step) {
            stepSet.add(values[i])
        }
        _completedSteps.value = sharedPrefs.getInt("completedSteps")
    }

    fun loadCurrentWearerFromSharedPrefs() {
        sharedPrefs.getParseObject<Wearer>("wearer")?.let {
            _currentWearer.value = it
        }
    }

    fun addSoyMomo() {
        firebaseAnalytics.logEvent("add_soymomo") {
            param("imei", _currentWearer.value?.imei ?: "")
        }

        viewModelScope.launch(ioContext) {
            runCatching {
                _wearerStatus.postValue(WearerStatus.SEARCH_IN_PROGRESS)
                _currentWearer.value?.let { wearer ->
                    when (wearerRepository.addWatch(wearer.deviceId)) {
                        -2 -> {
                            _wearerStatus.postValue(WearerStatus.IMEI_UNKNOWN)
                            Timber.d("Returned because of unknown")
                        }
                        -1 -> {
                            _wearerStatus.postValue(WearerStatus.WEARER_ALREADY_LINKED)
                        }
                        0 -> {
                            _wearerStatus.postValue(WearerStatus.WEARER_BELONGS_TO_OTHER_USER)
                        }
                        1 -> {
                            runCatching {
                                wearerRepository.saveWearerColor(wearer, (_wearerColor.value)?.name ?: WearerColor.BLUE.name)
                            }.onFailure {
                                Timber.e("Error saving wearer color")
                                throw it
                            }.onSuccess {
                                Timber.d("Saved wearer color")
                                _wearerStatus.postValue(WearerStatus.LINK_SUCCESS)
                            }
                        }
                        else -> {
                            _wearerStatus.postValue(WearerStatus.SEARCH_ERROR)
                        }
                    }
                }
            }.onFailure {
                _wearerStatus.postValue(WearerStatus.SEARCH_ERROR)
                Timber.e("error: $it")
                CrashlyticsLog.recordNonFatalError(it, "Error on addWatch cloud function")
            }
        }
    }

    fun verifyImeiState(imei: String) {
        var deviceId = imei.filter { it.isDigit() }
        if (deviceId.length == 15) {
            deviceId = deviceId.substring(4, 14)
            _wearerStatus.postValue(WearerStatus.SEARCH_IN_PROGRESS)
            viewModelScope.launch {
                runCatching {
                    Timber.i("DeviceId: $deviceId")
                    val status = wearerRepository.verifyImeiState(deviceId)
                    _wearerStatus.postValue(status)
                    if (status == WearerStatus.WEARER_NOT_LINKED) {
                        val wearer = wearerRepository.getWearer(deviceId)
                        resetValues(wearer!!)
                        sharedPrefs.putParseObject<Wearer>("wearer", wearer)
                        _currentWearer.postValue(wearer!!)
                    }
                }.onFailure {
                    _wearerStatus.postValue(WearerStatus.SEARCH_ERROR)
                    Timber.e("error: $it")
                    CrashlyticsLog.recordNonFatalError(
                        it,
                        "Error on verifyImeiState cloud function"
                    )
                }
            }
        }
    }

    fun verifyDeviceIdState(deviceId: String) {
        val filteredDeviceId = deviceId.filter { it.isDigit() }
        if (filteredDeviceId.length != 10) return
        verifyImeiState("0000${filteredDeviceId}0")
    }

    fun resetWearerStatus(){
        _wearerStatus.postValue(WearerStatus.IMEI_LENGTH_ERROR)
    }

    fun setWearer(wearer: Wearer?) {
        wearer?.let {
            _currentWearer.postValue(it)
        }
    }

    fun setLocalMobileNetworkOperator(mobileNetworkOperator: MobileNetworkOperator?) {
        mobileNetworkOperator?.let {
            currentWearer.value?.mobileNetworkOperator = it
        }
    }

    fun setWatchMobileNetworkOperator(mobileNetworkOperator: MobileNetworkOperator?, isOther: Boolean) {
        val wearerId = currentWearer.value?.deviceId ?: return
        viewModelScope.launch(ioContext) {
            runCatching {
                wearerRepository.setWatchMobileNetworkOperator(wearerId, mobileNetworkOperator, isOther, false)
            }.onFailure {
                Timber.e(it, "setWatchMobileNetworkOperator")
                CrashlyticsLog.recordNonFatalError(it, "Error: setWatchMobileNetworkOperator")
            }
        }
    }

    suspend fun finalLinkWatch(successCallback: () -> Unit) {
        try {
            val watch = currentWearer.value ?: return
            watch.save()
            wearerRepository.addWatch(watch.deviceId)
            successCallback()
        } catch (e: Exception) {
            Timber.d("[Link ERROR]: $e")
        }
    }

    fun setCurrentWearer(wearer: Wearer) {
        viewModelScope.launch(ioContext) {
            _currentWearer.postValue(wearer)
            sharedPrefs.putParseObject<Wearer>("wearer", wearer)
        }
    }

    private fun resetValues(watch: Wearer) {
        watch.firstName = ""
        watch.lastName = ""
        watch.remove("height")
        watch.remove("weight")
        watch.remove("image")
        watch.birthday = Date()
    }
}