package com.sosmartlabs.momo.videocall.receivers

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import timber.log.Timber
import java.io.IOException

class NotifyEndVideocallReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context?, intent: Intent?) {
        Timber.d("NotifyEndVideocallReceiver: onReceive called")
        CrashlyticsLog.log("NotifyEndVideocallReceiver: Received end call broadcast")
        if (intent == null) {
            Timber.e("NotifyEndVideocallReceiver: Received null intent in onReceive")
            CrashlyticsLog.log("NotifyEndVideocallReceiver: Received null intent in onReceive")
            return
        }
        val extras = intent.extras
        if (extras == null) {
            Timber.e("NotifyEndVideocallReceiver: No extras found in intent")
            CrashlyticsLog.log("NotifyEndVideocallReceiver: No extras found in intent")
            return
        }
        val roomId = extras.getString("typeId")
        if (roomId.isNullOrEmpty()) {
            Timber.e("NotifyEndVideocallReceiver: typeId (roomId) is null or empty in intent extras")
            CrashlyticsLog.log("NotifyEndVideocallReceiver: typeId (roomId) is null or empty in intent extras")
            return
        }
        Timber.d("NotifyEndVideocallReceiver: typeId (roomId) extracted: $roomId")
        notifyEndCallRoom(roomId)
    }

    private fun notifyEndCallRoom(roomId: String) {
        Timber.d("NotifyEndVideocallReceiver: notifyEndCallRoom called with roomId: $roomId")
        CrashlyticsLog.log("NotifyEndVideocallReceiver: Notifying end of call for roomId: $roomId")
        val jsonMediaType = "application/json; charset=utf-8".toMediaTypeOrNull()
        val client = OkHttpClient()
        val params: Map<String, String> = hashMapOf("roomId" to roomId, "reason" to "hangup")
        val parameter = JSONObject(params)
        val postBody = parameter.toString().toRequestBody(jsonMediaType)
        val request = Request.Builder()
            .url("http://videocalls.nosoymomo.com:8080/hangup")
            .addHeader("content-type", "application/json; charset=utf-8")
            .post(postBody)
            .build()
        Timber.d("NotifyEndVideocallReceiver: Sending POST request to /hangup endpoint with body: $parameter")
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                Timber.e(e, "NotifyEndVideocallReceiver: Failed to notify end of videocall for roomId: $roomId")
                CrashlyticsLog.recordNonFatalError(e, "NotifyEndVideocallReceiver: Error ending videocall for roomId: $roomId")
            }

            override fun onResponse(call: Call, response: Response) {
                if (response.isSuccessful) {
                    Timber.d("NotifyEndVideocallReceiver: Successfully notified end of videocall for roomId: $roomId. Response: $response")
                    CrashlyticsLog.log("NotifyEndVideocallReceiver: Successfully notified end of videocall for roomId: $roomId")
                } else {
                    Timber.e("NotifyEndVideocallReceiver: Server responded with error for roomId: $roomId. Code: ${response.code}, Message: ${response.message}")
                    CrashlyticsLog.log("NotifyEndVideocallReceiver: Server responded with error for roomId: $roomId. Code: ${response.code}, Message: ${response.message}")
                }
                response.body?.close()
            }
        })
    }
}