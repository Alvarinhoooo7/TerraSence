package com.sosmartlabs.momotabletpadres.tabletsettings.times.schoolmode.model

import android.os.Build
import androidx.annotation.RequiresApi
import com.google.gson.GsonBuilder
import com.google.gson.reflect.TypeToken
import timber.log.Timber
import java.time.LocalTime

class SchoolModeMapper {

    companion object {
        /**
         * [String] to [LocalTime]. Lenient: accepts both `H:M` (legacy
         * Android writes) and `HH:MM` (cloud-canonicalised). Falls back to
         * midnight on unexpected input and logs a warning rather than
         * throwing so a corrupt record can't crash the schedule screen.
         */
        @RequiresApi(Build.VERSION_CODES.O)
        fun stringToLocalTime(stringTime: String): LocalTime {
            Timber.d("stringToTime: $stringTime")
            val sep = stringTime.split(":")
            return try {
                when {
                    sep.size >= 2 -> LocalTime.of(sep[0].toInt(), sep[1].toInt())
                    else -> {
                        Timber.w("stringToLocalTime: unexpected format '$stringTime', defaulting to 00:00")
                        LocalTime.MIDNIGHT
                    }
                }
            } catch (e: NumberFormatException) {
                Timber.w(e, "stringToLocalTime: parse failed for '$stringTime', defaulting to 00:00")
                LocalTime.MIDNIGHT
            }
        }


        /**
         * [LocalTime] to [String]. Emits zero-padded `HH:MM` form to match
         * the cloud canonical format (see blocking-audit §6½.3 / cloud's
         * `padTime`). Older readers tolerate both forms.
         */
        @RequiresApi(Build.VERSION_CODES.O)
        fun localTimeToString(time: LocalTime): String{
            Timber.d("localTimeToString: $time")
            return "%02d:%02d".format(time.hour, time.minute)
        }

        /**
         * [List<SelectableAppEntity>] to [String]
         */
        fun deserializeAllowedApps(allowedApps: String): List<SelectableApp>{
            Timber.d("deserializeAllowedApps: ")
            val gson = GsonBuilder().excludeFieldsWithoutExposeAnnotation().create()
            val tmpType = object : TypeToken<List<SelectableApp>>(){}.type
            return gson.fromJson(allowedApps, tmpType)
        }

        /**
         * [String] to [List<SelectableAppEntity>]
         */
        fun serializeAllowedApps(list: List<SelectableApp>): String {
            Timber.d("serializeAllowedApps: ")
            val gson = GsonBuilder().excludeFieldsWithoutExposeAnnotation().create()
            return gson.toJson(list)
        }

    }

}