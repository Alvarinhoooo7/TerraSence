package com.sosmartlabs.momotabletpadres.tabletsettings.blocks.web.model

import com.parse.ParseClassName
import com.parse.ParseObject
import com.sosmartlabs.momotabletpadres.tablet.model.remote.ParseTablet
import com.sosmartlabs.momotabletpadres.utils.ParseDelegate

@ParseClassName("Website")
class Website : ParseObject(){
    var url by ParseDelegate<String?>()
    var allowed by ParseDelegate<Boolean?>()
    var tablet by ParseDelegate<ParseTablet?>()
}