package com.sosmartlabs.momo.utils

import android.content.Context
import android.net.ConnectivityManager
import android.provider.Settings
import android.telephony.TelephonyManager
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import timber.log.Timber
import java.util.*

/**
 * Helper object to provide user country with multiple detection methods
 * Source of timeZones by country: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
 */
class CountryProvider {

    companion object {
        // Country codes
        const val CHILE = "CL"
        const val USA = "US"
        const val SPAIN = "ES"
        const val GERMANY = "DE"
        const val MEXICO = "MX"
        const val COLOMBIA = "CO"
        const val PERU = "PE"
        const val FINLAND = "FI"
        const val SWEDEN = "SE"
        private const val DEFAULT_COUNTRY = CHILE // Fallback country

        // Time zones for each country
        private val timeZoneUS = arrayOf(
            "America/Adak",
            "America/Anchorage",
            "America/Atka",
            "America/Boise",
            "America/Chicago",
            "America/Denver",
            "America/Detroit",
            "America/Fort_Wayne",
            "America/Indiana/Indianapolis",
            "America/Indiana/Knox",
            "America/Indiana/Marengo",
            "America/Indiana/Petersburg",
            "America/Indiana/Tell_City",
            "America/Indiana/Vevay",
            "America/Indiana/Vincennes",
            "America/Indiana/Winamac",
            "America/Indianapolis",
            "America/Juneau",
            "America/Kentucky/Louisville",
            "America/Kentucky/Monticello",
            "America/Knox_IN",
            "America/Los_Angeles",
            "America/Louisville",
            "America/Menominee",
            "America/Metlakatla",
            "America/New_York",
            "America/Nome",
            "America/North_Dakota/Beulah",
            "America/North_Dakota/Center",
            "America/North_Dakota/New_Salem",
            "America/Shiprock",
            "America/Sitka",
            "America/Yakutat",
            "Navajo",
            "US/Alaska",
            "US/Aleutian",
            "US/Arizona",
            "US/Central",
            "US/East-Indiana",
            "US/Eastern",
            "US/Hawaii",
            "US/Indiana-Starke",
            "US/Michigan",
            "US/Mountain",
            "US/Pacific",
            "America/Phoenix",
            "Pacific/Honolulu"
        )

        private val timeZoneCL = arrayOf(
            "America/Punta_Arenas",
            "America/Santiago",
            "Chile/Continental",
            "Chile/EasterIsland",
            "Pacific/Easter"
        )

        private val timeZoneES = arrayOf(
            "Africa/Ceuta",
            "Atlantic/Canary",
            "Europe/Madrid"
        )

        private val timeZoneDE = arrayOf(
            "Europe/Busingen",
            "Europe/Berlin",
            "Europe/Zurich"
        )

        private val timeZoneMX = arrayOf(
            "America/Bahia_Banderas",
            "America/Chihuahua",
            "America/Ciudad_Juarez",
            "America/Hermosillo",
            "America/Matamoros",
            "America/Mazatlan",
            "America/Merida",
            "America/Mexico_City",
            "America/Monterrey",
            "America/Ojinaga",
            "America/Tijuana"
        )

        private val timeZoneCO = arrayOf(
            "America/Bogota"
        )

        private val timeZonePE = arrayOf(
            "America/Lima"
        )
        
        private val timeZoneFI = arrayOf(
            "Europe/Helsinki"
        )

        private val timeZoneSE = arrayOf(
            "Europe/Stockholm"
        )

        /**
         * Main method to get country using multiple fallback strategies
         * @param context Application context
         * @return Country code in ISO-3166 format
         */
        fun getCountry(context: Context): String {
            Timber.d("CountryProvider: Starting country detection process")
            CrashlyticsLog.log("CountryProvider: Starting country detection process")
            
            val isAirplaneMode = isAirplaneModeOn(context)
            if (isAirplaneMode) {
                Timber.d("CountryProvider: Device is in airplane mode, some detection methods may fail")
                CrashlyticsLog.log("CountryProvider: Device is in airplane mode")
            }
            
            // Deliberately no GPS/Geocoder tier. Reverse-geocoding used to sit at the top of this
            // chain and was the app's worst ANR: the deprecated synchronous
            // Geocoder.getFromLocation blocks the calling thread, and getCountry() is called from
            // the main thread by most of its callers. It was also a poor signal —
            // getLastKnownLocation has no freshness contract and the old code walked every
            // provider (including `passive`, whose cache is written by other apps) taking the
            // first non-null fix, so a days-old position could outrank a live SIM read.
            //
            // Every tier below is a cheap in-process or binder read (~2ms total), which is what
            // lets getCountry() stay synchronous for all of its call sites.
            val country = getCountryByPhoneNumber(context)
                ?: getCountryByNetwork(context)
                ?: getCountryByCurrentTimeZone()
                ?: getCountryByDeviceLocale()
                ?: DEFAULT_COUNTRY
                
            Timber.d("CountryProvider: Detected country: $country")
            CrashlyticsLog.log("CountryProvider: Detected country: $country")
            return country
        }

        /**
         * Get country using SIM card information
         */
        private fun getCountryByPhoneNumber(context: Context): String? {
            Timber.d("CountryProvider: Attempting to get country by phone/SIM info")
            CrashlyticsLog.log("CountryProvider: Attempting to get country by phone/SIM info")
            
            try {
                val tManager = context.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
                
                val simCountry = tManager.simCountryIso
                val networkCountry = tManager.networkCountryIso
                
                Timber.d("CountryProvider: SIM country: $simCountry, Network country: $networkCountry")
                
                val countryCode = when {
                    simCountry.isNotBlank() -> simCountry
                    networkCountry.isNotBlank() -> networkCountry
                    else -> return null
                }
                
                val result = countryCode.uppercase().ifBlank { null }
                if (result != null) {
                    Timber.d("CountryProvider: Successfully detected country by phone: $result")
                    CrashlyticsLog.log("CountryProvider: Detected country by phone: $result")
                } else {
                    Timber.d("CountryProvider: No valid country from phone/SIM info")
                }
                return result
            } catch (e: Exception) {
                Timber.e("CountryProvider: Error getting country by phone: ${e.message}")
                CrashlyticsLog.recordNonFatalError(e, "CountryProvider: Error getting country by phone")
                return null
            }
        }

        /**
         * Get country using network information
         */
        private fun getCountryByNetwork(context: Context): String? {
            Timber.d("CountryProvider: Attempting to get country by network")
            CrashlyticsLog.log("CountryProvider: Attempting to get country by network")
            
            try {
                val connManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
                val networkInfo = connManager.activeNetworkInfo
                
                if (networkInfo?.isConnected != true) {
                    Timber.d("CountryProvider: No active network connection")
                    return null
                }
                
                Timber.d("CountryProvider: Active network: ${networkInfo.typeName}")
                
                val tManager = context.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
                val networkCountry = tManager.networkCountryIso
                
                val result = networkCountry.uppercase().ifBlank { null }
                if (result != null) {
                    Timber.d("CountryProvider: Successfully detected country by network: $result")
                    CrashlyticsLog.log("CountryProvider: Detected country by network: $result")
                } else {
                    Timber.d("CountryProvider: No valid country from network info")
                }
                return result
            } catch (e: Exception) {
                Timber.e("CountryProvider: Error getting country by network: ${e.message}")
                CrashlyticsLog.recordNonFatalError(e, "CountryProvider: Error getting country by network")
                return null
            }
        }

        /**
         * Get country using timezone (fallback method)
         */
        private fun getCountryByCurrentTimeZone(): String? {
            Timber.d("CountryProvider: Attempting to get country by timezone")
            CrashlyticsLog.log("CountryProvider: Attempting to get country by timezone")
            
            val timeZone = TimeZone.getDefault().id
            Timber.d("CountryProvider: Current timezone: $timeZone")
            
            val result = when {
                timeZoneUS.contains(timeZone) -> USA
                timeZoneCL.contains(timeZone) -> CHILE
                timeZoneES.contains(timeZone) -> SPAIN
                timeZoneDE.contains(timeZone) -> GERMANY
                timeZoneMX.contains(timeZone) -> MEXICO
                timeZoneCO.contains(timeZone) -> COLOMBIA
                timeZonePE.contains(timeZone) -> PERU
                timeZoneFI.contains(timeZone) -> FINLAND
                timeZoneSE.contains(timeZone) -> SWEDEN
                else -> null
            }
            
            if (result != null) {
                Timber.d("CountryProvider: Successfully detected country by timezone: $result")
                CrashlyticsLog.log("CountryProvider: Detected country by timezone: $result")
            } else {
                Timber.d("CountryProvider: Could not match timezone to any known country")
                CrashlyticsLog.log("CountryProvider: Unknown timezone: $timeZone")
            }

            return result
        }

        /**
         * Get country from the device's configured region.
         *
         * Last resort before [DEFAULT_COUNTRY]. This is the only tier that still works on a
         * SIM-less, offline device — exactly the case the removed GPS tier used to cover — and
         * unlike the timezone table it needs no per-country maintenance. It is the region the
         * user chose in system settings, so it is a statement of intent rather than a guess.
         */
        private fun getCountryByDeviceLocale(): String? {
            val result = Locale.getDefault().country
                .uppercase(Locale.ROOT)
                .takeIf { it.length == 2 && it.all { c -> c.isLetter() } }

            if (result != null) {
                Timber.d("CountryProvider: Successfully detected country by device locale: $result")
                CrashlyticsLog.log("CountryProvider: Detected country by device locale: $result")
            } else {
                Timber.d("CountryProvider: Device locale has no usable region")
                CrashlyticsLog.log("CountryProvider: Device locale has no usable region")
            }

            return result
        }

        /**
         * Check if airplane mode is enabled (could affect some methods)
         */
        private fun isAirplaneModeOn(context: Context): Boolean {
            val isAirplaneMode = Settings.Global.getInt(
                context.contentResolver,
                Settings.Global.AIRPLANE_MODE_ON,
                0
            ) != 0
            
            Timber.d("CountryProvider: Airplane mode is ${if (isAirplaneMode) "ON" else "OFF"}")
            return isAirplaneMode
        }
    }
}