package com.sosmartlabs.momo.models

import android.os.Parcelable
import com.parse.ParseClassName
import com.parse.ParseObject
import com.parse.ParseUser
import com.parse.ktx.delegates.ParseDelegate
import kotlinx.parcelize.Parcelize
import java.util.Date

@Parcelize
@ParseClassName("NPSScheduler")
class NPSScheduler: ParseObject(), Parcelable {
    var user by ParseDelegate<ParseUser>(null)
    var startDate by ParseDelegate<Date>(null)
}