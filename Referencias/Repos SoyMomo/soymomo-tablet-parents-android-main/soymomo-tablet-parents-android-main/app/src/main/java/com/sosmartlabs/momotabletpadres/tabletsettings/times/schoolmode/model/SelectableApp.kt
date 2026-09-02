package com.sosmartlabs.momotabletpadres.tabletsettings.times.schoolmode.model

import android.graphics.drawable.Drawable
import com.google.gson.annotations.Expose
import com.google.gson.annotations.SerializedName

data class SelectableApp(
    @Expose(serialize = true, deserialize = true)
    @SerializedName("packageName")
    val packageName: String,
    @Expose(serialize = true, deserialize = true)
    @SerializedName("appName")
    val appName: String,
    @Expose(serialize = true, deserialize = true)
    @SerializedName("selected")
    var selected: Boolean,
    @Expose(serialize = true, deserialize = true)
    @SerializedName("iconUrl")
    var iconUrl: String? = null,
    @Expose(serialize = false, deserialize = false)
    @SerializedName("icon")
    var icon: Drawable? = null
)