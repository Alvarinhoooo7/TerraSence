package com.sosmartlabs.momotabletpadres.geofences.utils

import android.content.Context
import android.icu.util.LocaleData
import android.icu.util.ULocale
import android.os.Build
import java.util.Locale
import kotlin.math.roundToInt

/**
 * Utility class for converting between metric and imperial measurement systems
 */
object MeasureSystemUtils {

    private const val METERS_PER_YARD = 0.9144
    private const val POUNDS_PER_KILOGRAM = 2.2046
    private const val CENTIMETERS_PER_INCH = 2.54
    private const val INCHES_PER_FOOT = 12

    /**
     * Determines if the device's locale uses the imperial measurement system
     */
    fun isUsingImperialSystem(context: Context): Boolean {
        val deviceLocale = getDeviceLocale(context)
        
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            val uLocale = ULocale.forLocale(deviceLocale)
            LocaleData.getMeasurementSystem(uLocale) == LocaleData.MeasurementSystem.US
        } else {
            isImperialSystemCountry(deviceLocale.country)
        }
    }

    private fun getDeviceLocale(context: Context): Locale {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            context.resources.configuration.locales.get(0)
        } else {
            context.resources.configuration.locale
        } ?: Locale.getDefault()
    }

    private fun isImperialSystemCountry(country: String): Boolean {
        return when (country.uppercase(Locale.ROOT)) {
            "US", "LR", "MM" -> true // United States, Liberia, Myanmar
            else -> false
        }
    }

    /**
     * Converts meters to yards
     */
    fun metersToYards(meters: Double): Double = meters / METERS_PER_YARD

    /**
     * Converts kilograms to pounds
     */
    fun kilogramsToPounds(kilograms: Int): Int = (kilograms * POUNDS_PER_KILOGRAM).toInt()

    /**
     * Converts pounds to kilograms, rounded to nearest integer
     */
    fun poundsToKilograms(pounds: Int): Int = (pounds / POUNDS_PER_KILOGRAM).roundToInt()

    /**
     * Converts centimeters to feet and inches
     * @return Pair of (feet, inches)
     */
    fun centimetersToFeetAndInches(centimeters: Int): Pair<Int, Int> {
        val totalInches = centimeters / CENTIMETERS_PER_INCH
        val feet = (totalInches / INCHES_PER_FOOT).toInt()
        val inches = (totalInches % INCHES_PER_FOOT).toInt()
        return Pair(feet, inches)
    }

    /**
     * Converts feet and inches to centimeters, rounded to nearest integer
     */
    fun feetAndInchesToCentimeters(feet: Int, inches: Int): Int {
        val totalInches = feet * INCHES_PER_FOOT + inches
        return (totalInches * CENTIMETERS_PER_INCH).roundToInt()
    }
}