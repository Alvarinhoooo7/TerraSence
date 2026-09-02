package com.sosmartlabs.momotabletpadres.viewmodels

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.google.firebase.Firebase
import com.google.firebase.crashlytics.crashlytics
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.tabletsettings.times.schoolmode.ui.ViewStateAction
import com.sosmartlabs.momotabletpadres.models.entity.BlockedAdsHistoryEntity
import com.sosmartlabs.momotabletpadres.repositories.adblocker.BlockedAdsHistoryRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject

@HiltViewModel
class AdBlockerViewModel @Inject constructor(
    application: Application,
    private val blockedAdsHistoryRepository: BlockedAdsHistoryRepository
) : AndroidViewModel(application) {

    /**
     * Current Tablet
     */
    private lateinit var currentTablet: Tablet


    /**
     * View states handler
     */
    val viewStateHandler: MutableLiveData<List<ViewStateAction>> by lazy {
        MutableLiveData<List<ViewStateAction>>()
    }

    val summaryReturn = MutableLiveData<BlockedAdsHistoryEntity?>()

    fun loadData(tablet: Tablet) {
        Firebase.crashlytics.log("load data adBlocker")
        currentTablet = tablet
        viewStateHandler.postValue(
            listOf(
                ViewStateAction.SHOW_LOADING,
                ViewStateAction.HIDE_RETRY
            )
        )
        viewModelScope.launch(Dispatchers.IO) {
            runCatching {
                blockedAdsHistoryRepository.getBlockedAdsHistoryByTabletId(tablet.objectId!!)
            }.onSuccess {
                summaryReturn.postValue(it)
                viewStateHandler.postValue(
                    listOf(
                        ViewStateAction.HIDE_LOADING,
                        ViewStateAction.SHOW_DATA
                    )
                )
            }.onFailure {
                Timber.d("onError $it")
                with(Firebase.crashlytics) {
                    log("AdBlockerByTablet: Error loading data")
                    recordException(it)
                }
                summaryReturn.postValue(null)
                viewStateHandler.postValue(
                    listOf(
                        ViewStateAction.HIDE_LOADING,
                        ViewStateAction.HIDE_DATA,
                        ViewStateAction.SHOW_RETRY
                    )
                )
            }
        }
    }
}