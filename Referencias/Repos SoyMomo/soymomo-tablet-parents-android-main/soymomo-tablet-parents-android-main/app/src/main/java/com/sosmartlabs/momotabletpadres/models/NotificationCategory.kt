package com.sosmartlabs.momotabletpadres.models

import com.parse.ParseClassName
import com.parse.ParseFile
import com.parse.ParseObject
import com.sosmartlabs.momotabletpadres.utils.ParseDelegate

@ParseClassName("NotificationCategory")
class NotificationCategory:ParseObject() {
    var categoryName by ParseDelegate<String?>()
    var slug by ParseDelegate<String?>()
    var icon by ParseDelegate<ParseFile?>()
}