package com.sosmartlabs.momotabletpadres.tablet.model

import android.os.Bundle
import android.os.Parcel
import androidx.test.runner.AndroidJUnit4
import com.sosmartlabs.momotabletpadres.encryption.EncryptedMetadata
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Regression test for the #1 fatal crash:
 *
 *   java.lang.IllegalArgumentException: Parcel: unknown type for value
 *       EncryptedMetadata(...)  at Tablet.writeToParcel
 *
 * The crash happened because [EncryptedMetadata] was embedded in the @Parcelize [Tablet]
 * via @RawValue without itself being Parcelable, so Parcel.writeValue() rejected it at
 * runtime whenever a tablet had an encrypted profile picture. These tests pin the contract
 * that a [Tablet] carrying encryption metadata can cross a Parcel boundary.
 */
@RunWith(AndroidJUnit4::class)
class TabletParcelTest {

    @Test
    fun encryptedMetadata_survivesParcelRoundTrip() {
        val original = sampleMetadata()

        @Suppress("DEPRECATION")
        val restored = Parcel.obtain().use { parcel ->
            parcel.writeParcelable(original, 0)
            parcel.setDataPosition(0)
            parcel.readParcelable<EncryptedMetadata>(EncryptedMetadata::class.java.classLoader)
        }

        assertEquals(original, restored)
    }

    @Test
    fun tablet_withEncryptedMetadata_survivesBundleParcelRoundTrip() {
        val metadata = sampleMetadata()
        val source = Bundle().apply { putParcelable(KEY, tabletWith(metadata)) }

        // This is the exact path that crashed in production:
        // Bundle.writeToParcel(...) -> Tablet.writeToParcel(...).
        @Suppress("DEPRECATION")
        val restored = Parcel.obtain().use { parcel ->
            source.writeToParcel(parcel, 0)
            parcel.setDataPosition(0)
            Bundle.CREATOR.createFromParcel(parcel)
                .apply { classLoader = Tablet::class.java.classLoader }
                .getParcelable<Tablet>(KEY)
        }

        assertNotNull("Tablet should survive the Parcel round-trip", restored)
        assertEquals("8u1lGCMP4q", restored!!.objectId)
        assertEquals(metadata, restored.encryptedProfilePictureMetadata)
    }

    private inline fun <T> Parcel.use(block: (Parcel) -> T): T =
        try {
            block(this)
        } finally {
            recycle()
        }

    private fun sampleMetadata() = EncryptedMetadata(
        v = 1,
        alg = "A256GCM",
        kid = "8u1lGCMP4q",
        kv = 1,
        iv = "n/EjvkemmSvDQwLx",
    )

    private fun tabletWith(metadata: EncryptedMetadata) = Tablet(
        id = null,
        objectId = "8u1lGCMP4q",
        hid = null,
        localId = null,
        appVersionCode = null,
        versionName = null,
        pin = null,
        kidBirthday = null,
        recoveryEmail = null,
        profileName = "Emilia",
        profileImagePath = null,
        browserAllowed = null,
        smartDetectionEnabled = null,
        profanityDetectionEnabled = null,
        unsafeSearchDetectionEnabled = null,
        moodDetectionEnabled = null,
        explicitMusicDetectionEnabled = null,
        spotifyBroadcastEnabled = null,
        remoteBlocked = null,
        inAppPaymentsEnabled = null,
        model = null,
        updatedAt = null,
        batteryPercentage = null,
        color = null,
        adBlockerEnabled = false,
        profilePicture = null,
        encryptedProfilePicture = null,
        encryptedProfilePictureMetadata = metadata,
        lastTKQ = null,
        currentLocation = null,
        currentLocationTime = null,
        currentLocationAccuracy = null,
        imei = null,
        phone = null,
    )

    companion object {
        private const val KEY = "tablet"
    }
}
