package com.sosmartlabs.momotabletpadres.tablet.api

import android.graphics.BitmapFactory
import com.parse.ParseFile
import com.parse.ParseQuery
import com.parse.coroutines.callCloudFunction
import com.sosmartlabs.momotabletpadres.encryption.EncryptionHelper
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.tablet.model.remote.ParseTablet
import com.sosmartlabs.momotabletpadres.utils.exception.DebugExceptionHandler
import com.sosmartlabs.momotabletpadres.utils.exception.MoreThanOneObjectException
import com.sosmartlabs.momotabletpadres.utils.exception.ObjectDoesNotExistException
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import com.sosmartlabs.momotabletpadres.models.mapper.TabletMapper
import timber.log.Timber
import java.io.File
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
open class TabletParseAPI @Inject constructor(
    val deh: DebugExceptionHandler,
    private val encryptionHelper: EncryptionHelper
) {

    /**
     * Get TabletEntity by Id(LocalId)
     */
    fun getById(id: String): ParseTablet {
        Timber.d("TabletParseAPI: Getting tablet by ID: $id")
        return getParseObjectById(id)
    }

    /**
     * get objects that match localId from local data store
     */
    fun getParseObjectById(id: String): ParseTablet {
        Timber.d("TabletParseAPI: Querying Parse for tablet with objectId: $id")
        CrashlyticsLog.log("Querying to get ParseObjectById with ParseTablet")
        
        val query = ParseQuery.getQuery(ParseTablet::class.java)
            .orderByAscending("updatedAt")
            .whereEqualTo("objectId", id)
        
        val result = query.find()

        if (result.isEmpty()) {
            Timber.e("TabletParseAPI: No tablet found with objectId: $id")
            throw ObjectDoesNotExistException()
        }

        if (result.size > 1 && deh.checkDebugExceptionFlag()) {
            Timber.w("TabletParseAPI: Multiple tablets found with same objectId: $id")
            throw MoreThanOneObjectException()
        }

        Timber.d("TabletParseAPI: Successfully retrieved tablet with objectId: $id")

        return result.last()
    }

    /**
    * update object - local and cloud, throws exception in Debug (plain fields not files: strings, ints, etc)
    */
    suspend fun update(objectToUpdate: Tablet, withImportantInfo: Boolean = true): ParseTablet {
        Timber.d("TabletParseAPI: Updating tablet with objectId: ${objectToUpdate.objectId}")
        
        val parameters = TabletMapper.toHashMap(objectToUpdate, withImportantInfo).apply {
            put("isTablet", false)
        }

        val parseTablet = callCloudFunction<ParseTablet>("uploadAndSync_Tablet", parameters)
        Timber.d("TabletParseAPI: Successfully updated tablet with objectId: ${parseTablet.objectId}")

        return parseTablet
    }

    /**
     * update profile image - encrypts the image before uploading
     */
    suspend fun updateProfileImage(tablet: Tablet, path: String): ParseTablet? {
        Timber.d("TabletParseAPI: Updating profile image for tablet ${tablet.objectId} with path: $path")
        
        val currentTablet = getParseObjectById(tablet.objectId!!)
        val tabletId = tablet.objectId!!
        
        // Try to encrypt the profile picture
        val bitmap = BitmapFactory.decodeFile(path)
        if (bitmap != null) {
            val encryptedResult = encryptionHelper.encryptBitmap(bitmap, tabletId)
            
            if (encryptedResult != null) {
                // Successfully encrypted - upload encrypted version
                Timber.d("TabletParseAPI: Uploading encrypted profile picture for tablet: $tabletId")
                
                val encryptedFile = ParseFile("encrypted_profile_${System.currentTimeMillis()}.enc", encryptedResult.encryptedBytes)
                encryptedFile.save()
                
                currentTablet.put("encryptedProfilePicture", encryptedFile)
                currentTablet.put("encryptedProfilePictureMetadata", encryptedResult.meta.toParseMap())
                
                // Also keep the unencrypted version for backward compatibility with older apps
                val parseFile = ParseFile(File(path))
                parseFile.save()
                currentTablet.put("profilePicture", parseFile)
                
                currentTablet.save()
                Timber.d("TabletParseAPI: Successfully updated encrypted profile image for tablet: $tabletId")
                
                return currentTablet
            } else {
                Timber.w("TabletParseAPI: Failed to encrypt profile picture, falling back to unencrypted upload")
            }
        } else {
            Timber.w("TabletParseAPI: Failed to decode bitmap from path: $path")
        }
        
        // Fallback to unencrypted upload if encryption fails
        val parseFile = ParseFile(File(path))
        parseFile.save()
        currentTablet.put("profilePicture", parseFile)
        currentTablet.save()
        Timber.d("TabletParseAPI: Successfully updated unencrypted profile image for tablet: $tabletId")

        return currentTablet
    }
}