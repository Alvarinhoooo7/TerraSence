package com.sosmartlabs.momotabletpadres.core.common.dug.unsafesearch.model.adulttitle.remote

import com.parse.ParseClassName
import com.parse.ParseObject
import com.parse.ktx.delegates.ParseDelegate

@ParseClassName("AdultTitles")
class ParseAdultTitle : ParseObject() {
    val referenceId by ParseDelegate<String?>(null)
    val region by ParseDelegate<String?>(null)
    val language by ParseDelegate<String?>(null)
    var longName by ParseDelegate<String?>(null)
}