package com.sosmartlabs.momo.dispatch.model

import com.sosmartlabs.momo.BuildConfig
import javax.inject.Inject

/**
 * Repository for obtaining Parse keys
 */
class ParseKeysRepository @Inject constructor()  {

    /**
     * Obtains the Parse App Key
     */
    val parseAppKey get() = BuildConfig.parseApplicationId

    /**
     * Obtains the Parse Client Key
     */
    val parseClientKey get() = BuildConfig.parseClientKey

    /**
     * Obtains the Parse server URL
     */
    val parseServerUrl get() = BuildConfig.parseRequestUrl
}