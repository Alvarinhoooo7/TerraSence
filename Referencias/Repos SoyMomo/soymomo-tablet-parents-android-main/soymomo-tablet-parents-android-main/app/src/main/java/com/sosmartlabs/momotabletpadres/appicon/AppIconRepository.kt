package com.sosmartlabs.momotabletpadres.appicon

import android.content.Context
import android.graphics.drawable.Drawable
import com.bumptech.glide.Glide
import com.sosmartlabs.momotabletpadres.appicon.cache.AppIconDiskCacheDataSource
import com.sosmartlabs.momotabletpadres.appicon.packagemanager.PackageManagerAppIconDataSource
import com.sosmartlabs.momotabletpadres.appicon.remote.ParseAppIconDataSource
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.cancellation.CancellationException
import java.io.FileInputStream
import java.util.concurrent.TimeUnit

@Singleton
class AppIconRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    private val packageManagerAppIconDataSource: PackageManagerAppIconDataSource,
    private val diskCache: AppIconDiskCacheDataSource,
    private val parseAppIconDataSource: ParseAppIconDataSource
) {
    private val cachedAppIcons = mutableMapOf<String, Drawable>()

    // Bound how many icons download at once. Icons are non-critical (they fall back
    // to a default), and this cap keeps the per-icon coroutine fan-out from tying up
    // the shared Dispatchers.IO pool that every repository's Parse work also uses.
    @OptIn(ExperimentalCoroutinesApi::class)
    private val iconDownloadDispatcher = Dispatchers.IO.limitedParallelism(ICON_DOWNLOAD_CONCURRENCY)

    /**
     * Returns a map of packageName to Drawable for the given list of package names.
     * It uses a multi-layered caching strategy:
     * 1. In-Memory Cache (fastest)
     * 2. PackageManager (for installed apps)
     * 3. Disk Cache (for previously downloaded icons)
     * 4. Parse (network fetch, the last resort)
     */
    suspend fun getAppIcons(packageNames: List<String>): Map<String, Drawable> {
        if (packageNames.isEmpty()) {
            Timber.d("AppIconRepository: getAppIcons - Empty packageNames list, returning empty map")
            return mapOf()
        }
        Timber.d("AppIconRepository: getAppIcons - Requested ${packageNames.size} icons: $packageNames")

        val foundIcons = mutableMapOf<String, Drawable>()
        var packageNamesToFind = packageNames.distinct()

        // Step 1: Get from In-Memory Cache
        val memoryIcons = cachedAppIcons.filterKeys { it in packageNamesToFind }
        foundIcons.putAll(memoryIcons)
        packageNamesToFind = packageNamesToFind.subtract(foundIcons.keys).toList()
        Timber.d("AppIconRepository: getAppIcons - Found ${memoryIcons.size} icons in memory. Remaining: ${packageNamesToFind.size}")

        if (packageNamesToFind.isEmpty()) return foundIcons

        // Step 2: Get from PackageManager
        val pmIcons = packageManagerAppIconDataSource.getAppIcons(packageNamesToFind)
        foundIcons.putAll(pmIcons)
        cachedAppIcons.putAll(pmIcons)
        packageNamesToFind = packageNamesToFind.subtract(foundIcons.keys).toList()
        Timber.d("AppIconRepository: getAppIcons - Found ${pmIcons.size} icons in PackageManager. Remaining: ${packageNamesToFind.size}")

        if (packageNamesToFind.isEmpty()) return foundIcons

        // Step 3: Get from Disk Cache
        val diskIcons = diskCache.getIcons(packageNamesToFind)
        foundIcons.putAll(diskIcons)
        cachedAppIcons.putAll(diskIcons)
        packageNamesToFind = packageNamesToFind.subtract(foundIcons.keys).toList()
        Timber.d("AppIconRepository: getAppIcons - Found ${diskIcons.size} icons in Disk Cache. Remaining: ${packageNamesToFind.size}")

        if (packageNamesToFind.isEmpty()) return foundIcons

        // Step 4: Fetch from Parse and save to disk
        Timber.d("AppIconRepository: getAppIcons - Fetching ${packageNamesToFind.size} icons from Parse.")
        val parseIcons = getIconsFromParseAndCache(packageNamesToFind)
        foundIcons.putAll(parseIcons)
        // In-memory cache is handled inside getIconsFromParseAndCache

        Timber.d("AppIconRepository: getAppIcons - Returning ${foundIcons.size} total icons.")
        return foundIcons
    }

    /**
     * Loads app icons from Parse, saves them to the disk cache, and returns them.
     */
    private suspend fun getIconsFromParseAndCache(packageNames: List<String>): Map<String, Drawable> = coroutineScope {
        if (packageNames.isEmpty()) return@coroutineScope mapOf()

        runCatching {
            val parseAppIcons = parseAppIconDataSource.getParseAppIconsByPackageNames(packageNames)
            Timber.d("AppIconRepository: getIconsFromParseAndCache - Received ${parseAppIcons.size} ParseAppIcon objects")

            val timeoutMillis = TimeUnit.SECONDS.toMillis(10)

            val appIcons = parseAppIcons.map { parseAppIcon ->
                async(iconDownloadDispatcher) {
                        val packageName = parseAppIcon.packageName
                        val iconUrl = parseAppIcon.icon?.url
                        if (packageName.isNullOrEmpty() || iconUrl.isNullOrEmpty()) {
                            return@async null
                        }
                        // Download the icon BY URL with Glide instead of the blocking
                        // ParseFile.getDataStream(). ParseFile downloads run on Bolts'
                        // Task.BACKGROUND_EXECUTOR (only CPU+1 threads) — the very pool
                        // that also converts/delivers EVERY Parse query's result. Pinning
                        // those threads on a slow-network icon burst froze the whole app
                        // (responses arrived but were never delivered) until force-close.
                        // Glide downloads on its own executors, so it never touches Bolts;
                        // and get(timeout) is a real, interruptible timeout (unlike
                        // withTimeoutOrNull wrapped around a blocking call).
                        val target = Glide.with(context).asFile().load(iconUrl).submit()
                        try {
                            val iconFile = target.get(timeoutMillis, TimeUnit.MILLISECONDS)
                            FileInputStream(iconFile).use { stream ->
                                diskCache.saveAndGetIcon(packageName, stream)?.let {
                                    Timber.d("AppIconRepository: getIconsFromParseAndCache - Loaded and cached icon for $packageName")
                                    packageName to it
                                }
                            }
                        } catch (e: Exception) {
                            if (e is CancellationException) throw e
                            Timber.e(e, "AppIconRepository: getIconsFromParseAndCache - Error for $packageName")
                            CrashlyticsLog.recordNonFatalError(e, "Error in getIconsFromParseAndCache for $packageName")
                            null
                        } finally {
                            Glide.with(context).clear(target)
                        }
                }
            }.awaitAll()
                .filterNotNull()
                .toMap()
                .also {
                    cachedAppIcons.putAll(it)
                    Timber.d("AppIconRepository: getIconsFromParseAndCache - Loaded ${it.size} icons from Parse.")
                }

            appIcons
        }.onFailure { throwable ->
            Timber.e(throwable, "AppIconRepository: getIconsFromParseAndCache - Error loading icons from Parse")
            CrashlyticsLog.recordNonFatalError(throwable, "Error loading icons from Parse for $packageNames")
        }.getOrDefault(mapOf())
    }

    companion object {
        // Max simultaneous icon downloads. Small on purpose: icons are non-critical
        // (they degrade to a default), and the cap is what stops the blocking
        // downloads from starving the shared Dispatchers.IO pool app-wide.
        private const val ICON_DOWNLOAD_CONCURRENCY = 4
    }
}