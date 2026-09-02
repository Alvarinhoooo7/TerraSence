package com.sosmartlabs.momo.chat.data.media

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import java.io.File
import java.nio.file.Files

class LocalMediaUriResolverTest {

    @Test
    fun `resolveExistingLocalFilePath handles File toURI output`() {
        val tempFile = Files.createTempFile("local-media-uri", ".m4a").toFile()
        try {
            val uri = tempFile.toURI().toString()

            assertEquals(tempFile.absolutePath, LocalMediaUriResolver.resolveExistingLocalFilePath(uri))
        } finally {
            tempFile.delete()
        }
    }

    @Test
    fun `resolveExistingLocalFilePath handles direct file path`() {
        val tempFile = Files.createTempFile("local-media-path", ".jpg").toFile()
        try {
            assertEquals(tempFile.absolutePath, LocalMediaUriResolver.resolveExistingLocalFilePath(tempFile.absolutePath))
        } finally {
            tempFile.delete()
        }
    }

    @Test
    fun `resolveExistingLocalFilePath returns null for missing file uri`() {
        val missingUri = File("/tmp/does-not-exist-${System.nanoTime()}.m4a").toURI().toString()

        assertNull(LocalMediaUriResolver.resolveExistingLocalFilePath(missingUri))
    }
}
