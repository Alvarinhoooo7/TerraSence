package com.sosmartlabs.momotabletpadres.models

import com.parse.ParseClassName
import com.parse.ParseObject
import com.sosmartlabs.momotabletpadres.utils.ParseDelegate


@ParseClassName("Update")
class Update: ParseObject() {
    var versionCode by ParseDelegate<Int?>()
    var versionName by ParseDelegate<String?>()
    var description by ParseDelegate<String?>()
    var model by ParseDelegate<String?>()

    override fun toString(): String {
        return "$versionCode $versionName $description $model"
    }

}