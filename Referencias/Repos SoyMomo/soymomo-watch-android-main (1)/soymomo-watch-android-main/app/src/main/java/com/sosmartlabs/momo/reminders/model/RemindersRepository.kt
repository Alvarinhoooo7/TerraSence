package com.sosmartlabs.momo.reminders.model

import com.parse.ParseException
import com.parse.ParseQuery
import com.parse.ktx.selectKeys
import com.parse.ktx.whereEqualTo
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.watchinfo.model.database.StoreInfo
import com.sosmartlabs.momo.watchinfo.model.database.WatchStatus
import com.sosmartlabs.momo.watchinfo.model.jsonparse.WatchInfoParser
import timber.log.Timber
import javax.inject.Inject

class RemindersRepository @Inject constructor(private val watchInfoParser: WatchInfoParser) {

    fun getReminderList(watch: Wearer): List<Reminder> {
        lateinit var reminders: List<Reminder>
        runCatching {
            reminders = ParseQuery.getQuery(Reminder::class.java)
                .whereEqualTo(Reminder::watch, watch)
                .find()
        }.onFailure {
            CrashlyticsLog.recordNonFatalError(it,"Error on get reminder list by watch")
            checkAndThrowConnectionExceptionOrException(it)
        }
        return reminders
    }

    /**
     * There should be an AppInfo in the MomoWatch Database
     */
    fun getWatchAppsList(watch: Wearer): List<WatchApplication> {
        lateinit var apps: List<WatchApplication>
        runCatching {
            val packagesInfo = ParseQuery.getQuery(WatchStatus::class.java)
                .whereEqualTo("deviceId", watch.deviceId)
                .selectKeys(listOf(WatchStatus::packagesInfo))
                .first
                .packagesInfo
            val storeInfoApps = getStoreInfoApps()
            val storeInfoPackagesName = storeInfoApps.map { it.packageName }
            if (packagesInfo != null) {
                val packagesInfoDeserialized =
                    watchInfoParser.getPackagesInfo(packagesInfo).filter { packageInfo ->
                        packageInfo.packageName in storeInfoPackagesName
                    }
                apps = packagesInfoDeserialized.map {
                    WatchApplication(
                        it.packageName,
                        storeInfoApps.first { app -> app.packageName == it.packageName }.name,
                        storeInfoApps.first { app -> app.packageName == it.packageName }.image.url
                    )
                }
            } else {
                apps = emptyList()
            }

        }.onFailure {
            CrashlyticsLog.recordNonFatalError(it,"Error on get watch app list by deviceId")
            Timber.e(it)
            checkAndThrowConnectionExceptionOrException(it)
        }
        return apps
    }

    private fun getStoreInfoApps(): List<StoreInfo> {
        CrashlyticsLog.log("Querying get store info apps by StoreInfo")
        return ParseQuery.getQuery(StoreInfo::class.java).find()
    }

   fun getWatchApp(packageName: String, watch: Wearer): WatchApplication? {
      return getWatchAppsList(watch).find {
          it.packageName == packageName
      }
    }

    private fun saveReminder(
        reminder: Reminder
    ): Reminder {
        runCatching {
            reminder.save()
        }.onFailure {
            CrashlyticsLog.recordNonFatalError(it,"Error when saving the reminder")
            reminder.revert()
            checkAndThrowConnectionExceptionOrException(it)
        }
        return reminder
    }

    fun addNewAlertReminder(
        watch: Wearer, name: String, notify: Boolean, from: String, days: List<Int>,
        hasVibration: Boolean, requireValidation: Boolean, emoji: String, hasApplication: Boolean,
        packageName: String?
    ): Reminder {
        val addAlertReminder = Reminder().apply {
            this.watch = watch
            this.name = name
            this.notify = notify
            this.from = from
            this.days = days
            this.hasApplication = hasApplication
            this.packageName = packageName
            this.hasVibration = hasVibration
            this.requiresValidation = requireValidation
            this.type = Reminder.TYPE_ALERT
            this.emoji = emoji
            this.isValidated = false
            this.isActive = true
        }

        return saveReminder(addAlertReminder)
    }


    fun addNewTaskReminder(
        watch: Wearer,
        name: String,
        notify: Boolean,
        from: String,
        to: String,
        postponeTask: Int,
        days: List<Int>,
        hasVibration: Boolean,
        requireValidation: Boolean,
        emoji: String,
        hasApplication: Boolean,
        packageName: String?
    ): Reminder {
        val addTaskReminder = Reminder().apply {
            this.watch = watch
            this.name = name
            this.notify = notify
            this.from = from
            this.to = to
            this.hasApplication = hasApplication
            this.packageName = packageName
            this.postponeTask = postponeTask
            this.days = days
            this.hasVibration = hasVibration
            this.requiresValidation = requireValidation
            this.type = Reminder.TYPE_TASK
            this.emoji = emoji
            this.isValidated = false
            this.isActive = true
        }

        return saveReminder(addTaskReminder)

    }

    fun deleteReminder(reminder: Reminder) {
        runCatching {
            reminder.delete()
        }.onFailure {
            CrashlyticsLog.recordNonFatalError(it,"Error when delete reminder")
            checkAndThrowConnectionExceptionOrException(it)
        }
    }

    fun updateEnable(reminder: Reminder, enabled: Boolean) {
        reminder.apply {
            this.isActive = enabled
        }
        saveReminder(reminder)
    }

    fun updateCurrentAlert(
        reminder: Reminder,
        name: String, notify: Boolean, from: String, days: List<Int>, hasVibration: Boolean,
        requireValidation: Boolean, hasApplication: Boolean, packageName: String?, emoji: String
    ): Reminder {

        with(reminder) {
            this.name = name
            this.notify = notify
            this.from = from
            this.days = days
            this.hasVibration = hasVibration
            this.requiresValidation = requireValidation
            this.type = Reminder.TYPE_ALERT
            this.hasApplication = hasApplication
            this.packageName = packageName
            this.emoji = emoji
            this.isValidated = false
            this.isActive = true
        }
        return saveReminder(reminder)
    }

    fun updateCurrentTask(
        reminder: Reminder,
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
    ): Reminder {

        with(reminder) {
            this.name = name
            this.notify = notify
            this.from = from
            this.to = to
            this.postponeTask = postponeTask
            this.days = days
            this.hasApplication = hasApplication
            this.packageName = packageName
            this.hasVibration = hasVibration
            this.requiresValidation = requireValidation
            this.type = Reminder.TYPE_TASK
            this.emoji = emoji
            this.isValidated = false
            this.isActive = true
        }
        return saveReminder(reminder)
    }


    private fun checkAndThrowConnectionExceptionOrException(exception: Throwable): Nothing {
        if (exception is ParseException) {
            if (exception.code in
                arrayListOf(ParseException.CONNECTION_FAILED, ParseException.INVALID_JSON)
            ) {
                throw ConnectionException(exception.localizedMessage)
            }
        }

        throw exception
    }

    class ConnectionException(message: String?) : Exception(message ?: "Parse connection error")
}
