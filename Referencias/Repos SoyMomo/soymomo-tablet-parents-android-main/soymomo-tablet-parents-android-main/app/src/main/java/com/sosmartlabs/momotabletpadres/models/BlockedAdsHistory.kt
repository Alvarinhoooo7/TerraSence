package com.sosmartlabs.momotabletpadres.models

import com.parse.ParseClassName
import com.parse.ParseObject
import com.sosmartlabs.momotabletpadres.tablet.model.remote.ParseTablet
import com.sosmartlabs.momotabletpadres.utils.ParseDelegate

@ParseClassName("BlockedAdsHistory")
class BlockedAdsHistory: ParseObject() {
    var tablet by ParseDelegate<ParseTablet>()
    var summary by ParseDelegate<String>()
}