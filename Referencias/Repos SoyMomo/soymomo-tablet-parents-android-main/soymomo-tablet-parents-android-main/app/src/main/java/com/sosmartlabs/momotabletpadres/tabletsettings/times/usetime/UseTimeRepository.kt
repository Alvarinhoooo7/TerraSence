package com.sosmartlabs.momotabletpadres.tabletsettings.times.usetime

import android.content.Context
import com.parse.ParseException
import com.parse.ParseObject
import com.parse.ParseQuery
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.tablet.model.remote.ParseTablet
import com.sosmartlabs.momotabletpadres.tabletsettings.times.usetime.model.UseTime
import com.sosmartlabs.momotabletpadres.tabletsettings.times.usetime.model.remote.ParseUseTime
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import com.sosmartlabs.momotabletpadres.utils.DateUtil
import dagger.hilt.android.qualifiers.ApplicationContext
import timber.log.Timber
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class UseTimeRepository @Inject constructor(
    @ApplicationContext private val context: Context
) {
    companion object {
        @Deprecated("Remove when this class extends from UseTimeRepository class in tablet core")
        @JvmStatic
        private val TIME_FORMATTER = SimpleDateFormat("HH:mm")
    }

    fun getUseTime(tablet: Tablet, fromNotification: Boolean = false): List<UseTime> {
        return getUseTimeFromNetwork(tablet).map {
            it.toUseTime()
        }
    }

    private fun getUseTimeFromNetwork(tablet: Tablet): List<ParseUseTime> {
        CrashlyticsLog.log("Querying to get use time from network")
        return ParseQuery.getQuery(ParseUseTime::class.java)
            .whereEqualTo(
                "tablet",
                ParseTablet.createWithoutData(tablet.objectId!!)
            )
            .find()
    }

    fun saveUseTimeList(useTimeList: List<UseTime>, callback: (ParseException?) -> Unit) {
        for (useTime in useTimeList) {
            val days = mutableListOf(
                useTime.days!![0],
                useTime.days!![1],
                useTime.days!![2],
                useTime.days!![3],
                useTime.days!![4],
                useTime.days!![5],
                useTime.days!![6]
            )
            useTime.days = days
        }
        ParseObject.saveAllInBackground(useTimeList.map { it.toParseUseTime() }) {
            callback(it)
        }
    }

    fun createLimitUseTime(tablet: Tablet, callback: (ParseException?, UseTime) -> Unit) {
        val parseUseTime = ParseObject.create(ParseUseTime::class.java)
        val days = mutableListOf(0, 0, 0, 0, 0, 0, 0)
        days[DateUtil.getCurrentDayId()] = 1
        parseUseTime.tablet = ParseTablet.createWithoutData(tablet.objectId!!)
        parseUseTime.days = days
        parseUseTime.isRange = false
        parseUseTime.limit = 14400
        parseUseTime.saveInBackground {
            callback(it, parseUseTime.toUseTime())
        }
    }

    fun createRangeUseTime(tablet: Tablet, callback: (ParseException?, UseTime) -> Unit) {
        val parseUseTime = ParseObject.create(ParseUseTime::class.java)
        val days = mutableListOf(0, 0, 0, 0, 0, 0, 0)
        days[DateUtil.getCurrentDayId()] = 1
        parseUseTime.tablet = ParseTablet.createWithoutData(tablet.objectId!!)
        parseUseTime.days = days
        parseUseTime.isRange = true
        parseUseTime.from = "00:01"
        parseUseTime.to = "23:59"
        parseUseTime.saveInBackground {
            callback(it, parseUseTime.toUseTime())
        }
    }

    fun removeUseTime(useTime: UseTime, callback: (ParseException?) -> Unit) {
        useTime.toParseUseTime().deleteInBackground {
            callback(it)
        }
    }

    @Deprecated("Remove when this class extends from UseTimeRepository class in tablet core")
    private fun UseTime.toParseUseTime(): ParseUseTime {
        val parseUseTime = if (objectId != null) ParseObject.createWithoutData(
            ParseUseTime::class.java, objectId
        ) else ParseUseTime()
        parseUseTime.let {
            it.localId = id
            it.days = days
            it.from = if (from != null) TIME_FORMATTER.format(from!!) else null
            it.to = if (to != null) TIME_FORMATTER.format(to!!) else null
            it.limit = limit
            it.isRange = isRange
            it.tablet =
                if (tabletObjectId != null) ParseTablet.createWithoutData(tabletObjectId!!) else null
        }
        return parseUseTime
    }

    @Deprecated("Remove when this class extends from UseTimeRepository class in tablet core")
    private fun ParseUseTime.toUseTime() = UseTime(
        id = localId,
        objectId = objectId,
        days = days?.toMutableList() ?: mutableListOf(),
        from = if (from != null) TIME_FORMATTER.parse(from!!) else null,
        to = if (to != null) TIME_FORMATTER.parse(to!!) else null,
        limit = limit,
        isRange = isRange,
        tabletObjectId = tablet?.objectId
    )

    fun createTimeUseLimit(tablet: Tablet, limit: Int, day: Int, callback: (ParseException?, UseTime) -> Unit) {
        val parseUseTime = ParseObject.create(ParseUseTime::class.java)
        val days = mutableListOf(0, 0, 0, 0, 0, 0, 0)
        days[day] = 1
        parseUseTime.tablet = ParseTablet.createWithoutData(tablet.objectId!!)
        parseUseTime.days = days
        parseUseTime.isRange = false
        parseUseTime.limit = limit
        parseUseTime.saveInBackground {
            callback(it, parseUseTime.toUseTime())
            Timber.d("UseTime created with limit: $limit")
        }
    }

    fun createTimeUseRange(tablet: Tablet, from: Date, to: Date, day: Int, callback: (ParseException?, UseTime) -> Unit) {
        val parseUseTime = ParseObject.create(ParseUseTime::class.java)
        val days = mutableListOf(0, 0, 0, 0, 0, 0, 0)
        days[day] = 1
        parseUseTime.tablet = ParseTablet.createWithoutData(tablet.objectId!!)
        parseUseTime.days = days
        parseUseTime.from = "${from.hours}:${from.minutes}"
        parseUseTime.to = "${to.hours}:${to.minutes}"
        parseUseTime.isRange = true
        parseUseTime.limit = null
        parseUseTime.saveInBackground {
            callback(it, parseUseTime.toUseTime())
        }
    }
}