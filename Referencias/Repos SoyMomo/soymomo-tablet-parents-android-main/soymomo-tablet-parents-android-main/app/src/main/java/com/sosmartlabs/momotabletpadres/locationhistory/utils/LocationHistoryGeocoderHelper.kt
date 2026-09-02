package com.sosmartlabs.momotabletpadres.locationhistory.utils

import android.content.Context
import android.location.Address
import android.location.Geocoder
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import timber.log.Timber
import java.util.Locale
import java.util.concurrent.ConcurrentHashMap
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.math.roundToInt

/**
 * Helper class for reverse geocoding locations in Location History.
 * Uses the built-in Android Geocoder (FREE, no API key required).
 * 
 * Features:
 * - In-memory caching to avoid duplicate geocoding requests
 * - Graceful fallback if geocoding fails
 * - Short, readable address format
 */
@Singleton
class LocationHistoryGeocoderHelper @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val geocoder = Geocoder(context, Locale.getDefault())
    
    // In-memory cache for geocoded addresses (cleared when app restarts)
    // Key format: "lat_lng" with 5 decimal places precision (~1.1m accuracy)
    private val addressCache = ConcurrentHashMap<String, String?>()
    
    /**
     * Reverse geocode a location to get a human-readable address.
     * Results are cached in memory to avoid duplicate requests.
     * 
     * @param latitude Location latitude
     * @param longitude Location longitude
     * @return Short address string (e.g., "Av. Providencia 123") or null if geocoding fails
     */
    suspend fun getAddressForLocation(latitude: Double, longitude: Double): String? {
        val cacheKey = createCacheKey(latitude, longitude)
        
        // Check cache first
        if (addressCache.containsKey(cacheKey)) {
            return addressCache[cacheKey]
        }
        
        return withContext(Dispatchers.IO) {
            try {
                @Suppress("DEPRECATION")
                val addresses = geocoder.getFromLocation(latitude, longitude, 1)
                
                val result = if (!addresses.isNullOrEmpty()) {
                    val address = addresses[0]
                    buildShortAddress(address)
                } else {
                    null
                }
                
                // Cache the result (even if null, to avoid retrying failed lookups)
                addressCache[cacheKey] = result
                
                Timber.d("LocationHistoryGeocoderHelper: Geocoded ($latitude, $longitude) -> $result")
                result
            } catch (e: Exception) {
                Timber.w(e, "LocationHistoryGeocoderHelper: Geocoding failed for ($latitude, $longitude)")
                // Cache null to avoid retrying
                addressCache[cacheKey] = null
                null
            }
        }
    }
    
    /**
     * Build a short, human-readable address from a Geocoder Address object.
     * Priority: Street + Number > Street only > Locality > Feature Name
     */
    private fun buildShortAddress(address: Address): String? {
        val street = address.thoroughfare
        val number = address.subThoroughfare
        val locality = address.locality
        val subLocality = address.subLocality
        val feature = address.featureName
        
        return when {
            // Street + Number (e.g., "Av. Providencia 123")
            !street.isNullOrBlank() && !number.isNullOrBlank() -> "$street $number"
            // Street only (e.g., "Av. Providencia")
            !street.isNullOrBlank() -> street
            // Sub-locality / neighborhood (e.g., "Providencia")
            !subLocality.isNullOrBlank() -> subLocality
            // City / locality (e.g., "Santiago")
            !locality.isNullOrBlank() -> locality
            // Feature name (sometimes contains POI name)
            !feature.isNullOrBlank() && feature != number -> feature
            else -> null
        }
    }
    
    /**
     * Create a cache key from latitude/longitude with ~1.1m precision (5 decimal places)
     */
    private fun createCacheKey(latitude: Double, longitude: Double): String {
        val latRounded = (latitude * 100000).roundToInt() / 100000.0
        val lngRounded = (longitude * 100000).roundToInt() / 100000.0
        return "${latRounded}_${lngRounded}"
    }
    
    /**
     * Get cached address synchronously (does NOT trigger geocoding if not in cache).
     * Use this for synchronous UI updates like info windows.
     * 
     * @param latitude Location latitude
     * @param longitude Location longitude
     * @return Cached address string or null if not cached
     */
    fun getCachedAddress(latitude: Double, longitude: Double): String? {
        val cacheKey = createCacheKey(latitude, longitude)
        return addressCache[cacheKey]
    }
    
    /**
     * Clear the address cache (useful for testing or memory management)
     */
    fun clearCache() {
        addressCache.clear()
        Timber.d("LocationHistoryGeocoderHelper: Cache cleared")
    }
    
    /**
     * Get the current cache size (for debugging/monitoring)
     */
    fun getCacheSize(): Int = addressCache.size
    
    /**
     * Check if Geocoder is available on this device
     */
    fun isGeocoderAvailable(): Boolean = Geocoder.isPresent()
}
