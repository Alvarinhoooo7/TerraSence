package com.sosmartlabs.momo.installedapp.ui

import android.content.Context
import com.sosmartlabs.momo.R

object InstalledAppDurationFormatter {

    fun formatDetailDuration(context: Context, totalMinutes: Int): String {
        require(totalMinutes > 0) { "Duration must be greater than zero" }
        return context.getString(
            R.string.installed_app_duration_detail_format,
            formatUnits(context, totalMinutes)
        )
    }

    fun formatChipDuration(context: Context, totalMinutes: Int): String {
        require(totalMinutes > 0) { "Duration must be greater than zero" }
        return formatCompactUnits(context, totalMinutes)
    }

    private fun formatUnits(context: Context, totalMinutes: Int): String {
        val resources = context.resources
        val hours = totalMinutes / 60
        val minutes = totalMinutes % 60

        val hourText = if (hours > 0) {
            resources.getQuantityString(R.plurals.installed_app_duration_hours, hours, hours)
        } else {
            null
        }

        val minuteText = if (minutes > 0) {
            resources.getQuantityString(R.plurals.installed_app_duration_minutes, minutes, minutes)
        } else {
            null
        }

        return when {
            hourText != null && minuteText != null -> {
                context.getString(R.string.installed_app_duration_joined, hourText, minuteText)
            }
            hourText != null -> hourText
            minuteText != null -> minuteText
            else -> resources.getQuantityString(R.plurals.installed_app_duration_minutes, 0, 0)
        }
    }

    private fun formatCompactUnits(context: Context, totalMinutes: Int): String {
        val resources = context.resources
        val hours = totalMinutes / 60
        val minutes = totalMinutes % 60

        val hourText = if (hours > 0) {
            resources.getQuantityString(
                R.plurals.installed_app_duration_hours_compact,
                hours,
                hours
            )
        } else {
            null
        }

        val minuteText = if (minutes > 0) {
            resources.getQuantityString(
                R.plurals.installed_app_duration_minutes_compact,
                minutes,
                minutes
            )
        } else {
            null
        }

        return when {
            hourText != null && minuteText != null -> {
                context.getString(R.string.installed_app_duration_joined_compact, hourText, minuteText)
            }
            hourText != null -> hourText
            minuteText != null -> minuteText
            else -> resources.getQuantityString(R.plurals.installed_app_duration_minutes_compact, 0, 0)
        }
    }
}
