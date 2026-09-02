package com.sosmartlabs.momo.watchinfo.ui

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.crashlytics.crashlytics
import com.google.firebase.Firebase
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.utils.Constants
import com.sosmartlabs.momo.utils.Resource
import com.sosmartlabs.momo.watchinfo.model.BuildInfo
import com.sosmartlabs.momo.watchinfo.model.PackageInfo
import com.sosmartlabs.momo.watchinfo.model.database.StoreInfo
import com.sosmartlabs.momo.watchinfo.model.database.StoreInfoRepository
import com.sosmartlabs.momo.watchinfo.model.database.WatchStatusRepository
import com.sosmartlabs.momo.watchinfo.model.jsonparse.JsonPackageInfo
import com.sosmartlabs.momo.watchinfo.model.jsonparse.WatchInfoParser
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject
import kotlin.coroutines.CoroutineContext

/**
 * ViewModel for watch information
 * @param ioContext Context for IO operation in coroutines
 * @param watchStatusRepository Repository for accessing watch information in database
 * @param storeInfoRepository Repository for accessing apps information in app store
 * @param watchInfoParser Parser for JSON information from WatchStatus
 */
@HiltViewModel
class WatchInfoViewModel @Inject constructor(private val ioContext: CoroutineContext,
                                             private val watchStatusRepository:
                                             WatchStatusRepository,
                                             private val storeInfoRepository: StoreInfoRepository,
                                             private val watchInfoParser: WatchInfoParser
): ViewModel() {

    companion object {
        /**
         * Default locale code for search info if the specified locale is not available
         */
        private const val DEFAULT_LOCALE = "en"
    }

    /**
     * LiveData for getting the watch build information.
     * Private instance with MutableListData, must be accessed from Activity through
     * [buildInfo] getter with LiveData type.
     */
    private val _buildInfo = MutableLiveData<Resource<BuildInfo, Unit>>()

    /**
     * LiveData for getting the watch build information.
     */
    val buildInfo: LiveData<Resource<BuildInfo, Unit>> get() = _buildInfo

    /**
     * LiveData for getting the watch apps information.
     * Private instance with MutableListData, must be accessed from Activity through
     * [appsInfo] getter with LiveData type.
     */
    private val _appsInfo = MutableLiveData<Resource<List<PackageInfo>, Unit>>()

    /**
     * LiveData for getting the watch apps information.
     */
    val appsInfo: LiveData<Resource<List<PackageInfo>, Unit>> get() = _appsInfo

    /**
     * Load the watch information
     * @param watch Watch for loading the information
     * @param locale Language for showing information. If does not find information for that
     * language, English will be used for default
     */
    fun loadWatchInfo(watch: Wearer, locale: String) {
        _appsInfo.value = Resource(Resource.Status.LOADING)
        viewModelScope.launch(ioContext) {

            runCatching { watchStatusRepository.getWatchStatus(watch.deviceId) }
                .onSuccess { watchStatus ->

                    // NOTE: WatchStatus fields are ParseDelegate-backed and CAN be null at
                    // runtime despite their non-null declared types (field missing on older
                    // watches' WatchStatus rows). isNullOrEmpty is load-bearing — do not
                    // "simplify" to isNotEmpty (fatal NPE in 4.45.3, Crashlytics ec9cbb1b).
                    when {
                        !watchStatus.info.isNullOrEmpty() -> {
                            // Build
                            runCatching {
                                watchInfoParser.getBuildInfoFromInfo(watchStatus.info)
                            }.onSuccess { build ->
                                _buildInfo.postValue(Resource(Resource.Status.LOAD_SUCCESS, build))
                            }.onFailure {
                                with(Firebase.crashlytics) {
                                    log("Error deserializing watch info JSON (build)")
                                    recordException(it)
                                }
                                _buildInfo.postValue(Resource(Resource.Status.LOAD_ERROR))
                            }

                            // Packages
                            runCatching {
                                watchInfoParser.getPackagesInfoFromInfo(watchStatus.info)
                            }.onSuccess { pkgs ->
                                addStoreInfoToPackageInfo(pkgs, locale, watch)
                            }.onFailure {
                                with(Firebase.crashlytics) {
                                    log("Error deserializing watch info JSON (packages)")
                                    recordException(it)
                                }
                                _appsInfo.postValue(Resource(Resource.Status.LOAD_ERROR))
                            }
                        }

                        !watchStatus.buildInfo.isNullOrEmpty() -> {
                            deserializeBuildInfo(watchStatus.buildInfo)
                            runCatching {
                                watchInfoParser.getPackagesInfo(watchStatus.packagesInfo ?: "{}")
                            }.onSuccess { pkgs ->
                                addStoreInfoToPackageInfo(pkgs, locale, watch)
                            }.onFailure {
                                with(Firebase.crashlytics) {
                                    log("Error deserializing packages info JSON")
                                    recordException(it)
                                }
                                _appsInfo.postValue(Resource(Resource.Status.LOAD_ERROR))
                            }
                        }

                        else -> _buildInfo.postValue(Resource(Resource.Status.LOAD_ERROR))
                    }
                }
                .onFailure {
                    Timber.e(it)
                    _appsInfo.postValue(Resource(Resource.Status.LOAD_ERROR))
                }
        }
    }

    /**
     * Deserializes and post the watch build info
     * @param buildInfoJson Json serialized watch build info
     */
    private fun deserializeBuildInfo(buildInfoJson: String) {
        lateinit var buildInfo: BuildInfo
        runCatching {
            buildInfo = watchInfoParser.getBuildInfo(buildInfoJson)
        }.onSuccess {
            _buildInfo.postValue(Resource(Resource.Status.LOAD_SUCCESS, buildInfo))
        }.onFailure {
            with(Firebase.crashlytics) {
                log("Error deserializing build info")
                recordException(it)
            }
            _buildInfo.postValue(Resource(Resource.Status.LOAD_ERROR))
        }
    }

    /**
     * Load apps info from App Store
     * @param packagesInfo Information of packages from which the information will be obtained
     * @param locale Preferred locale for results
     * @param watch Watch the packages belong to, used to filter Space 4.0 exclusive apps
     */
    private fun addStoreInfoToPackageInfo(
        packagesInfo: List<JsonPackageInfo>,
        locale: String,
        watch: Wearer
    ) {
        val supportsSpace4ExclusiveApps = watch.isSpace4OrNewer()
        val packageInfoToFind = packagesInfo.filter {
                packageInfo -> packageInfo.packageName.contains("com.sosmartlabs")
        }.filterNot { packageInfo ->
            !supportsSpace4ExclusiveApps &&
                packageInfo.packageName in Constants.SPACE4_EXCLUSIVE_PACKAGES
        }
        lateinit var appsStoreInfo: List<StoreInfo>
        runCatching {
            appsStoreInfo = storeInfoRepository.findAppsInfoInStore(packageInfoToFind, locale,
                DEFAULT_LOCALE)
        }.onSuccess {
            val appsMap = packageInfoToFind.map { jsonPackageInfo ->
                Pair(jsonPackageInfo,
                    findStoreInfo(appsStoreInfo, jsonPackageInfo.packageName, locale))
            }
            val appsInfoList = appsMap.map { (jsonPackageInfo, storeInfo) ->
                PackageInfo(jsonPackageInfo.packageName,
                    storeInfo?.name ?: jsonPackageInfo.packageName,
                    jsonPackageInfo.lastUpdateTime,
                    jsonPackageInfo.versionName,
                    storeInfo?.image?.url)
            }

            _appsInfo.postValue(Resource(Resource.Status.LOAD_SUCCESS, appsInfoList))
        }.onFailure {
            Timber.e(it)
            _appsInfo.postValue(Resource(Resource.Status.LOAD_ERROR))
        }
    }

    /**
     * Finds a StoreInfo in a list for a given package name and locale.
     * If can't find one, finds one for the given package nme and the [DEFAULT_LOCALE]
     * @param appsStoreInfo List for query
     * @param packageName Package name to find
     * @param locale Locale language to find
     * @return The StoreInfo in the list with the given package name and locale or default locale.
     * Returns null if can't find a Storeinfo
     */
    private fun findStoreInfo(appsStoreInfo: List<StoreInfo>,
                              packageName: String, locale: String) =
        findStoreInfoWithPackageNameAndLocale(appsStoreInfo, packageName, locale)
            ?: findStoreInfoWithPackageNameAndLocale(appsStoreInfo, packageName, DEFAULT_LOCALE)

    /**
     * Finds a StoreInfo in a list for a given package name and locale
     * @param appsStoreInfo List for query
     * @param packageName Package name to find
     * @param locale Locale language to find
     * @return The StoreInfo in the list with the given package name and locale.
     * If can't find one, return null
     */
    private fun findStoreInfoWithPackageNameAndLocale(appsStoreInfo: List<StoreInfo>,
                                                      packageName: String, locale: String) =
        appsStoreInfo.find {
                storeInfo -> storeInfo.packageName == packageName && storeInfo.locale == locale
        }

    fun getWatchBlueprint(watch:Wearer): Int {
        return when(watch.modelInt) {
            1 -> R.drawable.watch_h20blue
            2 -> R.drawable.watch_h20blue
            3 -> R.drawable.watch_h20blue
            4 -> R.drawable.watch_h20blue
            5 -> R.drawable.watch_space1_0blue
            6 -> R.drawable.watch_space2_0blue
            7 -> R.drawable.watch_liteblue
            8 -> R.drawable.watch_space3_0blue
            else -> R.drawable.watch_blueprint
        }
    }
}