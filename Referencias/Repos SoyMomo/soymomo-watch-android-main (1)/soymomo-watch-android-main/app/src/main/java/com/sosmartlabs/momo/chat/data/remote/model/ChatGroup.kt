package com.sosmartlabs.momo.chat.data.remote.model

import com.parse.ParseClassName
import com.parse.ParseFile
import com.parse.ParseObject
import com.parse.ParseUser
import com.parse.ktx.delegates.ParseDelegate

@ParseClassName("ChatGroup")
class ChatGroup : ParseObject() {
    var name by ParseDelegate<String>(null)
    var avatar by ParseDelegate<ParseFile?>(null)
    var groupDescription by ParseDelegate<String?>(null)
    var owner by ParseDelegate<ParseUser>(null)
    var settings by ParseDelegate<ParseObject?>(null)

    override fun toString(): String {
        return "ChatGroup [objectId=$objectId, name=$name, owner=$owner]"
    }
}

