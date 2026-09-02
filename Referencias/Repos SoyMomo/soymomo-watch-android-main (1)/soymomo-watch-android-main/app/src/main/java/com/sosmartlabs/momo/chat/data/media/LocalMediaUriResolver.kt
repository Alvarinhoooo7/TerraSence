package com.sosmartlabs.momo.chat.data.media

import java.io.File
import java.net.URI

object LocalMediaUriResolver {

    fun filePathToUri(path: String): String {
        return File(path).toURI().toString()
    }

    fun resolveExistingLocalFilePath(uriOrPath: String?): String? {
        val rawValue = uriOrPath?.takeIf { it.isNotBlank() } ?: return null
        val resolvedPath = runCatching {
            val uri = URI(rawValue)
            when {
                uri.scheme.equals("file", ignoreCase = true) -> File(uri).absolutePath
                else -> rawValue
            }
        }.getOrElse {
            rawValue
        }

        return resolvedPath.takeIf { File(it).exists() }
    }
}
