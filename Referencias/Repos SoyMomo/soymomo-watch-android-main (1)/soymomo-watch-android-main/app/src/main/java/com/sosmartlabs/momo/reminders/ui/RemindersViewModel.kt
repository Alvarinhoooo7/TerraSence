package com.sosmartlabs.momo.reminders.ui

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.crashlytics.crashlytics
import com.google.firebase.Firebase
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.reminders.model.Reminder
import com.sosmartlabs.momo.reminders.model.RemindersRepository
import com.sosmartlabs.momo.reminders.model.WatchApplication
import com.sosmartlabs.momo.utils.Resource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject
import kotlin.coroutines.CoroutineContext

@HiltViewModel
class RemindersViewModel @Inject constructor(
    private val externalScope: CoroutineScope,
    private val ioContext: CoroutineContext,
    private val remindersRepository: RemindersRepository
) : ViewModel() {

    private val _reminderList = MutableLiveData<Resource<List<Reminder>, Unit>>()
    val reminderList: LiveData<Resource<List<Reminder>, Unit>> get() = _reminderList

    private val _currentReminder = MutableLiveData<Resource<Reminder, Unit>>()
    val currentReminder: LiveData<Resource<Reminder, Unit>> get() = _currentReminder

    private val _currentReminderType = MutableLiveData(Reminder.TYPE_ALERT)
    val currentReminderType: LiveData<String> get() = _currentReminderType

    private val _watchApplicationList = MutableLiveData<Resource<List<WatchApplication>, Unit>>()
    val watchApplicationList: LiveData<Resource<List<WatchApplication>, Unit>> get() = _watchApplicationList

    private val _currentReminderApp = MutableLiveData<Resource<WatchApplication?, Unit>>()
    val currentReminderApp: LiveData<Resource<WatchApplication?, Unit>> get() = _currentReminderApp

    lateinit var watch: Wearer

    fun getReminders() {
        _reminderList.value = Resource(Resource.Status.LOADING)
        viewModelScope.launch(ioContext) {
            runCatching {
                val reminderList =
                    remindersRepository.getReminderList(watch).sortedByDescending { it.from }
                _reminderList.postValue(Resource(Resource.Status.LOAD_SUCCESS, reminderList))
            }.onFailure {
                handleException(
                    it, _reminderList, Resource.Status.LOAD_ERROR, "Error get Reminder List"
                )
            }
        }
    }

    fun getWatchAppsList() {
        Timber.d("fetch watchAppList")
        _watchApplicationList.value = Resource(Resource.Status.LOADING)
        viewModelScope.launch(ioContext) {
            runCatching {
                remindersRepository.getWatchAppsList(watch)
            }.onSuccess {
                _watchApplicationList.postValue(Resource(Resource.Status.LOAD_SUCCESS, it))
            }.onFailure {
                handleException(
                    it,
                    _watchApplicationList,
                    Resource.Status.LOAD_ERROR,
                    "Error get watch application list"
                )
            }
        }
    }


    fun addAlertReminder(
        name: String,
        notify: Boolean,
        from: String,
        days: List<Int>,
        hasVibration: Boolean,
        requireValidation: Boolean,
        hasApplication: Boolean,
        packageName: String?,
        emoji: String
    ) {
        _currentReminder.value = Resource(Resource.Status.ADDING, null)
        externalScope.launch(ioContext) {
            runCatching {
                val remindersList = reminderList.value?.data?.toMutableList() ?: mutableListOf()
                val newAlert = remindersRepository.addNewAlertReminder(
                    watch,
                    name,
                    notify,
                    from,
                    days,
                    hasVibration,
                    requireValidation,
                    emoji,
                    hasApplication,
                    packageName
                )

                remindersList += newAlert
                remindersList.sortedByDescending { it.from }
                _currentReminder.postValue(Resource(Resource.Status.ADDING_SUCCESS, newAlert))
                _reminderList.postValue(Resource(Resource.Status.ADDING_SUCCESS, remindersList))
            }.onFailure {
                handleException(
                    it, _currentReminder, Resource.Status.ADDING_ERROR, "Error adding alert"
                )
            }
        }
    }

    fun addTaskReminder(
        name: String,
        notify: Boolean,
        from: String,
        to: String,
        postponeTask: Int,
        days: List<Int>,
        hasVibration: Boolean,
        requireValidation: Boolean,
        hasApplication: Boolean,
        packageName: String?,
        emoji: String
    ) {
        _currentReminder.value = Resource(Resource.Status.ADDING, null)
        externalScope.launch(ioContext) {
            runCatching {
                val remindersList = reminderList.value?.data?.toMutableList() ?: mutableListOf()
                val newTask = remindersRepository.addNewTaskReminder(
                    watch, name, notify, from, to, postponeTask, days, hasVibration,
                    requireValidation, emoji, hasApplication, packageName
                )

                remindersList += newTask
                _currentReminder.postValue(Resource(Resource.Status.ADDING_SUCCESS, newTask))
                remindersList.sortedByDescending { it.from }
                _reminderList.postValue(Resource(Resource.Status.ADDING_SUCCESS, remindersList))
            }.onFailure {
                handleException(
                    it, _currentReminder, Resource.Status.ADDING_ERROR, "Error adding task"
                )
            }
        }
    }

    fun removeReminder(reminder: Reminder) {
        _currentReminder.value = Resource(Resource.Status.DELETING, reminder)
        externalScope.launch(ioContext) {
            runCatching {
                val remindersList = _reminderList.value!!.data!!.toMutableList()
                remindersRepository.deleteReminder(reminder)
                remindersList -= reminder
                remindersList.sortedByDescending { it.from }
                _currentReminder.postValue(Resource(Resource.Status.DELETING_SUCCESS, reminder))
                _reminderList.postValue(Resource(Resource.Status.DELETING_SUCCESS, remindersList))
            }.onFailure {
                handleException(
                    it, _currentReminder, Resource.Status.DELETING_ERROR, "Error removing reminder"
                )
            }
        }
    }

    fun updateAlertReminder(
        name: String, notify: Boolean, from: String, days: List<Int>, hasVibration: Boolean,
        requireValidation: Boolean, hasApplication: Boolean, packageName: String?, emoji: String
    ) {
        val reminder = currentReminder.value?.data!!
        _currentReminder.value = Resource(Resource.Status.UPDATING, reminder)
        externalScope.launch(ioContext) {
            runCatching {
                val updateReminder = remindersRepository.updateCurrentAlert(
                    reminder, name, notify, from, days,
                    hasVibration, requireValidation, hasApplication, packageName, emoji
                )
                _currentReminder.postValue(
                    Resource(
                        Resource.Status.UPDATING_SUCCESS,
                        updateReminder
                    )
                )
            }.onFailure {
                handleException(
                    it,
                    _currentReminder,
                    Resource.Status.UPDATING_ERROR,
                    "Error updating alert"
                )
            }
        }
    }

    fun updateTaskReminder(
        name: String,
        notify: Boolean,
        from: String,
        to: String,
        postponeTask: Int,
        days: List<Int>,
        hasVibration: Boolean,
        requireValidation: Boolean,
        hasApplication: Boolean,
        packageName: String?,
        emoji: String
    ) {
        val reminder = currentReminder.value?.data!!
        _currentReminder.value = Resource(Resource.Status.UPDATING, reminder)
        externalScope.launch(ioContext) {
            runCatching {
                val updateReminder = remindersRepository.updateCurrentTask(
                    reminder, name, notify, from, to, postponeTask, days,
                    hasVibration, requireValidation, hasApplication, packageName, emoji
                )
                _currentReminder.postValue(
                    Resource(
                        Resource.Status.UPDATING_SUCCESS,
                        updateReminder
                    )
                )
            }.onFailure {
                handleException(
                    it, _currentReminder, Resource.Status.UPDATING_ERROR, "Error updating alert"
                )
            }
        }
    }

    fun setCurrentReminder(reminder: Reminder?) {
        _currentReminder.value =
            if (reminder != null) Resource(Resource.Status.LOAD_SUCCESS, reminder) else null
        if (reminder == null) return
        else if (!reminder.hasApplication) {
            _currentReminderApp.value = Resource(Resource.Status.LOAD_SUCCESS, null)
            return
        }
        viewModelScope.launch(ioContext) {
            runCatching {
                remindersRepository.getWatchApp(reminder.packageName!!, watch)
            }.onSuccess {
                _currentReminderApp.postValue(Resource(Resource.Status.LOAD_SUCCESS, it))
            }.onFailure {
                _currentReminderApp.postValue(Resource(Resource.Status.LOAD_ERROR))
                handleException(
                    it, _currentReminderApp, Resource.Status.LOAD_ERROR, "Error loading current reminder app"
                )
            }
        }
    }

    fun changeReminderType(type: String) {
        _currentReminderType.postValue(type)
    }

    fun updateReminderState(reminder: Reminder, enabled: Boolean) {
        externalScope.launch(ioContext) {
            runCatching {
                remindersRepository.updateEnable(reminder, enabled)
            }.onSuccess {
                // The list carries no data while it reloads, which is what a rotation mid-toggle
                // leaves behind. Nothing to re-sort then: the getReminders() that reset it will
                // publish the fresh list. A throw here would escape runCatching entirely.
                val reminders = reminderList.value?.data
                if (reminders == null) {
                    Timber.d("Reminder state updated while the list was reloading, skipping refresh")
                    return@onSuccess
                }
                _reminderList.postValue(
                    Resource(
                        Resource.Status.LOAD_SUCCESS,
                        reminders.sortedByDescending { it.from }
                    )
                )
            }.onFailure {
                handleException(
                    it,
                    _currentReminder,
                    Resource.Status.LOAD_ERROR,
                    "Error updating state reminder"
                )
            }
        }
    }

    private fun <T, U> handleException(
        exception: Throwable, liveData: MutableLiveData<Resource<T, U>>,
        defaultStatus: Resource.Status, errorLog: String,
        resourceData: T? = null, errorType: U? = null
    ) {
        Timber.d(exception)

        with(Firebase.crashlytics) {
            log(errorLog)
            recordException(exception)
        }

        if (exception is RemindersRepository.ConnectionException) {
            liveData.postValue(Resource(defaultStatus, resourceData, errorType))
        } else liveData.postValue(Resource(Resource.Status.UNKNOWN_ERROR, resourceData))
    }
}
