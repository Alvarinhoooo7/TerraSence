package com.sosmartlabs.momo.watchinfo.model.jsonparse

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.Date

/**
 * Regression tests for parsing WatchStatus.info JSON, in particular the `installedApps` field
 * that some watch firmwares upload as a JSON STRING instead of an array
 * (Crashlytics issue df6a79747937f0b96971adb16ca7da6b:
 * "Expected BEGIN_ARRAY but was STRING at $.installedApps").
 */
class WatchInfoParserTest {

    private val parser = WatchInfoParser()

    private fun infoJson(installedAppsJson: String?): String {
        val installedApps = installedAppsJson?.let { ""","installedApps":$it""" } ?: ""
        return """
            {
                "deviceId":"860000000000001",
                "manufacturer":"SoyMomo",
                "model":"Space 4.0",
                "osVersion":"13",
                "sdkVersion":33,
                "buildNumber":"S4.1.2.3",
                "networkType":"LTE"
                $installedApps
            }
        """.trimIndent()
    }

    private val appEntryJson =
        """{"packageName":"com.sosmartlabs.x","lastUpdateTime":1,"versionName":"1.0","versionCode":1,"isSystemApp":false}"""

    @Test
    fun `installedApps as proper array parses build info and packages`() {
        val json = infoJson("[$appEntryJson]")

        val build = parser.getBuildInfoFromInfo(json)
        assertEquals("33", build.sdk)
        assertEquals("Space 4.0", build.model)
        assertEquals("SoyMomo", build.manufacturer)
        assertEquals("13", build.release)
        assertEquals("S4.1.2.3", build.buildNumber)

        val packages = parser.getPackagesInfoFromInfo(json)
        assertEquals(1, packages.size)
        assertEquals("com.sosmartlabs.x", packages[0].packageName)
        assertEquals(Date(1), packages[0].lastUpdateTime)
        assertEquals("1.0", packages[0].versionName)
        assertEquals(1, packages[0].versionCode)
    }

    @Test
    fun `installedApps as string containing JSON-encoded array is recovered`() {
        // Exact crash reproduction: without pre-normalization Gson throws
        // JsonSyntaxException (Expected BEGIN_ARRAY but was STRING at $.installedApps).
        val encodedArray = "[$appEntryJson]".replace("\\", "\\\\").replace("\"", "\\\"")
        val json = infoJson("\"$encodedArray\"")

        val build = parser.getBuildInfoFromInfo(json)
        assertEquals("33", build.sdk)

        val packages = parser.getPackagesInfoFromInfo(json)
        assertEquals(1, packages.size)
        assertEquals("com.sosmartlabs.x", packages[0].packageName)
    }

    @Test
    fun `installedApps as empty string falls back to empty list`() {
        val json = infoJson("\"\"")

        val build = parser.getBuildInfoFromInfo(json)
        assertEquals("33", build.sdk)

        assertTrue(parser.getPackagesInfoFromInfo(json).isEmpty())
    }

    @Test
    fun `installedApps as non-JSON string falls back to empty list`() {
        val json = infoJson("\"N/A\"")

        val build = parser.getBuildInfoFromInfo(json)
        assertEquals("33", build.sdk)

        assertTrue(parser.getPackagesInfoFromInfo(json).isEmpty())
    }

    @Test
    fun `missing installedApps key falls back to empty list`() {
        val json = infoJson(null)

        val build = parser.getBuildInfoFromInfo(json)
        assertEquals("33", build.sdk)

        assertTrue(parser.getPackagesInfoFromInfo(json).isEmpty())
    }
}
