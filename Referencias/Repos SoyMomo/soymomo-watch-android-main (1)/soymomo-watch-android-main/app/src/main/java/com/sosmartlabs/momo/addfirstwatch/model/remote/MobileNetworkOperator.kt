package com.sosmartlabs.momo.addfirstwatch.model.remote

import com.parse.ParseClassName
import com.parse.ParseFile
import com.parse.ParseObject
import com.parse.ktx.delegates.ParseDelegate

@ParseClassName("MobileNetworkOperator")
class MobileNetworkOperator: ParseObject() {
    var country by ParseDelegate<String>(null)
    var name by ParseDelegate<String>(null)
    var logo by ParseDelegate<ParseFile>(null)
    var hasExtraActivationSteps by ParseDelegate<Boolean>(null)
    var extraActivationGif by ParseDelegate<ParseFile>(null)
    var extraActivationText by ParseDelegate<String>(null)
}