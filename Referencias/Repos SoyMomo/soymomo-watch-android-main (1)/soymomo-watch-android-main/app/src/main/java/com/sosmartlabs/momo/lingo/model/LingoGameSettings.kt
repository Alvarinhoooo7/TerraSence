package com.sosmartlabs.momo.lingo.model

import com.parse.ParseClassName
import com.parse.ParseObject
import com.parse.ktx.delegates.ParseDelegate
import com.sosmartlabs.momo.models.Wearer
import org.json.JSONObject

@ParseClassName("LingoGameSettings")
class LingoGameSettings : ParseObject() {
    var level by ParseDelegate<Int>(null)
    var wearer by ParseDelegate<Wearer>(null)
    var gameName by ParseDelegate<String>(null)
    var language by ParseDelegate<String>(null)
    var game by ParseDelegate<String>(null)

    val gameStats: JSONObject?
        get() = if (has("gameStats")) getJSONObject("gameStats") else null
}
