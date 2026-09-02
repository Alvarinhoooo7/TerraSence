package com.sosmartlabs.momotabletpadres.tablet

import com.parse.ParseQuery
import com.parse.ParseUser
import com.parse.coroutines.callCloudFunction
import com.parse.coroutines.suspendFind
import com.sosmartlabs.momotabletpadres.encryption.EncryptedMetadata
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.tablet.model.remote.ParseTablet
import com.sosmartlabs.momotabletpadres.core.common.utils.TabletModelUtils
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import com.sosmartlabs.momotabletpadres.link.model.LinkDeviceStatus
import com.sosmartlabs.momotabletpadres.tablet.api.TabletParseAPI
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TabletRepository @Inject constructor(
    private val parseAPI: TabletParseAPI
) {

    init {
        Timber.d("TabletRepository: Repository initialized!")
    }

    suspend fun getTabletByHid(hid: String): Tablet {
        Timber.d("TabletRepository: Getting tablet by HID: $hid")
        return ParseQuery(ParseTablet::class.java)
            .whereEqualTo("hid", hid)
            .suspendFind()
            .first()
            .toTablet()
    }

    suspend fun getTabletByObjectId(objectId: String): Tablet {
        Timber.d("TabletRepository: Getting tablet by objectId: $objectId")
        return ParseQuery(ParseTablet::class.java)
            .whereEqualTo("objectId", objectId)
            .suspendFind()
            .first()
            .toTablet()
    }

    suspend fun getTabletByImei(imei: String): Tablet {
        Timber.d("TabletRepository: Getting tablet by IMEI: $imei")
        return ParseQuery(ParseTablet::class.java)
            .whereEqualTo("imei", imei)
            .suspendFind()
            .first()
            .toTablet()
    }

    fun getTabletListByUser(user: ParseUser): List<Tablet> {
        Timber.d("TabletRepository: Getting tablet list for user: ${user.objectId}")
        return user
            .getRelation<ParseTablet>("tablets")
            .query
            .orderByDescending("updatedAt")
            .find()
            .map { it.toTablet() }
            .also { tablets ->
                Timber.d("TabletRepository: Found ${tablets.size} tablets for user")
            }
    }

    suspend fun checkTabletStatus(objectId: String): LinkDeviceStatus {
        Timber.d("TabletRepository: Checking tablet status for objectId: $objectId")
        CrashlyticsLog.log("checkTabletStatus $objectId")
        
        CrashlyticsLog.log("Calling cloud function checkTabletStatus to verify tablet objectId $objectId")
        return try {
            when (callCloudFunction<Int>("checkTabletStatus", hashMapOf("objectId" to objectId))) {
                0, 4 -> LinkDeviceStatus.DEVICE_ALREADY_LINKED
                1 -> LinkDeviceStatus.DEVICE_AVAILABLE
                2 -> LinkDeviceStatus.DEVICE_BELONGS_TO_OTHER_USER
                else -> LinkDeviceStatus.ERROR
            }.also { status ->
                Timber.d("TabletRepository: Tablet status check result: $status")
            }
        } catch (e: Exception) {
            Timber.e("TabletRepository: Error checking tablet status: ${e.message}")
            LinkDeviceStatus.ERROR
        }
    }

    suspend fun linkTabletByHID(hid: String): Tablet {
        Timber.d("TabletRepository: Linking tablet by HID: $hid")
        CrashlyticsLog.log("Link tablet by HID")
        CrashlyticsLog.log("Calling cloud function addTablet to link tablet by HID")
        
        callCloudFunction<Any>("addTablet", hashMapOf("hid" to hid))

        return ParseQuery(ParseTablet::class.java)
            .whereEqualTo("hid", hid)
            .suspendFind()
            .firstOrNull()
            ?.toTablet()
            ?: throw Exception("Tablet with hid $hid not found")
    }

    suspend fun linkTabletByObjectId(objectId: String): Tablet {
        Timber.d("TabletRepository: Linking tablet by objectId: $objectId")
        CrashlyticsLog.log("link tablet by objectId")
        CrashlyticsLog.log("Calling cloud function addTablet to link tablet by objectId")
        
        callCloudFunction<Any>("addTablet", hashMapOf("objectId" to objectId))

        return ParseQuery(ParseTablet::class.java)
            .whereEqualTo("objectId", objectId)
            .suspendFind()
            .firstOrNull()
            ?.toTablet()
            ?: throw Exception("Tablet with objectId $objectId not found")
    }

    suspend fun unlinkTablet(objectId: String) {
        Timber.d("TabletRepository: Unlinking tablet with objectId: $objectId")
        CrashlyticsLog.log("Unlink tablet")
        CrashlyticsLog.log("Calling cloud function removeTablet to unlink tablet")
        callCloudFunction<Any>("removeTablet", hashMapOf("objectId" to objectId))
    }

    fun savePin(tablet: ParseTablet, newPin: String) {
        Timber.d("TabletRepository: Saving new PIN for tablet: ${tablet.objectId}")
        tablet.apply {
            pin = newPin
            save()
        }
    }

    suspend fun update(objectToUpdate: Tablet): Tablet {
        Timber.d("TabletRepository: Updating tablet: ${objectToUpdate.objectId}")
        return parseAPI.update(objectToUpdate)
            .toTablet()
            .also { updatedTablet -> 
                Timber.d("TabletRepository: Successfully updated tablet: ${updatedTablet.objectId}")
            }
    }

    suspend fun updateProfileImage(objectToUpdate: Tablet, path: String) {
        Timber.d("TabletRepository: Updating profile image for tablet: ${objectToUpdate.objectId}")
        parseAPI.updateProfileImage(objectToUpdate, path)
    }

    suspend fun setTabletColorWithObjectId(colorTablet: String, objectId: String): Tablet {
        Timber.d("TabletRepository: Setting tablet color to $colorTablet for objectId: $objectId")
        val tablet = getTabletByObjectId(objectId).apply {
            color = colorTablet
        }
        return update(tablet)
    }

    private fun ParseTablet.toTablet(): Tablet {
        // Parse encrypted metadata if available
        val encryptedMeta = if (has("encryptedProfilePictureMetadata") && encryptedProfilePictureMetadata != null) {
            EncryptedMetadata.fromMap(encryptedProfilePictureMetadata)
        } else {
            null
        }
        
        return Tablet(
            id = null,
            objectId = objectId,
            hid = if (has("hid")) hid else null,
            localId = if (has("localId")) localId else null,
            appVersionCode = if (has("appVersionCode")) appVersionCode else null,
            versionName = if (has("versionName")) versionName else null,
            pin = if (has("pin")) pin else null,
            kidBirthday = if (has("kidBirthday")) kidBirthday else null,
            recoveryEmail = if (has("recoveryEmail")) recoveryEmail else null,
            profileName = if (has("profileName")) profileName else null,
            profileImagePath = if (has("profilePicture")) profilePicture?.url else null,
            browserAllowed = if (has("browserAllowed")) browserAllowed else null,
            smartDetectionEnabled = if (has("smartDetectionEnabled")) smartDetectionEnabled else null,
            profanityDetectionEnabled = if (has("profanityDetectionEnabled")) profanityDetectionEnabled else null,
            unsafeSearchDetectionEnabled = if (has("unsafeSearchDetectionEnabled")) unsafeSearchDetectionEnabled else null,
            moodDetectionEnabled = if (has("moodDetectionEnabled")) moodDetectionEnabled else null,
            explicitMusicDetectionEnabled = if (has("explicitMusicDetectionEnabled")) explicitMusicDetectionEnabled else null,
            spotifyBroadcastEnabled = if (has("spotifyBroadcastEnabled")) spotifyBroadcastEnabled else null,
            remoteBlocked = if (has("remoteBlocked")) remoteBlocked else null,
            inAppPaymentsEnabled = if (has("inAppPaymentsEnabled")) inAppPaymentsEnabled else null,
            model = if (has("hardwareModel")) TabletModelUtils.fromHardwareModel(hardwareModel) else null,
            updatedAt = updatedAt,
            batteryPercentage = batteryPercentage,
            color = if (has("color")) color else null,
            adBlockerEnabled = adBlockerEnabled ?: false,
            profilePicture = if (has("profilePicture")) profilePicture else null,
            encryptedProfilePicture = if (has("encryptedProfilePicture")) encryptedProfilePicture else null,
            encryptedProfilePictureMetadata = encryptedMeta,
            lastTKQ = if (has("lastTKQ")) lastTKQ else null,
            currentLocation = if (has("currentLocation")) currentLocation else null,
            currentLocationTime = if (has("currentLocationTime")) currentLocationTime else null,
            currentLocationAccuracy = if (has("currentLocationAccuracy")) currentLocationAccuracy?.toDouble() else null,
            imei = if (has("imei")) imei else null,
            phone = if (has("phone")) phone else null,
        )
    }
}