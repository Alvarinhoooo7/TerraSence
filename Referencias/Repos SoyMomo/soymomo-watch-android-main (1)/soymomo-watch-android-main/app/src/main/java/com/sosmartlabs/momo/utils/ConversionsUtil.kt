package com.sosmartlabs.momo.utils

import kotlin.math.roundToInt

/**
 * Helper for conversions  according measure system activated
 */

object ConversionsUtil {

    private const val MTR_TO_YD = 0.9144
    private const val KG_TO_LB = 2.2046
    private const val IN_TO_CM = 2.54
    private const val FT_TO_IN = 12

    /**
     * Function to covert meters to yards
     */
    fun convertMtrToYd(value: Double): Double = value / MTR_TO_YD

    /**
     * Function to covert Kilograms to pounds
     */
    fun convertKgToLbs(value: Int): Int = (value * KG_TO_LB).toInt()

    /**
     * Function to covert Centimeters to Feet and Inches
     */
    fun convertCmToFtAndIn(value: Int): Pair<Int, Int> {
        val feats = getFeet(value)
        val inches = getInches(value)
        return Pair(feats, inches)
    }

    /**
     * Function to get only feet
     */
    private fun getFeet(value: Int): Int = ((value / IN_TO_CM) / FT_TO_IN).toInt()

    /**
     * Function to get only inches
     */
    private fun getInches(value: Int): Int = ((value / IN_TO_CM) % FT_TO_IN).toInt()

    /**
     * Function to covert pounds to kilograms
     * [roundToInt] is used to rounds a double value to the nearest integer and converts the result to Int
     */
    fun convertLbsToKg(value: Int): Int = (value / KG_TO_LB).roundToInt()

    /**
     * Function to covert feet and inches to centimeters
     * [roundToInt] is used to rounds a double value to the nearest integer and converts the result to Int
     */
    fun convertFeetAndInchesToCm(feet: Int, inches: Int): Int =
        ((feet * FT_TO_IN + inches) * IN_TO_CM).roundToInt()
}