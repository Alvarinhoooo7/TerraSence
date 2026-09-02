package com.sosmartlabs.momo.phonebook.model.devicecontact

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.provider.ContactsContract
import dagger.hilt.android.qualifiers.ApplicationContext
import java.io.File
import java.io.FileOutputStream
import javax.inject.Inject
import kotlin.math.roundToInt

/**
 * Repository for obtaining contacts from device directory
 * @param context Context for accessing contacts
 */
class DeviceContactRepository @Inject constructor(@ApplicationContext private val context: Context) {

    /**
     * Projection for querying only the contact information required
     */
    private val projection = arrayOf(
        ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
        ContactsContract.CommonDataKinds.Phone.NUMBER,
        ContactsContract.CommonDataKinds.Phone.PHOTO_URI
    )

    /**
     * Content resolver for querying contacts
     */
    private val contentResolver = context.contentResolver

    /**
     * Obtains the required contact information fom Contact URI
     * @param contactUri URI for contact
     * @return Device contact information
     */
    fun getContact(contactUri: Uri): DeviceContact? {
        val contactCursor = contentResolver.query(contactUri, projection,null,
            null, null)

        if (contactCursor != null) {
            with(contactCursor) {
                moveToFirst()

                val displayName =
                    getString(getColumnIndex(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME))
                val number =
                    getString(getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER))
                var photoUri =
                    getString(getColumnIndex(ContactsContract.CommonDataKinds.Phone.PHOTO_URI))

                close()

                if (photoUri != null) photoUri = resizeImage(photoUri)

                return DeviceContact(displayName, photoUri, number)
            }
        }

        return null
    }

    /**
     * Resize a contact image for been displayed in watch
     * @param uri String URI for contact image
     * @return String URI for resized image
     */
    private fun resizeImage(uri: String): String? {

        runCatching {
            contentResolver.openInputStream(Uri.parse(uri))

        }.onSuccess { bitmapStream ->
            val bitmap = BitmapFactory.decodeStream(bitmapStream)
            bitmapStream?.close()

            val width = if (bitmap.height > bitmap.width)
                (400 * bitmap.width.toDouble()/bitmap.height).roundToInt() else 400
            val height = if (bitmap.width > bitmap.height)
                (400 * (bitmap.height.toDouble()) / bitmap.width).roundToInt() else 400

            val newBitmap = Bitmap.createScaledBitmap(bitmap, width, height, true)
            val imageFileName = System.currentTimeMillis().toString()
            val storageDir = context.cacheDir
            val image = File.createTempFile(
                imageFileName,
                ".jpg",
                storageDir
            )

            val out = FileOutputStream(image)
            newBitmap.compress(Bitmap.CompressFormat.PNG, 80, out)
            out.flush()
            out.close()

            return image.absolutePath
        }
        return null
    }
}