package com.sosmartlabs.momotabletpadres.encryption

import android.graphics.Bitmap
import timber.log.Timber
import java.io.File

/**
 * Extension functions for EncryptionHelper to handle file I/O operations.
 * These functions mirror the tablet app's EncryptionHelperExtensions.
 * 
 * Note: The parent app uses `tabletId` parameter instead of `kid`/`kv` 
 * since it manages multiple tablets, each with its own device key.
 */

/**
 * Encrypt a file using the key for the specified tablet.
 * 
 * @param file The file to encrypt
 * @param tabletId The tablet's objectId (used as kid in metadata)
 * @return EncryptedBytesResult or null if encryption fails
 */
fun EncryptionHelper.encryptFile(file: File, tabletId: String): EncryptedBytesResult? {
    if (!file.exists()) {
        Timber.e("EncryptionHelper.encryptFile: File does not exist: ${file.absolutePath}")
        return null
    }
    return try {
        encryptBytes(file.readBytes(), tabletId)
    } catch (e: Exception) {
        Timber.e(e, "EncryptionHelper.encryptFile: Failed to read file: ${file.absolutePath}")
        null
    }
}

/**
 * Decrypt bytes and write the result to a file.
 * 
 * @param encryptedBytes The encrypted data
 * @param meta The encryption metadata
 * @param outputFile The file to write decrypted data to
 * @return true if decryption and file write succeeded
 */
fun EncryptionHelper.decryptToFile(
    encryptedBytes: ByteArray,
    meta: EncryptedMetadata,
    outputFile: File
): Boolean {
    val decrypted = decryptBytes(encryptedBytes, meta)
    if (decrypted == null) {
        Timber.e("EncryptionHelper.decryptToFile: Decryption failed")
        return false
    }
    return try {
        outputFile.parentFile?.mkdirs()
        outputFile.writeBytes(decrypted)
        true
    } catch (e: Exception) {
        Timber.e(e, "EncryptionHelper.decryptToFile: Failed to write file: ${outputFile.absolutePath}")
        false
    }
}

/**
 * Encrypt a file and write the encrypted bytes to another file.
 * 
 * @param inputFile The file to encrypt
 * @param outputFile The file to write encrypted data to
 * @param tabletId The tablet's objectId (used as kid in metadata)
 * @return EncryptedMetadata if successful, null otherwise
 */
fun EncryptionHelper.encryptFileToFile(
    inputFile: File,
    outputFile: File,
    tabletId: String
): EncryptedMetadata? {
    val result = encryptFile(inputFile, tabletId) ?: return null
    return try {
        outputFile.parentFile?.mkdirs()
        outputFile.writeBytes(result.encryptedBytes)
        result.meta
    } catch (e: Exception) {
        Timber.e(e, "EncryptionHelper.encryptFileToFile: Failed to write output file: ${outputFile.absolutePath}")
        null
    }
}

/**
 * Decrypt an encrypted file and write the result to another file.
 * 
 * @param encryptedFile The file containing encrypted data
 * @param meta The encryption metadata
 * @param outputFile The file to write decrypted data to
 * @return true if decryption and file write succeeded
 */
fun EncryptionHelper.decryptFileToFile(
    encryptedFile: File,
    meta: EncryptedMetadata,
    outputFile: File
): Boolean {
    if (!encryptedFile.exists()) {
        Timber.e("EncryptionHelper.decryptFileToFile: Encrypted file does not exist: ${encryptedFile.absolutePath}")
        return false
    }
    return try {
        val encryptedBytes = encryptedFile.readBytes()
        decryptToFile(encryptedBytes, meta, outputFile)
    } catch (e: Exception) {
        Timber.e(e, "EncryptionHelper.decryptFileToFile: Failed to read encrypted file: ${encryptedFile.absolutePath}")
        false
    }
}

/**
 * Encrypt a bitmap and write the encrypted bytes to a file.
 * 
 * @param bitmap The bitmap to encrypt
 * @param outputFile The file to write encrypted data to
 * @param tabletId The tablet's objectId (used as kid in metadata)
 * @param format The compression format (default PNG)
 * @param quality The compression quality 0-100 (default 100)
 * @return EncryptedMetadata if successful, null otherwise
 */
fun EncryptionHelper.encryptBitmapToFile(
    bitmap: Bitmap,
    outputFile: File,
    tabletId: String,
    format: Bitmap.CompressFormat = Bitmap.CompressFormat.PNG,
    quality: Int = 100
): EncryptedMetadata? {
    val result = encryptBitmap(bitmap, tabletId, format, quality) ?: return null
    return try {
        outputFile.parentFile?.mkdirs()
        outputFile.writeBytes(result.encryptedBytes)
        result.meta
    } catch (e: Exception) {
        Timber.e(e, "EncryptionHelper.encryptBitmapToFile: Failed to write output file: ${outputFile.absolutePath}")
        null
    }
}

/**
 * Decrypt an encrypted file to a Bitmap.
 * 
 * @param encryptedFile The file containing encrypted image data
 * @param meta The encryption metadata
 * @return Bitmap or null if decryption or decoding fails
 */
fun EncryptionHelper.decryptFileToBitmap(
    encryptedFile: File,
    meta: EncryptedMetadata
): Bitmap? {
    if (!encryptedFile.exists()) {
        Timber.e("EncryptionHelper.decryptFileToBitmap: File does not exist: ${encryptedFile.absolutePath}")
        return null
    }
    return try {
        val encryptedBytes = encryptedFile.readBytes()
        decryptToBitmap(encryptedBytes, meta)
    } catch (e: Exception) {
        Timber.e(e, "EncryptionHelper.decryptFileToBitmap: Failed to read encrypted file: ${encryptedFile.absolutePath}")
        null
    }
}
