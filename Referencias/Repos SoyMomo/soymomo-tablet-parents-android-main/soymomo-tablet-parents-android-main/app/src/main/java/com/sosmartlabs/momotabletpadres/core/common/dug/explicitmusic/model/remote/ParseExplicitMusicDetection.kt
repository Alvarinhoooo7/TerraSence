package com.sosmartlabs.momotabletpadres.core.common.dug.explicitmusic.model.remote

import com.parse.ParseClassName
import com.parse.ParseObject
import com.parse.ktx.delegates.ParseDelegate
import com.sosmartlabs.momotabletpadres.tablet.model.remote.ParseTablet
import java.util.*


@ParseClassName("ExplicitMusicDetection")
class ParseExplicitMusicDetection: ParseObject() {
    var songTitle by ParseDelegate<String?>(null)
    var tablet by ParseDelegate<ParseTablet?>(null)
    var packageName by ParseDelegate<String?>(null)
    var score by ParseDelegate<Double?>(null)
    var artist by ParseDelegate<ParseExplicitMusicArtist>(null)
    var songImage by ParseDelegate<String?>(null)
    var detectedArtist by ParseDelegate<String?>(null)
    var detectedSong by ParseDelegate<String?>(null)
    var detectionDate by ParseDelegate<Date?>(null)
    var hasFeedback by ParseDelegate<Boolean>(null)
}