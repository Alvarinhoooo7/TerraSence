package com.sosmartlabs.momo.watchinfo.model.jsonparse

import com.google.gson.JsonDeserializationContext
import com.google.gson.JsonDeserializer
import com.google.gson.JsonElement
import com.google.gson.JsonObject
import java.lang.reflect.Type
import java.util.*

/**
 * Custom deserializer for obtaining PackageInfo list from Json
 */
internal class PackageInfoDeserializer: JsonDeserializer<JsonPackageInfoListWrapper> {
    /**
     * Deserialize a list of PackageInfo
     * @param json jsonElement to deserialize
     * @param typeOfT Type for deserializing
     * @param context context for deserialization
     * @return List with PackageInfo objects
     */
    override fun deserialize(json: JsonElement?, typeOfT: Type?,
                             context: JsonDeserializationContext?): JsonPackageInfoListWrapper {
        val list = mutableListOf<JsonPackageInfo>()
        val jsonObject = json!! as JsonObject

        jsonObject.entrySet().forEach { jsonElement ->
            list += deserializePackageInfo(jsonElement.key, jsonElement.value.asJsonObject)
        }
        return JsonPackageInfoListWrapper(list)
    }

    /**
     * Deserialize a PackageInfo object
     * @param packageName Package name to include in PackageInfo
     * @param jsonObject JsonObject with the information to include in PackageInfo
     * @return PackageInfo object with information provided
     */
    private fun deserializePackageInfo(packageName: String, jsonObject: JsonObject): JsonPackageInfo {
        lateinit var lastUpdateTime: Date
        var versionCode = 0
        lateinit var versionName: String

        jsonObject.entrySet().forEach { jsonElement ->
            when(jsonElement.key) {
                "LastUpdateTime" -> lastUpdateTime = Date(jsonElement.value.asLong)
                "VersionCode" -> versionCode = jsonElement.value.asInt
                "VersionName" -> versionName = jsonElement.value.asString
            }
        }

        return JsonPackageInfo(packageName, lastUpdateTime, versionCode, versionName)
    }
}