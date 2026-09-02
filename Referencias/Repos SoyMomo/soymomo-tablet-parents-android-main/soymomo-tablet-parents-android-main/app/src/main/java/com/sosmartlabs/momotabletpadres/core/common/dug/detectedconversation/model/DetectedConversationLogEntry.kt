package com.sosmartlabs.momotabletpadres.core.common.dug.detectedconversation.model

import com.google.gson.Gson
import com.google.gson.GsonBuilder
import com.google.gson.JsonDeserializationContext
import com.google.gson.JsonDeserializer
import com.google.gson.JsonElement
import com.google.gson.JsonSyntaxException
import com.google.gson.annotations.SerializedName
import timber.log.Timber
import java.lang.reflect.Type
import java.text.ParseException
import java.text.SimpleDateFormat
import java.util.*


/**
 * Represents a log entry for a [DetectedConversation]
 */
 data class DetectedConversationLogEntry(
    @SerializedName("date")
    val date: Date,
    @SerializedName("author")
    val author: String?,
    @SerializedName("message")
    val message: String,
    @SerializedName("profanityScore")
    val profanityScore: Double,
    @SerializedName("groomingScore")
    val groomingScore: Double,
    @SerializedName("moodScore")
    val moodScore: Double,
    @SerializedName("conversationDetectedId")
    var conversationDetectedId: Int?,
    @SerializedName("detectionInfo")
    val detectionInfo:String?) {

    override fun toString(): String {
        return "$date $author $message $profanityScore $groomingScore " +
                "$moodScore $conversationDetectedId $detectionInfo"
    }

    private class DateDeserializer : JsonDeserializer<Date> {
        val rawGson = Gson()
        val fmt = SimpleDateFormat("MMM dd, yyyy HH:mm:ss", Locale.getDefault())
        override fun deserialize(json: JsonElement, typeOfT: Type, context: JsonDeserializationContext): Date? {
            // Try parsing with the default Gson deserialization
            try {
                return rawGson.fromJson(json, Date::class.java)
            } catch (e: JsonSyntaxException) {
                // Log or handle the exception if needed
            }

            val timeString = json.asString
            println("Standard date deserialization didn't work: $timeString")

            // Try parsing with the specified date format
            try {
                return fmt.parse(timeString)
            } catch (e: ParseException) {
                // Log or handle the exception if needed
            }

            println("Parsing as JSON 24 format didn't work: $timeString")

            // Finally, attempt to parse as a timestamp (milliseconds)
            return Date(json.asLong)
        }
    }

    companion object {
        /**
         * Parse a [DetectedConversationLogEntry] list from a json encoded string
         * @param jsonString String with a list of detected conversations formatted as Json
         * @return List of [DetectedConversationLogEntry].
         */
        fun fromJsonArray(jsonString: String): List<DetectedConversationLogEntry> {
            Timber.d("Attempting to parse JSON string: $jsonString")
            return try {
                val gson = GsonBuilder().registerTypeAdapter(Date::class.java, DateDeserializer()).create()
                val logEntries = gson.fromJson(jsonString, Array<DetectedConversationLogEntry>::class.java).asList()
                Timber.d("Successfully parsed log entries: $logEntries")
                logEntries
            } catch (e: Exception) {
                Timber.e(e, "Error parsing JSON string into DetectedConversationLogEntry")
                emptyList() // Return an empty list if parsing fails
            }
        }
    }
}