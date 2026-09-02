package com.sosmartlabs.momotabletpadres

import android.app.Application
import com.github.anrwatchdog.ANRWatchDog
import com.google.android.libraries.places.api.Places
import com.google.firebase.FirebaseApp
import com.parse.Parse
import com.parse.ParseObject
import com.sosmartlabs.momotabletpadres.utils.dns.IPv4PreferredDns
import com.sosmartlabs.momotabletpadres.utils.firebase.FirebaseRemoteConfigRepository
import okhttp3.OkHttpClient
import java.util.concurrent.TimeUnit
import com.sosmartlabs.momotabletpadres.contacts.model.remote.ParseAllowedNumber
import com.sosmartlabs.momotabletpadres.contacts.model.remote.ParseBlockedNumber
import com.sosmartlabs.momotabletpadres.contacts.model.remote.ParsePhoneContact
import com.sosmartlabs.momotabletpadres.appinfo.model.remote.ParseAppInfo
import com.sosmartlabs.momotabletpadres.core.common.dug.detectedconversation.model.remote.ParseDetectedConversation
import com.sosmartlabs.momotabletpadres.core.common.dug.detectedconversation.model.remote.ParseDetectedConversationScreenshot
import com.sosmartlabs.momotabletpadres.core.common.dug.explicitmusic.model.remote.ParseExplicitMusicArtist
import com.sosmartlabs.momotabletpadres.core.common.dug.explicitmusic.model.remote.ParseExplicitMusicDetection
import com.sosmartlabs.momotabletpadres.core.common.dug.smartdetection.model.remote.ParseSmartDetection
import com.sosmartlabs.momotabletpadres.core.common.dug.unsafesearch.model.adulttitle.remote.ParseAdultTitle
import com.sosmartlabs.momotabletpadres.core.common.dug.unsafesearch.model.dangerousinfluencer.remote.ParseDangerousInfluencer
import com.sosmartlabs.momotabletpadres.core.common.dug.unsafesearch.model.dangerousviral.remote.ParseDangerousViral
import com.sosmartlabs.momotabletpadres.core.common.dug.unsafesearch.model.remote.ParseDetectedUnsafeSearch
import com.sosmartlabs.momotabletpadres.core.common.safewalking.model.remote.ParseSafeWalkingSettings
import com.sosmartlabs.momotabletpadres.tabletsettings.times.schoolmode.model.remote.ParseSchoolModeSettings
import com.sosmartlabs.momotabletpadres.tablet.model.remote.ParseTablet
import com.sosmartlabs.momotabletpadres.tabletsettings.times.usetime.model.remote.ParseUseTime
import com.sosmartlabs.momotabletpadres.geofences.model.Geofence
import com.sosmartlabs.momotabletpadres.locationhistory.model.remote.ParseLocationHistory
import com.sosmartlabs.momotabletpadres.model.remote.ParseAppIcon
import com.sosmartlabs.momotabletpadres.models.AdBlockerSettings
import com.sosmartlabs.momotabletpadres.models.AppStats
import com.sosmartlabs.momotabletpadres.models.BlockedAdsHistory
import com.sosmartlabs.momotabletpadres.models.Notification
import com.sosmartlabs.momotabletpadres.models.NotificationCategory
import com.sosmartlabs.momotabletpadres.tabletsettings.remotescreenshot.model.RemoteScreenshot
import com.sosmartlabs.momotabletpadres.models.RequestTime
import com.sosmartlabs.momotabletpadres.models.RequestTimeApp
import com.sosmartlabs.momotabletpadres.models.TabletUser
import com.sosmartlabs.momotabletpadres.models.Update
import com.sosmartlabs.momotabletpadres.models.UpdateDE
import com.sosmartlabs.momotabletpadres.tabletsettings.blocks.web.model.Website
import com.sosmartlabs.momotabletpadres.models.entity.NPSScheduler
import com.sosmartlabs.momotabletpadres.sim.model.ApioCredentials
import com.sosmartlabs.momotabletpadres.sim.model.MnoProvider
import com.sosmartlabs.momotabletpadres.sim.model.MobileNetworkOperator
import com.sosmartlabs.momotabletpadres.sim.model.PaymentProvider
import com.sosmartlabs.momotabletpadres.sim.model.PaymentUserCard
import com.sosmartlabs.momotabletpadres.sim.model.Sim
import com.sosmartlabs.momotabletpadres.sim.model.StripeCredentials
import com.sosmartlabs.momotabletpadres.sim.model.Subscription
import com.sosmartlabs.momotabletpadres.sim.model.SubscriptionPlan
import com.sosmartlabs.momotabletpadres.sim.model.SubscriptionsUserInfo
import com.sosmartlabs.momotabletpadres.tabletsettings.appprotection.model.appdata.remote.ParseAppData
import com.sosmartlabs.momotabletpadres.tabletsettings.appprotection.model.installedapp.remote.ParseInstalledApp
import com.sosmartlabs.momotabletpadres.security.DeviceKeySyncInitializer
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import dagger.hilt.android.HiltAndroidApp
import timber.log.Timber
import timber.log.Timber.DebugTree
import kotlin.system.measureTimeMillis

@HiltAndroidApp
class MomoTabletPadresApplication : Application() {

    override fun onCreate() {
        super.onCreate()

        Timber.d("MomoTabletPadresApplication: Starting application initialization")
        val timeOnCreate = measureTimeMillis {
            initializeTimber()
            initWatchDog()
            FirebaseApp.initializeApp(applicationContext)
            // Register in-app defaults + fetch server config so the remote flags actually
            // work. fetchAndActivate is async, so server overrides take effect on the NEXT
            // launch; this launch uses the registered defaults. initParse() reads
            // disableIpv4PreferredDns right after, which (until a server value is cached)
            // resolves to the default false = IPv4-preferred enabled.
            FirebaseRemoteConfigRepository.initialize()
            initParse()
            initPlaces()
            initDeviceKeySync()
        }
        
        CrashlyticsLog.log("MomoTabletPadresApplication: Application initialization completed in ${timeOnCreate}ms")
        Timber.d("MomoTabletPadresApplication: Application initialization completed in $timeOnCreate ms")
    }

    private fun initDeviceKeySync() {
        Timber.d("MomoTabletPadresApplication: Initializing device key sync")
        DeviceKeySyncInitializer.initialize(this)
    }

    private fun initializeTimber() {
        CrashlyticsLog.log("MomoTabletPadresApplication: Initializing Timber")
        Timber.d("MomoTabletPadresApplication: Initializing Timber logging")
        if (BuildConfig.DEBUG) {
            Timber.plant(DebugTree())
            Timber.d("MomoTabletPadresApplication: Debug tree planted for logging")
        }
    }

    private fun initWatchDog() {
        Timber.d("MomoTabletPadresApplication: Starting ANR WatchDog")
        if (BuildConfig.DEBUG) {
            ANRWatchDog().setANRListener { error ->
                Timber.e(error, "MomoTabletPadresApplication: ANRWatchDog detected ANR")
                CrashlyticsLog.recordNonFatalError(error, "MomoTabletPadresApplication: ANRWatchDog detected ANR")
            }.start()
        }
    }

    private fun initParse() {
        CrashlyticsLog.log("MomoTabletPadresApplication:Starting Parse initialization")
        Timber.d("MomoTabletPadresApplication: Starting Parse initialization")
        val parseClasses = listOf(
            AdBlockerSettings::class.java,
            ApioCredentials::class.java,
            AppStats::class.java,
            BlockedAdsHistory::class.java,
            Geofence::class.java,
            MnoProvider::class.java,
            MobileNetworkOperator::class.java,
            Notification::class.java,
            NotificationCategory::class.java,
            NPSScheduler::class.java,
            ParseAdultTitle::class.java,
            ParseAppIcon::class.java,
            ParseAppInfo::class.java,
            ParseDangerousInfluencer::class.java,
            ParseDangerousViral::class.java,
            ParseDetectedConversation::class.java,
            ParseDetectedConversationScreenshot::class.java,
            ParseDetectedUnsafeSearch::class.java,
            ParseExplicitMusicArtist::class.java,
            ParseExplicitMusicDetection::class.java,
            ParseInstalledApp::class.java,
            ParseLocationHistory::class.java,
            ParseSafeWalkingSettings::class.java,
            ParseSchoolModeSettings::class.java,
            ParseSmartDetection::class.java,
            ParseTablet::class.java,
            ParseUseTime::class.java,
            PaymentProvider::class.java,
            PaymentUserCard::class.java,
            RemoteScreenshot::class.java,
            RequestTime::class.java,
            RequestTimeApp::class.java,
            Sim::class.java,
            StripeCredentials::class.java,
            Subscription::class.java,
            SubscriptionPlan::class.java,
            SubscriptionsUserInfo::class.java,
            TabletUser::class.java,
            Update::class.java,
            UpdateDE::class.java,
            Website::class.java,
            ParsePhoneContact::class.java,
            ParseBlockedNumber::class.java,
            ParseAllowedNumber::class.java,
            ParseAppData::class.java
        )

        Timber.d("MomoTabletPadresApplication: Registering ${parseClasses.size} Parse subclasses")
        parseClasses.forEach {
            ParseObject.registerSubclass(it)
        }

        Timber.d("MomoTabletPadresApplication: Configuring Parse with application ID: ${BuildConfig.parseApplicationId}")
        val parseConfigBuilder = Parse.Configuration.Builder(this)
            .applicationId(BuildConfig.parseApplicationId)
            .clientKey(BuildConfig.parseClientKey)
            .server(BuildConfig.parseRequestUrl)

        // --- Network resilience on low-end devices / flaky mobile networks ---
        // Parse-Android runs every request *synchronously* on its own
        // ParseRequest.NETWORK_EXECUTOR, a pool sized to CPU_COUNT*4+1 — only 9
        // threads on a 2-core device (vs 33 on an 8-core phone). Two defaults
        // make that tiny pool starve, which is why the app "stops receiving
        // responses" until force-closed on some devices but never on others:
        //
        //   1. No call timeout. Parse sets none, and OkHttp's callTimeout
        //      defaults to 0 (unbounded), so a single stalled request can pin a
        //      pool thread forever. callTimeout() caps each attempt so threads
        //      are always returned to the pool.
        //   2. 4 retries by default (5 attempts/request). On a lossy network
        //      this multiplies in-flight load ~5x and saturates the small pool.
        //      maxRetries(2) keeps resilience while cutting the amplification.
        //
        // These are independent of the DNS preference below and always apply.
        val clientBuilder = OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(20, TimeUnit.SECONDS)
            .writeTimeout(20, TimeUnit.SECONDS)
            .callTimeout(45, TimeUnit.SECONDS)

        // Prefer IPv4 for Parse's HTTP client. Some user networks advertise IPv6
        // but can't actually route it (broken/partial IPv6); the IPv6 connect
        // then stalls and the app appears to "stop getting responses".
        // IPv4PreferredDns uses IPv4 on dual-stack hosts and falls back to IPv6
        // on IPv6-only (NAT64/DNS64) networks. Remote kill-switch: set
        // DISABLE_IPV4_PREFERRED_DNS=true to revert to the SDK default.
        val ipv4PreferredDisabled = runCatching {
            FirebaseRemoteConfigRepository.disableIpv4PreferredDns
        }.getOrDefault(false)
        if (!ipv4PreferredDisabled) {
            clientBuilder.dns(IPv4PreferredDns())
            Timber.d("MomoTabletPadresApplication: Parse using IPv4-preferred DNS")
        }

        parseConfigBuilder
            .clientBuilder(clientBuilder)
            .maxRetries(2)

        Parse.initialize(parseConfigBuilder.build())
        CrashlyticsLog.log("MomoTabletPadresApplication: Parse initialized")
        Timber.d("MomoTabletPadresApplication: Parse initialization completed")
    }

    private fun initPlaces() {
        Timber.d("MomoTabletPadresApplication: Initializing Places API")
        if (!Places.isInitialized()) {
            Places.initializeWithNewPlacesApiEnabled(applicationContext, BuildConfig.googlePlacesApiKey)
        }
        
        CrashlyticsLog.log("MomoTabletPadresApplication: Places initialized")
    }
}