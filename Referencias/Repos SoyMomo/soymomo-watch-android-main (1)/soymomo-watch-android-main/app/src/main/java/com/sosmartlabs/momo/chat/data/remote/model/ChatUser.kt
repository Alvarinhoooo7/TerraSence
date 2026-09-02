package com.sosmartlabs.momo.chat.data.remote.model

import com.parse.ParseClassName
import com.parse.ParseFile
import com.parse.ParseUser
import com.parse.ktx.delegates.ParseDelegate
import com.sosmartlabs.momo.chat.data.remote.model.MessageBase

@ParseClassName("ChatUser")
class ChatUser: MessageBase() {
    var sender by ParseDelegate<String>(null)
    var user by ParseDelegate<ParseUser>(null)
    var type by ParseDelegate<String>(null)
    var video by ParseDelegate<ParseFile?>(null)
    var isolatedAudio by ParseDelegate<ParseFile?>(null)
    var status by ParseDelegate<String?>(null)
    var identifier by ParseDelegate<String>(null)

    override fun toString(): String {
        return "Chat [user=$user, watch=$watch, type=$type]"
    }
}