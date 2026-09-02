package com.sosmartlabs.momotabletpadres.core.common.dug.unsafesearch.model.remote

import com.parse.ParseClassName
import com.parse.ParseObject
import com.parse.ktx.delegates.ParseDelegate
import com.sosmartlabs.momotabletpadres.tablet.model.remote.ParseTablet
import java.util.*

@ParseClassName("DetectedUnsafeSearch")
class ParseDetectedUnsafeSearch: ParseObject() {
    var tablet by ParseDelegate<ParseTablet?>(null)
    var searchText by ParseDelegate<String?>(null)
    var detection by ParseDelegate<String?>(null)
    var packageName by ParseDelegate<String?>(null)
    var date by ParseDelegate<Date?>(null)
    var category by ParseDelegate<String?>(null)
    var referenceId by ParseDelegate<String?>( null)
    var hasFeedback by ParseDelegate<Boolean>(null)
}