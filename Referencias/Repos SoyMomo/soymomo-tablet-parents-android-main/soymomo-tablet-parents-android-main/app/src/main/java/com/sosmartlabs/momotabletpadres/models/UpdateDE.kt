package com.sosmartlabs.momotabletpadres.models

import com.parse.ParseClassName
import com.parse.ParseObject
import com.sosmartlabs.momotabletpadres.utils.ParseDelegate


@ParseClassName("UpdateDE")
class UpdateDE: ParseObject() {
    var versionCode by ParseDelegate<Int?>()
    var versionName by ParseDelegate<String?>()
    var description by ParseDelegate<String?>()
    var model by ParseDelegate<String?>()
}