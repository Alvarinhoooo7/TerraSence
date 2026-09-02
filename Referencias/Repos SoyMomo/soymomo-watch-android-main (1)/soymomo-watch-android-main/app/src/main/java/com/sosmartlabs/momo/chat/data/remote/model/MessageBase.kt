package com.sosmartlabs.momo.chat.data.remote.model

import com.parse.ParseFile
import com.parse.ParseObject
import com.parse.ktx.delegates.ParseDelegate
import com.sosmartlabs.momo.models.Wearer

abstract class MessageBase: ParseObject() {
    var watch by ParseDelegate<Wearer>(null)
    var text by ParseDelegate<String>(null)
    var image by ParseDelegate<ParseFile?>(null)
    var audio by ParseDelegate<ParseFile?>(null)
}