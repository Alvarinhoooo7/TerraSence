package com.sosmartlabs.momo.utils

import timber.log.Timber
import java.util.*

class CustomLocalTime (val hour: Int, val minute: Int){
    companion object{
        fun of(hour: Int, minute: Int): CustomLocalTime{
            return CustomLocalTime(hour, minute)
        }

        fun now(): CustomLocalTime{
            val c = Calendar.getInstance()
            val hour = c.get(Calendar.HOUR_OF_DAY)
            val minute = c.get(Calendar.MINUTE)
            return CustomLocalTime(hour, minute)
        }
    }

    override fun toString(): String {
        return String.format("%02d:%02d", hour , minute)
    }

    fun isAfter(customLocalTime: CustomLocalTime): Boolean{
        val newHour = customLocalTime.hour
        val newMinute = customLocalTime.minute

        val newTotalMinutes = 60*newHour + newMinute
        val currentTotalMinutes = 60*hour + minute

        return currentTotalMinutes>newTotalMinutes
    }

    fun isBefore(customLocalTime: CustomLocalTime): Boolean{
        val newHour = customLocalTime.hour
        val newMinute = customLocalTime.minute
        val newTotalMinutes = 60*newHour + newMinute
        val currentTotalMinutes = 60*hour + minute

        Timber.d("isBefore: new $newTotalMinutes current $currentTotalMinutes")

        return currentTotalMinutes<newTotalMinutes
    }
}