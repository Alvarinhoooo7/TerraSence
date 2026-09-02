package com.sosmartlabs.momo.lingo.asset

// Mirrors iOS LingoAssetURL.swift — same R2 bucket, same cleanKey() logic.
object LingoAssetUrl {
    private const val BASE_URL = "https://pub-c3e1856eb8894486a072a8304ff64f6d.r2.dev"

    fun drawableUrl(key: String, ext: String = "svg"): String? {
        val cleaned = cleanKey(key)
        if (cleaned.isEmpty()) return null
        return "$BASE_URL/drawable/$cleaned.$ext"
    }

    fun cleanKey(key: String): String {
        val stripped = key.replace(Regex("[^a-zA-Z0-9 \\-_]"), "")
        val collapsed = stripped.split(Regex("\\s+"))
            .filter { it.isNotEmpty() }
            .joinToString("_")
        val trimmed = collapsed.trim('_')
        return trimmed.take(200)
    }
}
