package com.sosmartlabs.momo.sim.model

import com.parse.ParseClassName
import com.parse.ParseObject
import com.parse.ktx.delegates.ParseDelegate

@ParseClassName("MnoProvider")
class MnoProvider: ParseObject() {
    var name by ParseDelegate<String>(null)
    var country by ParseDelegate<String>(null)
}