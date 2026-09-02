package com.sosmartlabs.momotabletpadres.core.common.dug.unsafesearch.model.dangerousinfluencer.remote

import com.parse.ParseClassName
import com.parse.ParseObject
import com.parse.ktx.delegates.ParseDelegate

@ParseClassName("DangerousInfluencer")
class ParseDangerousInfluencer: ParseObject(){
    val referenceId by ParseDelegate<String?>(null)
    val region by ParseDelegate<String?>(null)
    val language by ParseDelegate<String?>(null)
    val username by ParseDelegate<String?>(null)
}