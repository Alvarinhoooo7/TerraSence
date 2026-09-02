package com.sosmartlabs.momo.watchinfo.ui.binding

import android.widget.TextView
import androidx.databinding.BindingAdapter
import com.sosmartlabs.momo.R
import java.text.DateFormat
import java.util.*

/**
 * Helpers for DataBinding used in WatchInfo
 */
object WatchInfoBindingAdapter {
    /**
     * Loads a version text on a TextView
     * @param view TextView to load with the version
     * @param version Version to put in TextView
     */
    @BindingAdapter("app:version")
    @JvmStatic fun loadVersion(view: TextView, version: String) {
        view.text = view.context.getString(R.string.watch_info_version, version)
    }

    /**
     * Loads an update time to a textView
     * @param view TextView to load with the version
     * @param updateTime updateTime to put in TextView
     */
    @BindingAdapter("app:lastUpdated")
    @JvmStatic fun loadUpdateTime(view: TextView, updateTime: Date) {
        val dateFormat = DateFormat.getDateTimeInstance(DateFormat.SHORT, DateFormat.SHORT)
        view.text = view.context.getString(R.string.watch_info_last_update, dateFormat.format(updateTime))
    }
}