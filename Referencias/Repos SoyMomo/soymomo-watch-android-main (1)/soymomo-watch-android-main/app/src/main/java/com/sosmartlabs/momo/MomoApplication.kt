package com.sosmartlabs.momo

import android.app.Application
import androidx.hilt.work.HiltWorkerFactory
import androidx.work.Configuration
import com.github.anrwatchdog.ANRWatchDog
import com.google.android.gms.maps.MapsInitializer
import com.parse.Parse
import com.parse.ParseObject
import com.sosmartlabs.momo.addfirstwatch.model.remote.MobileNetworkOperator
import com.sosmartlabs.momo.chat.data.remote.model.ChatUser
import com.sosmartlabs.momo.chat.data.remote.model.ChatGroup
import com.sosmartlabs.momo.chat.data.remote.model.GroupMember
import com.sosmartlabs.momo.chat.data.remote.model.GroupMessage
import com.sosmartlabs.momo.chat.data.remote.model.Message
import com.sosmartlabs.momo.dispatch.model.ParseKeysRepository
import com.sosmartlabs.momo.firebase.FirebaseRemoteConfigRepository
import com.sosmartlabs.momo.geofences.model.Geofence
import com.sosmartlabs.momo.installedapp.model.InstalledApp
import com.sosmartlabs.momo.lingo.model.LingoAbcLevel
import com.sosmartlabs.momo.lingo.model.LingoGameSettings
import com.sosmartlabs.momo.lingo.model.LingoSettings
import com.sosmartlabs.momo.models.NPSScheduler
import com.sosmartlabs.momo.models.UserWifi
import com.sosmartlabs.momo.models.WatchUser
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.myfriends.model.WatchWearer
import com.sosmartlabs.momo.phonebook.model.phonecontact.PhoneContact
import com.sosmartlabs.momo.pushnotifications.ui.NotificationChannelCreator
import com.sosmartlabs.momo.reminders.model.Reminder
import com.sosmartlabs.momo.sim.model.ApioCredentials
import com.sosmartlabs.momo.sim.model.MnoProvider
import com.sosmartlabs.momo.sim.model.PaymentProvider
import com.sosmartlabs.momo.sim.model.PaymentUserCard
import com.sosmartlabs.momo.sim.model.Sim
import com.sosmartlabs.momo.sim.model.SimDiscountCampaign
import com.sosmartlabs.momo.sim.model.SimOrder
import com.sosmartlabs.momo.sim.model.SimPopupTracking
import com.sosmartlabs.momo.sim.model.UpgradePopupTracking
import com.sosmartlabs.momo.sim.model.StripeCredentials
import com.sosmartlabs.momo.sim.model.Subscription
import com.sosmartlabs.momo.sim.model.SubscriptionPlan
import com.sosmartlabs.momo.sim.model.SubscriptionsUserInfo
import com.sosmartlabs.momo.steps.model.remote.Pedometer
import com.sosmartlabs.momo.steps.model.remote.PedometerSteps
import com.sosmartlabs.momo.ble.BleProximityScanWorkerCreator
import com.sosmartlabs.momo.userlocation.worker.UserLocationWorkerCreator
import com.sosmartlabs.momo.utils.dns.IPv4OnlyDns
import com.sosmartlabs.momo.videocall.model.VideocallFeedback
import com.sosmartlabs.momo.watchcontacts.model.Contact
import com.sosmartlabs.momo.watchinfo.model.database.StoreInfo
import com.sosmartlabs.momo.watchinfo.model.database.WatchStatus
import com.sosmartlabs.momo.watchrequests.model.UserPermission
import com.sosmartlabs.momo.models.WatchSettings
import dagger.hilt.android.HiltAndroidApp
import okhttp3.OkHttpClient
import timber.log.Timber
import timber.log.Timber.DebugTree
import javax.inject.Inject
import kotlin.concurrent.thread

@HiltAndroidApp
class MomoApplication: Application(), Configuration.Provider {

    @Inject
    lateinit var parseKeysRepository: ParseKeysRepository

    @Inject
    lateinit var notificationChannelCreator: NotificationChannelCreator

    @Inject
    lateinit var workerFactory: HiltWorkerFactory

    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder().setWorkerFactory(workerFactory).build()

    @Inject
    lateinit var userLocationWorkerCreator: UserLocationWorkerCreator

    @Inject
    lateinit var bleProximityScanWorkerCreator: BleProximityScanWorkerCreator

    override fun onCreate() {
        super.onCreate()
        initializeTimber()
        initializeFirebaseRemoteConfigRepository()
        initializeANRWatchdog()
        initializeParse()
        initializeMaps()
        initializeNotificationChannels()
        initializeUserLocationWorker()
        initializeBleProximityScanWorker()
    }

    private fun initializeTimber() {
        if (BuildConfig.DEBUG) {
            Timber.plant(DebugTree())
        }
    }

    private fun initializeFirebaseRemoteConfigRepository() {
        Timber.d("MomoApplication: Initializing Firebase FirebaseRemoteConfigRepository")
        FirebaseRemoteConfigRepository.initialize()
    }

    private fun initializeANRWatchdog() {
        if (BuildConfig.DEBUG) {
            Timber.d("MomoApplication: Initializing ANR Watchdog")
            ANRWatchDog().start()
        }
    }

    private fun initializeParse() {
        Timber.d("MomoApplication: Initializing Parse")
        try {
            val forceUseIpv4ParseSdk = FirebaseRemoteConfigRepository.forceUseIpv4ParseSdk
            Timber.d("MomoApplication: will force usage of IPV4: $forceUseIpv4ParseSdk")

            with(parseKeysRepository) {
                Timber.d("MomoApplication: Using Parse keys appKey: $parseAppKey, clientKey: $parseClientKey, serverUrl: $parseServerUrl")
                val configBuilder = Parse.Configuration.Builder(applicationContext)
                    .applicationId(parseAppKey)
                    .clientKey(parseClientKey)
                    .server(parseServerUrl)
                
                if (forceUseIpv4ParseSdk) {
                    Timber.d("MomoApplication: Configuring OkHttpClient with IPv4OnlyDns")
                    val okHttpClientBuilder = OkHttpClient.Builder()
                        .dns(IPv4OnlyDns())
                    configBuilder.clientBuilder(okHttpClientBuilder)
                }
                
                Parse.initialize(configBuilder.build())
            }
            registerParseSubclasses()
        } catch (e: Exception) {
            Timber.e(e, "MomoApplication: Parse initialization failed")
        }
    }

    private fun registerParseSubclasses() {
        Timber.d("MomoApplication: Registering Parse subclasses")

        val classesToRegister = listOf(
            ApioCredentials::class.java,
            ChatGroup::class.java,
            ChatUser::class.java,
            Contact::class.java,
            Geofence::class.java,
            GroupMember::class.java,
            GroupMessage::class.java,
            InstalledApp::class.java,
            LingoAbcLevel::class.java,
            LingoGameSettings::class.java,
            LingoSettings::class.java,
            Message::class.java,
            MnoProvider::class.java,
            MobileNetworkOperator::class.java,
            NPSScheduler::class.java,
            PaymentProvider::class.java,
            PaymentUserCard::class.java,
            Pedometer::class.java,
            PedometerSteps::class.java,
            PhoneContact::class.java,
            Reminder::class.java,
            Sim::class.java,
            SimDiscountCampaign::class.java,
            SimOrder::class.java,
            SimPopupTracking::class.java,
            StoreInfo::class.java,
            StripeCredentials::class.java,
            Subscription::class.java,
            SubscriptionPlan::class.java,
            SubscriptionsUserInfo::class.java,
            UpgradePopupTracking::class.java,
            UserPermission::class.java,
            UserWifi::class.java,
            VideocallFeedback::class.java,
            WatchSettings::class.java,
            WatchStatus::class.java,
            WatchUser::class.java,
            WatchWearer::class.java,
            Wearer::class.java,
        )

        var registeredCount = 0
        for (clazz in classesToRegister) {
            try {
                Timber.d("MomoApplication: Registering subclass: ${clazz.simpleName}")
                ParseObject.registerSubclass(clazz)
                registeredCount++
            } catch (e: IllegalArgumentException) {
                Timber.e(e, "MomoApplication: Failed to register subclass: ${clazz.simpleName}")
            }
        }
    }

    private fun initializeMaps() {
        Timber.d("MomoApplication: Initializing Maps")
        // MapsInitializer.initialize is a blocking binder call into Play services that loads the
        // Maps dynamite module; on the main thread it ANRs when GMS is slow (background process
        // starts especially). It is safe off the main thread and map screens self-initialize the
        // SDK on demand anyway, so pre-warm in the background. See Crashlytics issues
        // 8726158f9471302f90fe5778f1fa96e4 / 252e24a6dbae40949c20aae28eab0502.
        thread(name = "maps-init") {
            try {
                MapsInitializer.initialize(applicationContext, MapsInitializer.Renderer.LATEST) {
                    when (it) {
                        MapsInitializer.Renderer.LATEST -> {
                            Timber.d("MomoApplication: Latest version of Maps renderer is used")
                        }
                        MapsInitializer.Renderer.LEGACY -> {
                            Timber.d("MomoApplication: Legacy version of Maps renderer is used")
                        }
                    }
                }
            } catch (e: Exception) {
                Timber.e(e, "MomoApplication: Maps initialization failed")
            }
        }
    }

    private fun initializeNotificationChannels() {
        Timber.d("MomoApplication: Initializing notification channels")
        try {
            notificationChannelCreator.createNotificationChannels(this)
        } catch (e: Exception) {
            Timber.e(e, "MomoApplication: Notification channels initialization failed")
        }
    }

    private fun initializeUserLocationWorker() {
        Timber.d("MomoApplication: Initializing user location worker")
        try {
            userLocationWorkerCreator.createUserLocationWorker(this)
        } catch (e: Exception) {
            Timber.e(e, "MomoApplication: User location worker initialization failed")
        }
    }

    private fun initializeBleProximityScanWorker() {
        Timber.d("MomoApplication: Initializing BLE proximity scan worker")
        try {
            bleProximityScanWorkerCreator.create()
        } catch (e: Exception) {
            Timber.e(e, "MomoApplication: BLE proximity scan worker initialization failed")
        }
    }
}
