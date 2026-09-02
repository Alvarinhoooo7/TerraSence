package com.sosmartlabs.momo.videocall.repository

import android.content.Context
import com.parse.ParseCloud
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.videocall.model.IceServerData
import dagger.hilt.android.qualifiers.ApplicationContext
import org.webrtc.PeerConnection
import timber.log.Timber
import java.util.TimeZone
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class IceServerRepository @Inject constructor(
    @ApplicationContext val applicationContext: Context
) {

    companion object {
        private const val latamIceUsername = "091B3-4yOD5a0RIQC6lpNdhbpb3rkmR5-VCYS3_95-WlyIpZy7-7f7v7lFmp0SS0AAAAAF_8rvV0aG9tYXNzb3ltb21v"
        private const val latamIcePassword = "02536520-5448-11eb-b610-0242ac120004"
        private const val europeIceUsername = "091B3-4yOD5a0RIQC6lpNdhbpb3rkmR5-VCYS3_95-WlyIpZy7-7f7v7lFmp0SS0AAAAAF_8rvV0aG9tYXNzb3ltb21v"
        private const val europeIcePassword = "02536520-5448-11eb-b610-0242ac120004"
        val defaultIceServerLatam = listOf(
            PeerConnection.IceServer.builder("stun:sp-turn2.xirsys.com").createIceServer(),
            PeerConnection.IceServer.builder("turn:sp-turn2.xirsys.com:80?transport=udp")
                .setUsername(latamIceUsername)
                .setPassword(latamIcePassword).createIceServer(),
            PeerConnection.IceServer.builder("turn:sp-turn2.xirsys.com:3478?transport=udp")
                .setUsername(latamIceUsername)
                .setPassword(latamIcePassword).createIceServer()
        )
        val defaultIceServerEurope = listOf(
            PeerConnection.IceServer.builder("stun:eu-turn6.xirsys.com").createIceServer(),
            PeerConnection.IceServer.builder("turn:eu-turn6.xirsys.com:80?transport=udp")
                .setUsername(europeIceUsername)
                .setPassword(europeIcePassword).createIceServer(),
            PeerConnection.IceServer.builder("turn:eu-turn6.xirsys.com:3478?transport=udp")
                .setUsername(europeIceUsername)
                .setPassword(europeIcePassword).createIceServer()
        )
    }

    fun getIceServers(deviceId: String): List<IceServerData> {
        Timber.d("IceServerRepository: getIceServers called with deviceId=$deviceId")
        CrashlyticsLog.log("IceServerRepository: getIceServers called with deviceId=$deviceId")

        val params = HashMap<String, String?>().apply {
            put("deviceId", deviceId)
        }
        Timber.d("IceServerRepository: Params for cloud function: $params")
        CrashlyticsLog.log("IceServerRepository: Params for cloud function: $params")

        try {
            Timber.d("IceServerRepository: Calling ParseCloud function 'videocallGetIceServers'")
            val result = ParseCloud.callFunction<HashMap<*, *>>("videocallGetIceServers", params)
            Timber.d("IceServerRepository: Cloud function result: $result")
            CrashlyticsLog.log("IceServerRepository: Cloud function result: $result")

            val v = result["v"] as? HashMap<*, *>
            if (v == null) {
                Timber.e("IceServerRepository: 'v' key missing in cloud function result")
                CrashlyticsLog.log("IceServerRepository: 'v' key missing in cloud function result")
                throw IllegalStateException("'v' key missing in cloud function result")
            }

            val iceServers = v["iceServers"] as? HashMap<*, *>
            if (iceServers == null) {
                Timber.e("IceServerRepository: 'iceServers' key missing in 'v'")
                CrashlyticsLog.log("IceServerRepository: 'iceServers' key missing in 'v'")
                throw IllegalStateException("'iceServers' key missing in 'v'")
            }

            val urls = iceServers["urls"] as? List<*>
            val username = iceServers["username"] as? String
            val credential = iceServers["credential"] as? String

            if (urls == null || username == null || credential == null) {
                Timber.e("IceServerRepository: One or more ICE server fields missing: urls=$urls, username=$username, credential=$credential")
                CrashlyticsLog.log("IceServerRepository: One or more ICE server fields missing: urls=$urls, username=$username, credential=$credential")
                throw IllegalStateException("ICE server fields missing")
            }

            Timber.d("IceServerRepository: Building ICE server list from cloud data")
            val iceServersList = urls.mapNotNull { urlElement ->
                val urlStr = urlElement as? String
                if (urlStr == null) {
                    Timber.w("IceServerRepository: Skipping null or non-string ICE server URL: $urlElement")
                    CrashlyticsLog.log("IceServerRepository: Skipping null or non-string ICE server URL: $urlElement")
                    null
                } else {
                    Timber.d("IceServerRepository: Adding ICE server: URL=$urlStr, Username=$username")
                    PeerConnection.IceServer.builder(urlStr)
                        .setUsername(username)
                        .setPassword(credential)
                        .createIceServer()
                }
            }
            Timber.d("IceServerRepository: Successfully built ${iceServersList.size} ICE servers from cloud")
            CrashlyticsLog.log("IceServerRepository: Successfully built ${iceServersList.size} ICE servers from cloud")
            return listOf(IceServerData(iceServersList))
        } catch (e: Exception) {
            Timber.e(e, "IceServerRepository: Failed to get ICE servers from cloud, falling back to default")
            CrashlyticsLog.recordNonFatalError(e, "IceServerRepository: Failed to get ICE servers from cloud, falling back to default")

            // Decide on default ICE server based on time zone
            val timeZone = TimeZone.getDefault().displayName
            Timber.d("IceServerRepository: Device time zone is $timeZone")
            CrashlyticsLog.log("IceServerRepository: Device time zone is $timeZone")

            val defaultIceServers: List<IceServerData>
            if (timeZone.contains("Europe")) {
                Timber.d("IceServerRepository: Using default European ICE server due to exception")
                CrashlyticsLog.log("IceServerRepository: Using default European ICE server due to exception")
                defaultIceServers = listOf(IceServerData(defaultIceServerEurope))
            } else {
                Timber.d("IceServerRepository: Using default LATAM ICE server due to exception")
                CrashlyticsLog.log("IceServerRepository: Using default LATAM ICE server due to exception")
                defaultIceServers = listOf(IceServerData(defaultIceServerLatam))
            }

            return defaultIceServers
        }
    }
}