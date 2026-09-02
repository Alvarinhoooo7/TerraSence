package com.sosmartlabs.momo.watchinfo.model.jsonparse

/**
 * Wrapper for deserializing PackageInfo List with Gson
 * @param data List of PackageInfo deserialized
 */
internal data class JsonPackageInfoListWrapper(val data: List<JsonPackageInfo>)