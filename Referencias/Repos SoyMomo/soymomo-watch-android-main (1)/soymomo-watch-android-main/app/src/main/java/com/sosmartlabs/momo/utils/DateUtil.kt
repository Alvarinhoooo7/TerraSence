package com.sosmartlabs.momo.utils

import android.os.Build
import java.text.DateFormat
import java.text.SimpleDateFormat
import java.util.*

object DateUtil {
    val location: Locale
        get() =
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) Locale.getDefault(Locale.Category.FORMAT) else Locale.getDefault()


    /**
     * How long ago [date] was, phrased for the reader ("3 hr. ago").
     *
     * Localised by the platform in every locale the app ships, so it costs no new strings
     * and carries no coupling to the app-usage duration plurals, where a rename there would
     * silently ship an empty duration here.
     *
     * Past roughly a week the platform switches to an absolute date ("June 19") — deliberate:
     * at that range a date is easier to act on than a count of days.
     *
     * Used by the disconnected banner on the map and the disconnected card in chat, which
     * must phrase "last seen" identically.
     */
    fun getElapsedSince(date: Date): CharSequence {
        val now = System.currentTimeMillis()
        // Clamp future timestamps to now. getRelativeTimeSpanString renders them as "in 5
        // min.", and a watch whose clock has drifted forward is not hypothetical here — it
        // is literally one of the five causes the disconnection screen lists. "Last seen in
        // 5 minutes" is nonsense in the one place a parent is trying to work out what
        // happened.
        val at = if (date.time > now) now else date.time
        return android.text.format.DateUtils.getRelativeTimeSpanString(
            at,
            now,
            android.text.format.DateUtils.MINUTE_IN_MILLIS,
            android.text.format.DateUtils.FORMAT_ABBREV_RELATIVE
        )
    }

    /**
     * Obtains a formatted date and time for been displayed to the user
     * @param date [Date] to format
     * @return formatted date and time
     */

    fun getFormattedDateTime(date: Date): String {
        val dtf = DateFormat.getDateTimeInstance(DateFormat.SHORT, DateFormat.SHORT, location).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }
        return dtf.format(date)
    }

    /**
     * Obtains a formatted date and time for been displayed to the user
     * @param date [Date] to format
     * @return formatted date and time
     */

    fun getFormattedDateTimeDefaultTimeZone(date: Date): String {
        // Custom format: "8 Aug. 4:46 p. m."
        val sdf = SimpleDateFormat("d MMM h:mm a", location).apply {
            timeZone = TimeZone.getDefault()
        }
        return sdf.format(date)
    }

    /**
     * Obtains a formatted date for been displayed to the user
     * @param date [Date] to format
     * @return formatted date
     */

    fun getFormattedOnlyDate(date: Date): String {
        val df = DateFormat.getDateInstance(DateFormat.SHORT, location).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }
        return df.format(date)
    }

    /**
     * Obtains a formatted time for been displayed to the user
     * @param date [Date] to format
     * @return formatted time
     */

    fun getFormattedOnlyTime(date: Date): String {
        val tf = DateFormat.getTimeInstance(DateFormat.SHORT, location).apply {
            timeZone = TimeZone.getDefault()
        }
        return tf.format(date)
    }

    /**
     * Obtains a formatted time in 24 hour format with neutral locale.
     * Useful for formatted dates to be written in Parse/Room databases
     * @param date [Date] to format
     * @return Formatted time in HH:mm.
     */
    fun get24HoursFormattedTimeNoLocale(date: Date): String {
        val tf = SimpleDateFormat("HH:mm", Locale.ROOT)
        return tf.format(date)
    }

    fun getDateFromString(raw: String): Date {
        val df = SimpleDateFormat("HH:mm", Locale.ROOT).apply {
            isLenient = false          // reject things like "25:00"
            timeZone = TimeZone.getDefault()
        }
        return df.parse(raw) ?: Date() // fallback: now
    }

    /**
     * Converts a watch timezone string (e.g. "-4", "5.30") to a Java TimeZone ID (e.g. "GMT-4", "GMT+530").
     * Returns "GMT" if the input is null.
     */
    fun formatWatchTimeZone(timeZone: String?): String {
        if (timeZone == null) return "GMT"

        val tz = timeZone.split("\\.".toRegex()).toTypedArray()
        var result = "GMT"

        if (!tz[0].contains("-")) result += "+"
        result += tz[0]

        if (tz.size > 1) result += tz[1].toInt() * 60 / 100

        return result
    }
}