package com.sosmartlabs.momo.videocall.model

import com.parse.ParseClassName
import com.parse.ParseObject
import com.parse.ParseUser
import com.parse.ktx.delegates.ParseDelegate
import com.sosmartlabs.momo.models.Wearer

@ParseClassName("VideocallFeedback")
class VideocallFeedback: ParseObject(){
    var user by ParseDelegate<ParseUser>(null)
    var watch by ParseDelegate<Wearer>(null)
    var caller by ParseDelegate<String>(null)
    var feedback by ParseDelegate<Number?>(null)
    var room by ParseDelegate<String>(null)
    var duration by ParseDelegate<Int?>(null)
    var os by ParseDelegate<String>(null)
    var uuid by ParseDelegate<String>(null)
    var sucess by ParseDelegate<Boolean?>(null)
    var rawStats by ParseDelegate<String>(null)
    var receiverConnected by ParseDelegate<Boolean?>(null)
}