package com.sosmartlabs.momotabletpadres.core.common.dug.explicitmusic.model.remote

import com.parse.ParseClassName
import com.parse.ParseObject
import com.parse.ktx.delegates.ParseDelegate


@ParseClassName("ExplicitMusicArtist")
class ParseExplicitMusicArtist : ParseObject() {

    var name by ParseDelegate<String?>(null)
    var explicitScore by ParseDelegate<Number?>(null)
    var spotifyId by ParseDelegate<String?>(null)
}

