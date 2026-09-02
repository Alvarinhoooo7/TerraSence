package com.sosmartlabs.momo.videocall.soymomowebrtc

import android.app.Activity
import com.google.gson.Gson
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.videocall.soymomowebrtc.interfaces.SignalingClientListener
import io.socket.client.IO
import io.socket.client.Socket
import kotlinx.coroutines.*
import org.webrtc.IceCandidate
import org.webrtc.SessionDescription
import timber.log.Timber
import kotlin.coroutines.CoroutineContext

@ExperimentalCoroutinesApi
class SignalingClient(
    private val activity: Activity,
    private val roomId: String,
    private val listener: SignalingClientListener
) : CoroutineScope {

    private val job = Job()
    override val coroutineContext: CoroutineContext = Dispatchers.IO + job
    private val gson by lazy { Gson() }
    private var socket: Socket = IO.socket("http://videocalls.nosoymomo.com:8080")

    init {
        Timber.d("SignalingClient: Initializing SignalingClient with roomId=$roomId")
        CrashlyticsLog.log("SignalingClient: Initializing SignalingClient with roomId=$roomId")
        connect()
    }

    private fun connect() = launch {
        Timber.d("SignalingClient: Starting socket connection setup")
        CrashlyticsLog.log("SignalingClient: Starting socket connection setup")
        try {
            socket.apply {
                on(Socket.EVENT_CONNECT) {
                    Timber.d("SignalingClient: Socket EVENT_CONNECT triggered")
                    CrashlyticsLog.log("SignalingClient: Socket EVENT_CONNECT triggered")
                    try {
                        Timber.d("SignalingClient: Emitting joinRoom for roomId=$roomId")
                        CrashlyticsLog.log("SignalingClient: Emitting joinRoom for roomId=$roomId")
                        emit("joinRoom", roomId)
                        activity.runOnUiThread {
                            Timber.d("SignalingClient: Notifying listener onConnectionEstablished")
                            CrashlyticsLog.log("SignalingClient: Notifying listener onConnectionEstablished")
                            listener.onConnectionEstablished()
                        }
                    } catch (e: Exception) {
                        Timber.e(e, "SignalingClient: Error during EVENT_CONNECT handling")
                        CrashlyticsLog.recordNonFatalError(e, "SignalingClient: Error during EVENT_CONNECT handling")
                    }
                }
                on(Socket.EVENT_DISCONNECT) {
                    Timber.w("SignalingClient: Socket EVENT_DISCONNECT triggered")
                    CrashlyticsLog.log("SignalingClient: Socket EVENT_DISCONNECT triggered")
                }
                on(Socket.EVENT_CONNECT_ERROR) { data ->
                    Timber.e("SignalingClient: Socket EVENT_CONNECT_ERROR triggered with data: $data")
                    CrashlyticsLog.log("SignalingClient: Socket EVENT_CONNECT_ERROR triggered with data: $data")
                }
                on("offer") { data ->
                    Timber.d("SignalingClient: Received 'offer' event from server")
                    CrashlyticsLog.log("SignalingClient: Received 'offer' event from server")
                    if (data.isNotEmpty()) {
                        try {
                            val offer = gson.fromJson(data[0] as String, SessionDescription::class.java)
                            Timber.d("SignalingClient: Offer parsed successfully: $offer")
                            CrashlyticsLog.log("SignalingClient: Offer parsed successfully")
                            activity.runOnUiThread {
                                Timber.d("SignalingClient: Notifying listener onOfferReceived")
                                CrashlyticsLog.log("SignalingClient: Notifying listener onOfferReceived")
                                listener.onOfferReceived(offer)
                            }
                        } catch (e: Exception) {
                            Timber.e(e, "SignalingClient: Error parsing offer")
                            CrashlyticsLog.recordNonFatalError(e, "SignalingClient: Error parsing offer")
                        }
                    } else {
                        Timber.e("SignalingClient: Offer data is empty")
                        CrashlyticsLog.log("SignalingClient: Offer data is empty")
                    }
                }
                on("answer") { data ->
                    Timber.d("SignalingClient: Received 'answer' event from server")
                    CrashlyticsLog.log("SignalingClient: Received 'answer' event from server")
                    if (data.isNotEmpty()) {
                        try {
                            val answer = gson.fromJson(data[0] as String, SessionDescription::class.java)
                            Timber.d("SignalingClient: Answer parsed successfully: $answer")
                            CrashlyticsLog.log("SignalingClient: Answer parsed successfully")
                            activity.runOnUiThread {
                                Timber.d("SignalingClient: Notifying listener onAnswerReceived")
                                CrashlyticsLog.log("SignalingClient: Notifying listener onAnswerReceived")
                                listener.onAnswerReceived(answer)
                            }
                        } catch (e: Exception) {
                            Timber.e(e, "SignalingClient: Error parsing answer")
                            CrashlyticsLog.recordNonFatalError(e, "SignalingClient: Error parsing answer")
                        }
                    } else {
                        Timber.e("SignalingClient: Answer data is empty")
                        CrashlyticsLog.log("SignalingClient: Answer data is empty")
                    }
                }
                on("candidate") { data ->
                    Timber.d("SignalingClient: Received 'candidate' event from server")
                    CrashlyticsLog.log("SignalingClient: Received 'candidate' event from server")
                    if (data.isNotEmpty()) {
                        try {
                            val candidate = gson.fromJson(data[0] as String, IceCandidate::class.java)
                            Timber.d("SignalingClient: Candidate parsed successfully: $candidate")
                            CrashlyticsLog.log("SignalingClient: Candidate parsed successfully")
                            activity.runOnUiThread {
                                Timber.d("SignalingClient: Notifying listener onIceCandidateReceived")
                                CrashlyticsLog.log("SignalingClient: Notifying listener onIceCandidateReceived")
                                listener.onIceCandidateReceived(candidate)
                            }
                        } catch (e: Exception) {
                            Timber.e(e, "SignalingClient: Error parsing candidate")
                            CrashlyticsLog.recordNonFatalError(e, "SignalingClient: Error parsing candidate")
                        }
                    } else {
                        Timber.e("SignalingClient: Candidate data is empty")
                        CrashlyticsLog.log("SignalingClient: Candidate data is empty")
                    }
                }
                on("onPeerJoined") {
                    Timber.i("SignalingClient: 'onPeerJoined' event received - a peer has joined the room")
                    CrashlyticsLog.log("SignalingClient: 'onPeerJoined' event received - a peer has joined the room")
                    activity.runOnUiThread {
                        Timber.d("SignalingClient: Notifying listener onPeerJoined")
                        CrashlyticsLog.log("SignalingClient: Notifying listener onPeerJoined")
                        listener.onPeerJoined()
                    }
                }
                on("endCall") { data ->
                    val reason = data.getOrNull(0) as? String
                    Timber.d("SignalingClient: 'endCall' event received. Reason: ${reason ?: "No reason provided"}")
                    CrashlyticsLog.log("SignalingClient: 'endCall' event received. Reason: ${reason ?: "No reason provided"}")
                    activity.runOnUiThread {
                        Timber.d("SignalingClient: Notifying listener onEndCall")
                        CrashlyticsLog.log("SignalingClient: Notifying listener onEndCall")
                        listener.onEndCall(reason)
                    }
                }
                Timber.d("SignalingClient: Connecting socket now")
                CrashlyticsLog.log("SignalingClient: Connecting socket now")
                connect()
            }
        } catch (e: Exception) {
            Timber.e(e, "SignalingClient: Exception during socket connection setup")
            CrashlyticsLog.recordNonFatalError(e, "SignalingClient: Exception during socket connection setup")
        }
    }

    fun send(type: String, dataObject: Any?) {
        launch {
            try {
                if (dataObject != null) {
                    Timber.d("SignalingClient: Sending data of type '$type' to the server with payload: $dataObject")
                    CrashlyticsLog.log("SignalingClient: Sending data of type '$type' to the server")
                    socket.emit(type, gson.toJson(dataObject), roomId)
                } else {
                    Timber.d("SignalingClient: Sending message of type '$type' with no additional data to the server")
                    CrashlyticsLog.log("SignalingClient: Sending message of type '$type' with no additional data to the server")
                    socket.emit(type, roomId)
                }
            } catch (e: Exception) {
                Timber.e(e, "SignalingClient: Error sending message of type '$type'")
                CrashlyticsLog.recordNonFatalError(e, "SignalingClient: Error sending message of type '$type'")
            }
        }
    }

    fun destroy() {
        Timber.d("SignalingClient: destroy() called - releasing resources and disconnecting socket")
        CrashlyticsLog.log("SignalingClient: destroy() called - releasing resources and disconnecting socket")
        try {
            job.cancel()
            Timber.d("SignalingClient: Coroutine job cancelled")
            CrashlyticsLog.log("SignalingClient: Coroutine job cancelled")
        } catch (e: Exception) {
            Timber.e(e, "SignalingClient: Error cancelling coroutine job")
            CrashlyticsLog.recordNonFatalError(e, "SignalingClient: Error cancelling coroutine job")
        }
        try {
            Timber.d("SignalingClient: Disconnecting socket")
            CrashlyticsLog.log("SignalingClient: Disconnecting socket")
            socket.disconnect()
        } catch (e: Exception) {
            Timber.e(e, "SignalingClient: Error disconnecting socket")
            CrashlyticsLog.recordNonFatalError(e, "SignalingClient: Error disconnecting socket")
        }
        try {
            Timber.d("SignalingClient: Closing socket connection")
            CrashlyticsLog.log("SignalingClient: Closing socket connection")
            socket.close()
        } catch (e: Exception) {
            Timber.e(e, "SignalingClient: Error closing socket connection")
            CrashlyticsLog.recordNonFatalError(e, "SignalingClient: Error closing socket connection")
        }
    }
}
