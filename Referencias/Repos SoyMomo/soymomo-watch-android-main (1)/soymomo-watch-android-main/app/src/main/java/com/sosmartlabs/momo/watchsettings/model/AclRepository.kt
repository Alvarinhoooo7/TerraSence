package com.sosmartlabs.momo.watchsettings.model

import com.parse.coroutines.callCloudFunction
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import javax.inject.Inject

/**
 * Repository for handling ACL-related cloud function calls
 */
class AclRepository @Inject constructor() {

    /**
     * Calls the cloud functions that sets the ACL related to a given watch
     * @param watch Watch for set related ACLs
     */
    suspend fun setupWatchGlobalAcl(watch: Wearer) {
        CrashlyticsLog.log("Calling cloud function setUpGlobalACL by deviceId")
        callCloudFunction<Any>("setUpGlobalACL", hashMapOf("deviceId" to watch.deviceId))
    }
}