package com.sosmartlabs.momotabletpadres.core.common.dug.unsafesearch.model.dangerousviral.remote

import com.parse.ParseClassName
import com.parse.ParseObject
import com.parse.ktx.delegates.ParseDelegate

@ParseClassName("DangerousViral")
class ParseDangerousViral: ParseObject(){
    val referenceId by ParseDelegate<String?>(null)
    val region by ParseDelegate<String?>(null)
    val language by ParseDelegate<String?>(null)
    val longName by ParseDelegate<String?>(null)
    val description by ParseDelegate<String?>(null)
}