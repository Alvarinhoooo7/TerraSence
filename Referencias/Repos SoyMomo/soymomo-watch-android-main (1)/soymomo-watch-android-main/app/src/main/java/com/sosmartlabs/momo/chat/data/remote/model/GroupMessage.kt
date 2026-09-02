package com.sosmartlabs.momo.chat.data.remote.model

import com.parse.ParseClassName
import com.parse.ParseFile
import com.parse.ParseUser
import com.parse.ktx.delegates.ParseDelegate
import com.sosmartlabs.momo.chat.data.remote.model.MessageBase
import com.sosmartlabs.momo.models.Wearer
import java.util.Date

@ParseClassName("GroupMessage")
class GroupMessage : MessageBase() {
    var group by ParseDelegate<ChatGroup?>(null)
    var user by ParseDelegate<ParseUser?>(null)
    var wearer by ParseDelegate<Wearer?>(null)
    var type by ParseDelegate<String>(null)
    var video by ParseDelegate<ParseFile?>(null)
    var replyTo by ParseDelegate<GroupMessage?>(null)
    var editedAt by ParseDelegate<Date?>(null)
    var ulid by ParseDelegate<String?>(null)
    var status by ParseDelegate<String?>(null)

    // Transient properties (not saved to Parse)
    @Transient
    var audioURL: String? = null
    
    @Transient
    var imageData: ByteArray? = null
    
    @Transient
    var videoURL: String? = null

    override fun toString(): String {
        return "GroupMessage [objectId=$objectId, group=$group, type=$type, ulid=$ulid]"
    }
}

