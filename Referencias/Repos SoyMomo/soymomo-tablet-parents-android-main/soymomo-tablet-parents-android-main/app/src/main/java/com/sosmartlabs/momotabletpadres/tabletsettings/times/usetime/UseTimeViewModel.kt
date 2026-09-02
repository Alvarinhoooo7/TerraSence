package com.sosmartlabs.momotabletpadres.tabletsettings.times.usetime

import android.app.Application
import android.os.Build
import androidx.annotation.RequiresApi
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.parse.ParseException
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.tabletsettings.times.usetime.model.UseTime
import com.sosmartlabs.momotabletpadres.utils.DateUtil.elapsedDaySeconds
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import com.sosmartlabs.momotabletpadres.tabletsettings.interfaces.TableListState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import timber.log.Timber
import java.util.Date
import javax.inject.Inject

@HiltViewModel
class UseTimeViewModel @Inject constructor(
    application: Application,
    private val usageHoursRepository: UseTimeRepository
) : AndroidViewModel(application) {

    private lateinit var tablet: Tablet
    lateinit var useTimeList: List<UseTime>

    val rangeList: MutableLiveData<MutableList<UseTime>> by lazy {
        MutableLiveData()
    }

    val limitList: MutableLiveData<MutableList<UseTime>> by lazy {
        MutableLiveData()
    }

    val newLimitObject = MutableLiveData<UseTime>()
    val newRangeObject = MutableLiveData<UseTime>()

    val rangeGroupMap = MutableLiveData<HashMap<Int, ArrayList<Pair<Int, Int>>>>()
    val limitGroupMap = MutableLiveData<HashMap<Int, Int?>>()

    val tableListState = MutableLiveData<TableListState>()
    val rangeListState = MutableLiveData<TableListState>()
    val limitListState = MutableLiveData<TableListState>()

    init {
        Timber.d("init: init Injection!")
    }

    fun loadUseHours(tablet: Tablet) {
        this.tablet = tablet
        tableListState.postValue(TableListState.Loading)
        viewModelScope.launch(Dispatchers.IO) {
            runCatching {
                useTimeList = usageHoursRepository.getUseTime(tablet)
            }.onSuccess {
                val (range, limit) = useTimeList.partition {
                    it.isRange!!
                }
                if (useTimeList.isNotEmpty()) {
                    tableListState.postValue(TableListState.Populated)
                } else {
                    tableListState.postValue(TableListState.Empty)
                }
                if (limit.isEmpty()) {
                    limitListState.postValue(TableListState.Empty)
                } else {
                    limitListState.postValue(TableListState.Populated)
                }
                if (range.isEmpty()) {
                    rangeListState.postValue(TableListState.Empty)
                } else {
                    rangeListState.postValue(TableListState.Populated)
                }
                rangeList.postValue(range.toMutableList())
                limitList.postValue(limit.toMutableList())
                generateRangeMaps(range)
                generateLimitMaps(limit)

            }.onFailure {
                tableListState.postValue(TableListState.Error)
            }
        }
    }

    fun checkUseHours() {
        viewModelScope.launch(Dispatchers.IO) {
            runCatching {
                useTimeList = usageHoursRepository.getUseTime(tablet)
            }.onSuccess {
                val (range, limit) = useTimeList.partition {
                    it.isRange!!
                }
                if (useTimeList.isNotEmpty()) {
                    tableListState.postValue(TableListState.Populated)
                } else {
                    tableListState.postValue(TableListState.Empty)
                }
                if (limit.isEmpty()) {
                    limitListState.postValue(TableListState.Empty)
                } else {
                    limitListState.postValue(TableListState.Populated)
                }
                if (range.isEmpty()) {
                    rangeListState.postValue(TableListState.Empty)
                } else {
                    rangeListState.postValue(TableListState.Populated)
                }
                generateRangeMaps(range)
                generateLimitMaps(limit)

            }.onFailure {
                tableListState.postValue(TableListState.Error)
            }
        }
    }

    fun saveUseTimeList(useTimeList: List<UseTime>, callback: (ParseException?) -> Unit) {
        usageHoursRepository.saveUseTimeList(useTimeList) {
            callback(it)
        }
    }

    fun createLimitUseTime() {
        usageHoursRepository.createLimitUseTime(tablet) { parseException, useTime ->
            if (parseException == null) {
                loadUseHours(tablet)
            }
        }
    }

    fun createRangeUseTime() {
        usageHoursRepository.createRangeUseTime(tablet) { parseException, useTime ->
            if (parseException == null) {
                loadUseHours(tablet)
            }
        }
    }

    fun removeUseTime(useTime: UseTime, callback: (ParseException?) -> Unit) {
        tableListState.postValue(TableListState.Loading)
        usageHoursRepository.removeUseTime(useTime) {
            callback(it)
        }
    }

    fun generateLimitMaps(list: List<UseTime>) {
        val tempDayLimitChecker = HashMap<Int, Int?>()

        for (i in 0..6) {
            tempDayLimitChecker[i] = null
        }

        for (useTime in list) {
            if (!useTime.isRange!!) {
                for (i in useTime.days!!.indices) {
                    val previousHashVal = tempDayLimitChecker[i]
                    if (useTime.days!![i] == 1) {
                        val limitSeconds = useTime.limit!!
                        if (previousHashVal == null) {
                            tempDayLimitChecker[i] = limitSeconds
                        } else if (limitSeconds < previousHashVal) {
                            tempDayLimitChecker[i] = limitSeconds
                        }
                    }
                }
            }
        }

        limitGroupMap.postValue(tempDayLimitChecker)
    }

    fun generateRangeMaps(list: List<UseTime>) {
        val tempDayRangeChecker = HashMap<Int, ArrayList<Pair<Int, Int>>>()

        for (i in 0..6) {
            tempDayRangeChecker[i] = ArrayList()
        }

        for (useTime in list) {
            if (useTime.isRange!!) {
                for (i in useTime.days!!.indices) {
                    val previousHashPairList = tempDayRangeChecker[i]
                    if (useTime.days!![i] == 1) {
                        val storedFromSeconds =
                            useTime.from!!.elapsedDaySeconds
                        val storedToSeconds =
                            useTime.to!!.elapsedDaySeconds
                        val storedPair = Pair(storedFromSeconds, storedToSeconds)
                        previousHashPairList!!.add(storedPair)
                    }
                }
            }
        }

        // Clean ranges
        for (i in tempDayRangeChecker.keys) {
            val array = ArrayList<Pair<Int, Int>>(tempDayRangeChecker[i]!!.distinct())
            tempDayRangeChecker[i] = array
        }

        rangeGroupMap.postValue(tempDayRangeChecker)
    }

    fun sortList() {
        limitList.value?.let { useTime ->
            useTime.sortBy {
                it.days.indexOfFirst { day -> day == 1 }
            }
        }
    }

    fun createTimeUseLimit(currentTablet: Tablet, limit: Int, day: Int) {
        tablet = currentTablet
        Timber.d("createTimeUseLimit: ")
        viewModelScope.launch(Dispatchers.IO) {
            usageHoursRepository.createTimeUseLimit(tablet, limit, day) { parseException, useTime ->
                if (parseException == null) {
                    loadUseHours(tablet)
                }
            }
        }
    }

    fun deleteUseTimeLimit(currentTablet: Tablet, useTime: UseTime) {
        tablet = currentTablet
        val currentUseTimes = limitList.value
        viewModelScope.launch(Dispatchers.IO) {
            runCatching {
                usageHoursRepository.removeUseTime(useTime) {
                    currentUseTimes?.let {
                        if (it.remove(useTime)) {
                            limitList.postValue(it)
                        }
                    }
                }
            }.onFailure {
                CrashlyticsLog.recordNonFatalError(it, "Error on delete use time")
            }
        }
    }

    @RequiresApi(Build.VERSION_CODES.N)
    fun updateUseTimeLimit(currentTablet: Tablet, useTime: UseTime) {
        tablet = currentTablet
        limitList.value?.let { useTimes ->
            useTimes.replaceAll(fun(useTimeItem: UseTime): UseTime {
                if (useTimeItem.id == useTime.id) {
                    return useTime
                }
                return useTimeItem
            })
            limitList.postValue(useTimes)
        }
    }


    fun createTimeUseRange(currentTablet: Tablet, from: Date, to: Date, day: Int) {
        tablet = currentTablet
        Timber.d("createTimeUseRange: ")
        viewModelScope.launch(Dispatchers.IO) {
            usageHoursRepository.createTimeUseRange(tablet, from, to, day) { parseException, useTime ->
                if (parseException == null) {
                    loadUseHours(tablet)
                }
            }
        }
    }

    fun deleteUseTimeRange(currentTablet: Tablet, useTime: UseTime) {
        tablet = currentTablet
        val currentUseTimes = rangeList.value
        viewModelScope.launch(Dispatchers.IO) {
            runCatching {
                usageHoursRepository.removeUseTime(useTime) {
                    currentUseTimes?.let {
                        if (it.remove(useTime)) {
                            rangeList.postValue(it)
                        }
                    }
                }
            }.onFailure {
                CrashlyticsLog.recordNonFatalError(it, "Error on delete use time")
            }
        }
    }

    @RequiresApi(Build.VERSION_CODES.N)
    fun updateUseTimeRange(currentTablet: Tablet, useTime: UseTime) {
        tablet = currentTablet
        rangeList.value?.let { useTimes ->
            useTimes.replaceAll(fun(useTimeItem: UseTime): UseTime {
                if (useTimeItem.id == useTime.id) {
                    return useTime
                }
                return useTimeItem
            })
            rangeList.postValue(useTimes)
        }
    }
}