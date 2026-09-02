package com.sosmartlabs.momo.lingo.model

import com.parse.ParseClassName
import com.parse.ParseObject
import com.parse.ktx.delegates.ParseDelegate
import com.sosmartlabs.momo.models.Wearer

@ParseClassName("LingoSettings")
class LingoSettings : ParseObject() {
    // Nullable so resolveLanguage()'s `language ?: "en"` fallback works on a
    // missing field instead of throwing on the erased cast.
    var language by ParseDelegate<String?>(null)
    var wearer by ParseDelegate<Wearer>(null)
}
