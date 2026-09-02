package com.sosmartlabs.momo.chat.data.remote.model

import com.parse.ParseClassName
import com.parse.ParseObject
import com.parse.ParseUser
import com.parse.ktx.delegates.ParseDelegate
import com.sosmartlabs.momo.models.Wearer
import java.util.Date

@ParseClassName("GroupMember")
class GroupMember : ParseObject() {
    var name by ParseDelegate<String>(null)
    var wearer by ParseDelegate<Wearer?>(null)
    var user by ParseDelegate<ParseUser?>(null)
    var group by ParseDelegate<ChatGroup?>(null)
    var isWearer by ParseDelegate<Boolean>(null)
    var notification by ParseDelegate<ParseObject?>(null)
    var status by ParseDelegate<String>(null)
    var role by ParseDelegate<String>(null)
    var joinedAt by ParseDelegate<Date?>(null)

    val isAdmin: Boolean
        get() = role == "admin"

    override fun toString(): String {
        return "GroupMember [objectId=$objectId, name=$name, isWearer=$isWearer, role=$role, status=$status]"
    }
}

