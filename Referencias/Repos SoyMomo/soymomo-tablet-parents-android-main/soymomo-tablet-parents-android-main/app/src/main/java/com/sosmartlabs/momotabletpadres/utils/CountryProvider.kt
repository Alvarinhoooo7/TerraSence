package com.sosmartlabs.momotabletpadres.utils
import android.content.Context
import android.telephony.TelephonyManager
import java.util.*

/**
 * Helper object to provide user country
 * Source of timeZones by country: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
 */
class CountryProvider {

    companion object {

        const val chile = "CL"
        const val usa = "US"
        const val spain = "ES"
        const val germany = "DE"

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
            "Pacific/Easter")

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

        /**
         * @param context An application context from the component calling this method
         * @return country of user in ISO-3166 (https://en.m.wikipedia.org/wiki/ISO_3166-1_alpha-2)
         */
        fun getCountry(context: Context): String {
            return getCountryByPhoneNumber(context) ?: getCountryByCurrentTimeZone()
        }

        /**
         * @return country of user in ISO-3166 (https://en.m.wikipedia.org/wiki/ISO_3166-1_alpha-2)
         */
        private fun getCountryByCurrentTimeZone(): String {
            val timeZone = TimeZone.getDefault().id
            return when {
                timeZoneUS.contains(timeZone) -> "US"
                timeZoneCL.contains(timeZone) -> "CL"
                timeZoneES.contains(timeZone) -> "ES"
                timeZoneDE.contains(timeZone) -> "DE"
                else -> "CL"
            }
        }

        /**
         * @param context An application context from the component calling this method
         * @return country of user in ISO-3166 (https://en.m.wikipedia.org/wiki/ISO_3166-1_alpha-2)
         */
        private fun getCountryByPhoneNumber(context: Context): String? {
            val tManager: TelephonyManager = context.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
            val countryCode = tManager.simCountryIso.uppercase()
            return countryCode.ifBlank { null }
        }

    }

}