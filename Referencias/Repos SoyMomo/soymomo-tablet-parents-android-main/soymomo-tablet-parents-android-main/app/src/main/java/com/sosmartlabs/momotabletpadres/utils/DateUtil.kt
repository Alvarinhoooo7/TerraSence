package com.sosmartlabs.momotabletpadres.utils

import android.content.Context
import android.os.Build
import androidx.annotation.RequiresApi
import com.sosmartlabs.momotabletpadres.R
import timber.log.Timber
import java.text.DateFormat
import java.text.SimpleDateFormat
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId
import java.util.*
import java.util.concurrent.TimeUnit
import kotlin.math.floor

object DateUtil {
    const val LAST_HOUR = 0
    const val TODAY = 1
    const val THIS_WEEK = 2
    const val THIS_MONTH = 3
    const val EVERYTHING = 4
    val location: Locale
        get() = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) Locale.getDefault(
            Locale.Category.FORMAT
        ) else Locale.getDefault()

    fun findStartDateByInterval(interval: Int) = when (interval) {
        LAST_HOUR -> getLastHour()
        TODAY -> getStartOfDay()
        THIS_WEEK -> getStartOfCurrentWeek()
        THIS_MONTH -> getStartOfCurrentMonth()
        else -> getLastHour()
    }

    fun getIntervalString(mContext: Context, interval: Int): String {
        return when (interval) {
            LAST_HOUR -> mContext.getString(R.string.last_hour_interval)
            TODAY -> mContext.getString(R.string.today_interval)
            THIS_WEEK -> mContext.getString(R.string.this_week_interval)
            THIS_MONTH -> mContext.getString(R.string.this_month_interval)
            else -> mContext.getString(R.string.all_time_interval)
        }
    }

    fun isDateFuture(date: String): Boolean {
        val formatter = SimpleDateFormat("dd/MM/yyyy", Locale.getDefault())
        val dateToCompare = formatter.parse(date)
        val currentDate = Date()
        return dateToCompare.after(currentDate)
    }

    fun getLastHour(): Date {
        val calendar = Calendar.getInstance()
        calendar.add(Calendar.HOUR_OF_DAY, -1)
        return calendar.time
    }

    fun getStartOfDay(): Date {
        val calendar = Calendar.getInstance()
        val year = calendar.get(Calendar.YEAR)
        val month = calendar.get(Calendar.MONTH)
        val day = calendar.get(Calendar.DATE)
        calendar.set(year, month, day, 0, 0, 0)
        return calendar.time
    }

    fun getEndOfDay(): Date {
        val calendar = Calendar.getInstance()
        val year = calendar.get(Calendar.YEAR)
        val month = calendar.get(Calendar.MONTH)
        val day = calendar.get(Calendar.DATE)
        calendar.set(year, month, day, 23, 59, 59)
        return calendar.time
    }

    fun getStartOfCurrentWeek(): Date {
        val calendar = Calendar.getInstance()
        // Force a MONDAY-start week, independent of the device locale. The usage chart
        // and its day labels ("L M M J V S D" / "Lun..Dom") are Monday-first, so the
        // "Week" app list must use the same boundary — otherwise on a Sunday-first
        // locale (e.g. en-US) the list includes last Sunday while the chart/averages
        // (hardcoded Monday-first) don't, and the two disagree. Compute Monday by hand
        // rather than via firstDayOfWeek so it's deterministic on every locale.
        val daysFromMonday = (calendar.get(Calendar.DAY_OF_WEEK) - Calendar.MONDAY + 7) % 7
        calendar.add(Calendar.DAY_OF_YEAR, -daysFromMonday)
        calendar.set(Calendar.HOUR_OF_DAY, 0)
        calendar.set(Calendar.MINUTE, 0)
        calendar.set(Calendar.SECOND, 0)
        calendar.set(Calendar.MILLISECOND, 0)
        return calendar.time
    }

    /** Midnight of the Monday one week before [getStartOfCurrentWeek]. */
    fun getStartOfLastWeek(): Date {
        val calendar = Calendar.getInstance()
        calendar.time = getStartOfCurrentWeek()
        calendar.add(Calendar.DAY_OF_YEAR, -7)
        return calendar.time
    }

    fun getStartOfCurrentMonth(): Date {
        val calendar = Calendar.getInstance()
        calendar.set(Calendar.DAY_OF_MONTH, 1)
        // set(DAY_OF_MONTH) alone leaves the time-of-day at "now", so the month
        // boundary lands at the 1st at the current wall-clock time and drifts
        // every call — pin it to midnight.
        calendar.set(Calendar.HOUR_OF_DAY, 0)
        calendar.set(Calendar.MINUTE, 0)
        calendar.set(Calendar.SECOND, 0)
        calendar.set(Calendar.MILLISECOND, 0)
        return calendar.time
    }

    fun getCurrentDayId(): Int {
        // 0-> monday, 6-> sunday
        val day = Calendar.getInstance().get(Calendar.DAY_OF_WEEK)
        return if (day == 1) {
            6
        } else {
            day - 2
        }
    }

    /**
     * Compact, scannable duration: "1h 0m", "4m 40s", "25s".
     * Seconds are dropped once the total reaches an hour (too granular to matter).
     */
    fun getFormattedTime(mContext: Context, timeInSeconds: Long): String {
        val hours = timeInSeconds / 3600
        val minutes = (timeInSeconds % 3600) / 60
        val seconds = timeInSeconds % 60
        return when {
            hours > 0 -> "${hours}h ${minutes}m"
            minutes > 0 -> if (seconds > 0) "${minutes}m ${seconds}s" else "${minutes}m"
            else -> "${seconds}s"
        }
    }

    fun getLastYear(): Date {
        val calendar = Calendar.getInstance()
        calendar.add(Calendar.YEAR, -1)
        return calendar.time
    }

    fun getDayString(mContext: Context, day: Int): String {
        val mDaysNames = mContext.resources.getStringArray(R.array.days_initial)
        return mDaysNames[day]
    }

    fun timeLimitStringFormatter(seconds: Int): String {
        val hours = floor(seconds / 3600.0).toInt()
        val minutes = ((seconds - 3600 * hours) / 60).toInt()
        val stringMinute = if (minutes < 10) {
            "0${minutes}m"
        } else {
            "${minutes}m"
        }
        return if (hours < 1) {
            stringMinute
        } else {
            "${hours}h : " + stringMinute
        }
    }

    fun timeRangeStringFormatter(seconds: Int): String {
        val hours = floor(seconds / 3600.0).toInt()
        val minutes = ((seconds - 3600 * hours) / 60)
        val stringHours = if (hours < 10) {
            "0$hours"
        } else {
            "$hours"
        }
        val stringMinute = if (minutes < 10) {
            "0$minutes"
        } else {
            "$minutes"
        }
        return "$stringHours:$stringMinute"
    }

    /**
     * Obtains a formatted date and time for been displayed to the user
     * @param date [Date] to format
     * @return formatted date and time
     */

    fun getFormattedDateTime(date: Date): String {
        val dtf = DateFormat.getDateTimeInstance(DateFormat.SHORT, DateFormat.SHORT, location)
        return dtf.format(date)
    }

    /**
     * Obtains a formatted date for been displayed to the user
     * @param date [Date] to format
     * @return formatted date
     */

    fun getFormattedOnlyDate(date: Date): String {
        val df = DateFormat.getDateInstance(DateFormat.SHORT, location)
        return df.format(date)
    }

    /**
     * Obtains a formatted time for been displayed to the user
     * @param date [Date] to format
     * @return formatted time
     */

    fun getFormattedOnlyTime(date: Date): String {
        val tf = DateFormat.getTimeInstance(DateFormat.SHORT, location)
        return tf.format(date)
    }

    fun formatTime(date: Date): String {
        val formatter = SimpleDateFormat("hh:mm a", Locale.getDefault())
        return formatter.format(date)
    }

    /**
     * Obtains hours and minutes in seconds
     * @return hours plus minutes added
     */
    val Date.elapsedDaySeconds: Int get() {
        val calendar = Calendar.getInstance()
        calendar.time = this
        val h = calendar[Calendar.HOUR_OF_DAY]
        val m = calendar[Calendar.MINUTE]
        return h * 3600 + m * 60
    }

    /**
     * Obtains only hours using calendar for this action
     * @return hours
     */
    val  Date.onlyHours: Int get() {
        val calendar = Calendar.getInstance()
        calendar.time = this
        return calendar[Calendar.HOUR_OF_DAY]
    }

    /**
     * Obtains only minutes using calendar for this action
     * @return hours
     */
    val Date.onlyMinutes: Int get() {
        val calendar = Calendar.getInstance()
        calendar.time = this
        return calendar[Calendar.MINUTE]
    }

    /**
     * Convert local time to date
     * @return formatted time
     */
    @RequiresApi(Build.VERSION_CODES.O)
    fun convertLocalTimeToDate(it: LocalTime): String {
        val date = Date.from(it.atDate(LocalDate.now()).atZone(ZoneId.systemDefault()).toInstant())
        return getFormattedOnlyTime(date)
    }

    fun getTwoDaysAgo(): Date {
        val calendar = Calendar.getInstance()
        val year = calendar.get(Calendar.YEAR)
        val month = calendar.get(Calendar.MONTH)
        val day = calendar.get(Calendar.DATE)
        calendar.set(year, month, day, 0, 0, 0)
        calendar.add(Calendar.DAY_OF_YEAR, -1)
        return calendar.time
    }

    fun getThreeDaysAgo(): Date {
        val calendar = Calendar.getInstance()
        val year = calendar.get(Calendar.YEAR)
        val month = calendar.get(Calendar.MONTH)
        val day = calendar.get(Calendar.DATE)
        calendar.set(year, month, day, 0, 0, 0)
        calendar.add(Calendar.DAY_OF_YEAR, -2)
        return calendar.time
    }

    fun getFourDaysAgo(): Date {
        val calendar = Calendar.getInstance()
        val year = calendar.get(Calendar.YEAR)
        val month = calendar.get(Calendar.MONTH)
        val day = calendar.get(Calendar.DATE)
        calendar.set(year, month, day, 0, 0, 0)
        calendar.add(Calendar.DAY_OF_YEAR, -3)
        return calendar.time
    }

    fun getFiveDaysAgo(): Date {
        val calendar = Calendar.getInstance()
        val year = calendar.get(Calendar.YEAR)
        val month = calendar.get(Calendar.MONTH)
        val day = calendar.get(Calendar.DATE)
        calendar.set(year, month, day, 0, 0, 0)
        calendar.add(Calendar.DAY_OF_YEAR, -4)
        return calendar.time
    }

    fun getSixDaysAgo(): Date {
        val calendar = Calendar.getInstance()
        val year = calendar.get(Calendar.YEAR)
        val month = calendar.get(Calendar.MONTH)
        val day = calendar.get(Calendar.DATE)
        calendar.set(year, month, day, 0, 0, 0)
        calendar.add(Calendar.DAY_OF_YEAR, -5)
        return calendar.time
    }

    fun getSevenDaysAgo(): Date {
        val calendar = Calendar.getInstance()
        val year = calendar.get(Calendar.YEAR)
        val month = calendar.get(Calendar.MONTH)
        val day = calendar.get(Calendar.DATE)
        calendar.set(year, month, day, 0, 0, 0)
        calendar.add(Calendar.DAY_OF_YEAR, -6)
        return calendar.time
    }

    fun getTwoWeeksAgo(): Date {
        val calendar = Calendar.getInstance()
        val year = calendar.get(Calendar.YEAR)
        val month = calendar.get(Calendar.MONTH)
        val day = calendar.get(Calendar.DATE)
        calendar.set(year, month, day, 0, 0, 0)
        calendar.add(Calendar.DAY_OF_YEAR, -13)
        Timber.d("getTwoWeeksAgo: ${calendar.time}")
        return calendar.time
    }
}