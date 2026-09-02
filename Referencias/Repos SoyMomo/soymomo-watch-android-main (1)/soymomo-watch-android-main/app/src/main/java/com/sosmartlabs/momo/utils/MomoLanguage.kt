package com.sosmartlabs.momo.utils

import com.sosmartlabs.momo.models.Lite1
import com.sosmartlabs.momo.models.WatchModel

data class MomoLanguage(val name: String, val value: String){
    override fun toString() = this.name

    companion object {
        fun getLanguages(watchModel: WatchModel): List<MomoLanguage> {
            return mutableListOf(
                MomoLanguage("Deutsch", "5"),
                MomoLanguage("English", "0"),
                MomoLanguage("Español", "4"),
                MomoLanguage("Polski", "17")
            ).apply {
                if (watchModel != Lite1) {
                    add(3, MomoLanguage("Français", "10"))
                    add(4, MomoLanguage("Português", "3"))
                    add(MomoLanguage("Svenska", "13"))
                }
            }.toList()
        }
    }
}
