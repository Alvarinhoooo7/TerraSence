package com.sosmartlabs.momo.addfirstwatch.analytics

import android.os.Bundle
import com.google.firebase.analytics.FirebaseAnalytics
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import java.util.Locale
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AddWatchAnalytics @Inject constructor(
    private val firebaseAnalytics: FirebaseAnalytics
) {

    data class AddWatchContext(
        val flowId: String,
        val screen: String? = null,
        val country: String? = null,
        val watchModel: String? = null,
        val simPath: String? = null,
    )

    fun track(
        eventName: String,
        context: AddWatchContext?,
        params: Map<String, Any?> = emptyMap(),
    ) {
        if (context == null) return

        val safeEventName = eventName.safeAnalyticsKey(MAX_EVENT_NAME_LENGTH)
        val bundle = Bundle()
        val breadcrumbParams = linkedMapOf<String, String>()

        context.let {
            bundle.putSafeParam(Params.FLOW_ID, it.flowId, breadcrumbParams)
            bundle.putSafeParam(Params.SCREEN, it.screen, breadcrumbParams)
            bundle.putSafeParam(Params.COUNTRY, it.country, breadcrumbParams)
            bundle.putSafeParam(Params.WATCH_MODEL, it.watchModel, breadcrumbParams)
            bundle.putSafeParam(Params.SIM_PATH, it.simPath, breadcrumbParams)
        }

        params.forEach { (key, value) ->
            bundle.putSafeParam(key, value, breadcrumbParams)
        }

        firebaseAnalytics.logEvent(safeEventName, bundle)
        CrashlyticsLog.log(buildBreadcrumb(safeEventName, breadcrumbParams))
    }

    fun breadcrumb(
        message: String,
        context: AddWatchContext?,
        params: Map<String, Any?> = emptyMap(),
    ) {
        if (context == null) return

        val breadcrumbParams = linkedMapOf<String, String>()
        breadcrumbParams[Params.FLOW_ID] = context.flowId
        context.screen?.let { screen -> breadcrumbParams[Params.SCREEN] = screen }
        context.country?.let { country -> breadcrumbParams[Params.COUNTRY] = country }
        context.watchModel?.let { model -> breadcrumbParams[Params.WATCH_MODEL] = model }
        context.simPath?.let { simPath -> breadcrumbParams[Params.SIM_PATH] = simPath }
        params.forEach { (key, value) ->
            if (value != null) {
                breadcrumbParams[key.safeAnalyticsKey(MAX_PARAM_NAME_LENGTH)] = value.safeAnalyticsValue()
            }
        }
        CrashlyticsLog.log(buildBreadcrumb(message.safeAnalyticsValue(), breadcrumbParams))
    }

    private fun Bundle.putSafeParam(
        key: String,
        value: Any?,
        breadcrumbParams: MutableMap<String, String>,
    ) {
        if (value == null) return
        val safeKey = key.safeAnalyticsKey(MAX_PARAM_NAME_LENGTH)
        when (value) {
            is Boolean -> {
                val safeValue = value.toString()
                putString(safeKey, safeValue)
                breadcrumbParams[safeKey] = safeValue
            }
            is Int -> {
                putLong(safeKey, value.toLong())
                breadcrumbParams[safeKey] = value.toString()
            }
            is Long -> {
                putLong(safeKey, value)
                breadcrumbParams[safeKey] = value.toString()
            }
            is Float -> {
                putDouble(safeKey, value.toDouble())
                breadcrumbParams[safeKey] = value.toString()
            }
            is Double -> {
                putDouble(safeKey, value)
                breadcrumbParams[safeKey] = value.toString()
            }
            else -> {
                val safeValue = value.safeAnalyticsValue()
                putString(safeKey, safeValue)
                breadcrumbParams[safeKey] = safeValue
            }
        }
    }

    private fun buildBreadcrumb(message: String, params: Map<String, String>): String {
        if (params.isEmpty()) return "add_watch:$message"
        return buildString {
            append("add_watch:")
            append(message)
            params.forEach { (key, value) ->
                append(' ')
                append(key)
                append('=')
                append(value)
            }
        }
    }

    private fun String.safeAnalyticsKey(maxLength: Int): String {
        val normalized = lowercase(Locale.US).replace(ANALYTICS_KEY_REGEX, "_")
        val letterPrefixed = when {
            normalized.isBlank() -> "unknown"
            normalized.first().isLetter() -> normalized
            else -> "a_$normalized"
        }
        return letterPrefixed.take(maxLength).ifBlank { "unknown" }
    }

    private fun Any.safeAnalyticsValue(): String =
        toString()
            .replace(ANALYTICS_VALUE_REGEX, "_")
            .take(MAX_PARAM_VALUE_LENGTH)
            .ifBlank { "unknown" }

    object Events {
        const val STARTED = "add_watch_started"
        const val IMEI_SUBMITTED = "add_watch_imei_submitted"
        const val IMEI_RESULT = "add_watch_imei_result"
        const val LINK_RESULT = "add_watch_link_result"
        const val BLUETOOTH_SYNC_STARTED = "add_watch_bluetooth_sync_started"
        const val BLUETOOTH_SYNC_RESULT = "add_watch_bluetooth_sync_result"
        const val FIRST_CONTACT_RESULT = "add_watch_first_contact_result"
        const val SIM_CHOICE_SELECTED = "add_watch_sim_choice_selected"
        const val SIM_LOOKUP_RESULT = "add_watch_sim_lookup_result"
        const val PLAN_SELECTED = "add_watch_plan_selected"
        const val SUBSCRIPTION_RESULT = "add_watch_subscription_result"
        const val FIRST_INTERACTION_DETECTED = "add_watch_first_interaction_detected"
        const val KID_PROFILE_RESULT = "add_watch_kid_profile_result"
        const val CONTACT_PROMPT_SHOWN = "add_watch_contact_prompt_shown"
        const val CONTACT_PROMPT_RESULT = "add_watch_contact_prompt_result"
        const val COMPLETED = "add_watch_completed"
    }

    object Params {
        const val FLOW_ID = "flow_id"
        const val SCREEN = "screen"
        const val COUNTRY = "country"
        const val WATCH_MODEL = "watch_model"
        const val SIM_PATH = "sim_path"
        const val RESULT = "result"
        const val STATUS = "status"
        const val ERROR_TYPE = "error_type"
        const val INPUT_METHOD = "input_method"
        const val INPUT_LENGTH = "input_length"
        const val CHOICE = "choice"
        const val HAS_PHOTO = "has_photo"
        const val USED_DEFAULT_PHOTO = "used_default_photo"
        const val HAS_PHONE = "has_phone"
        const val HAS_BIRTHDAY = "has_birthday"
        const val PHONE_SOURCE = "phone_source"
        const val NOT_SHOWN_REASON = "not_shown_reason"
        const val BILLING_PERIOD = "billing_period"
        const val PAYMENT_PROVIDER = "payment_provider"
        const val PLAN_ID = "plan_id"
        const val HAS_PREINSERTED_SIM = "has_preinserted_sim"
        const val HAS_EXTRA_ACTIVATION_STEPS = "has_extra_activation_steps"
    }

    object Result {
        const val SUCCESS = "success"
        const val ERROR = "error"
        const val CANCELLED = "cancelled"
        const val SKIPPED = "skipped"
        const val UNAVAILABLE = "unavailable"
        const val SAVE_TAPPED = "save_tapped"
        const val SKIP_TAPPED = "skip_tapped"
        const val DIALOG_CANCELLED = "dialog_cancelled"
        const val RETURNED = "returned"
        const val NO_HANDLER = "no_handler"
        const val NOT_SHOWN = "not_shown"
    }

    companion object {
        private const val MAX_EVENT_NAME_LENGTH = 40
        private const val MAX_PARAM_NAME_LENGTH = 40
        private const val MAX_PARAM_VALUE_LENGTH = 100
        private val ANALYTICS_KEY_REGEX = Regex("[^a-z0-9_]")
        private val ANALYTICS_VALUE_REGEX = Regex("[^A-Za-z0-9_.:-]")
    }
}
