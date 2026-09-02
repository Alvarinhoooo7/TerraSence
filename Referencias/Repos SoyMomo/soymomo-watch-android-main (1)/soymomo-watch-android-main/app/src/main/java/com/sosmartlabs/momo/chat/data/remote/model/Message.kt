package com.sosmartlabs.momo.chat.data.remote.model

import com.parse.ParseClassName
import com.parse.ParseUser
import com.parse.ktx.delegates.ParseDelegate
import com.sosmartlabs.momo.chat.data.remote.model.MessageBase

@ParseClassName("Message")
class Message: MessageBase() {
    var received by ParseDelegate<Boolean>(null)
    var error by ParseDelegate<Boolean>(null)
    var sent by ParseDelegate<Boolean>(null)
    var from by ParseDelegate<ParseUser>(null)
    var identifier by ParseDelegate<String>(null)

    override fun toString(): String {
        return "Message [objectId=${objectId}, from=$from, to=$watch, text=$text]"
    }
}