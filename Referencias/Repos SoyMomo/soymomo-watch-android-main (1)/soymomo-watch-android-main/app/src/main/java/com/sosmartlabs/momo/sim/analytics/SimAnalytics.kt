package com.sosmartlabs.momo.sim.analytics

import android.os.Bundle
import com.google.firebase.analytics.FirebaseAnalytics
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import java.util.Locale
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SimAnalytics @Inject constructor(
    private val firebaseAnalytics: FirebaseAnalytics,
) {

    data class SimContext(
        val flowId: String,
        val flowType: String,
        val entryPoint: String? = null,
        val screen: String? = null,
        val country: String? = null,
        val watchModel: String? = null,
        val paymentProvider: String? = null,
        val billingPeriod: String? = null,
    )

    fun track(
        eventName: String,
        context: SimContext?,
        params: Map<String, Any?> = emptyMap(),
    ) {
        if (context == null) return

        val safeEventName = eventName.safeAnalyticsKey(MAX_EVENT_NAME_LENGTH)
        val bundle = Bundle()
        val breadcrumbParams = linkedMapOf<String, String>()

        bundle.putSafeParam(Params.FLOW_ID, context.flowId, breadcrumbParams)
        bundle.putSafeParam(Params.FLOW_TYPE, context.flowType, breadcrumbParams)
        bundle.putSafeParam(Params.ENTRY_POINT, context.entryPoint, breadcrumbParams)
        bundle.putSafeParam(Params.SCREEN, context.screen, breadcrumbParams)
        bundle.putSafeParam(Params.COUNTRY, context.country, breadcrumbParams)
        bundle.putSafeParam(Params.WATCH_MODEL, context.watchModel, breadcrumbParams)
        bundle.putSafeParam(Params.PAYMENT_PROVIDER, context.paymentProvider, breadcrumbParams)
        bundle.putSafeParam(Params.BILLING_PERIOD, context.billingPeriod, breadcrumbParams)

        params.forEach { (key, value) ->
            bundle.putSafeParam(key, value, breadcrumbParams)
        }

        firebaseAnalytics.logEvent(safeEventName, bundle)
        CrashlyticsLog.log(buildBreadcrumb(safeEventName, breadcrumbParams))
    }

    fun breadcrumb(
        message: String,
        context: SimContext?,
        params: Map<String, Any?> = emptyMap(),
    ) {
        if (context == null) return

        val breadcrumbParams = linkedMapOf<String, String>()
        breadcrumbParams[Params.FLOW_ID] = context.flowId
        breadcrumbParams[Params.FLOW_TYPE] = context.flowType
        context.entryPoint?.let { breadcrumbParams[Params.ENTRY_POINT] = it.safeAnalyticsValue() }
        context.screen?.let { breadcrumbParams[Params.SCREEN] = it.safeAnalyticsValue() }
        context.country?.let { breadcrumbParams[Params.COUNTRY] = it.safeAnalyticsValue() }
        context.watchModel?.let { breadcrumbParams[Params.WATCH_MODEL] = it.safeAnalyticsValue() }
        context.paymentProvider?.let { breadcrumbParams[Params.PAYMENT_PROVIDER] = it.safeAnalyticsValue() }
        context.billingPeriod?.let { breadcrumbParams[Params.BILLING_PERIOD] = it.safeAnalyticsValue() }
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
        if (params.isEmpty()) return "sim:$message"
        return buildString {
            append("sim:")
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
        const val CENTER_OPENED = "sim_center_opened"
        const val SUBSCRIPTION_LIST_RESULT = "sim_subscription_list_result"
        const val SUBSCRIPTION_SELECTED = "sim_subscription_selected"
        const val MANAGE_ACTION_SELECTED = "sim_manage_action_selected"
        const val PORTAL_RESULT = "sim_portal_result"
        const val PENDING_PAYMENT_RESULT = "sim_pending_payment_result"
        const val RESTORE_STARTED = "sim_restore_started"
        const val SUB_STARTED = "sim_sub_started"
        const val SUB_WEARER_SELECTED = "sim_sub_wearer_selected"
        const val SUB_ICCID_SUBMITTED = "sim_sub_iccid_submitted"
        const val SUB_ICCID_RESULT = "sim_sub_iccid_result"
        const val SUB_PLAN_SELECTED = "sim_sub_plan_selected"
        const val SUB_USER_INFO_RESULT = "sim_sub_user_info_result"
        const val SUB_PAYMENT_PATH_SELECTED = "sim_sub_payment_path_selected"
        const val SUB_PAYMENT_RESULT = "sim_sub_payment_result"
        const val SUB_ACTIVATION_RESULT = "sim_sub_activation_result"
        const val SUB_COMPLETED = "sim_sub_completed"
        const val REQUEST_ELIGIBILITY_RESULT = "sim_request_eligibility_result"
        const val REQUEST_POPUP_SHOWN = "sim_request_popup_shown"
        const val REQUEST_POPUP_RESULT = "sim_request_popup_result"
        const val REQUEST_ORDER_RESULT = "sim_request_order_result"
        const val TRANSFER_STARTED = "sim_transfer_started"
        const val TRANSFER_ICCID_SUBMITTED = "sim_transfer_iccid_submitted"
        const val TRANSFER_ICCID_RESULT = "sim_transfer_iccid_result"
        const val TRANSFER_COMPLETED = "sim_transfer_completed"
    }

    object Params {
        const val FLOW_ID = "flow_id"
        const val FLOW_TYPE = "flow_type"
        const val ENTRY_POINT = "entry_point"
        const val SCREEN = "screen"
        const val COUNTRY = "country"
        const val WATCH_MODEL = "watch_model"
        const val PAYMENT_PROVIDER = "payment_provider"
        const val BILLING_PERIOD = "billing_period"
        const val RESULT = "result"
        const val STATUS = "status"
        const val ERROR_TYPE = "error_type"
        const val INPUT_METHOD = "input_method"
        const val INPUT_LENGTH = "input_length"
        const val PLAN_ID = "plan_id"
        const val CAMPAIGN_ID = "campaign_id"
        const val ACTION = "action"
        const val PAYMENT_PATH = "payment_path"
        const val SUBSCRIPTION_COUNT = "subscription_count"
        const val WEARER_COUNT = "wearer_count"
        const val NO_SUB_WEARER_COUNT = "no_sub_wearer_count"
        const val CARD_COUNT = "card_count"
        const val HAS_PREFILLED_ICCID = "has_prefilled_iccid"
        const val HAS_PREINSERTED_SIM = "has_preinserted_sim"
        const val HAS_PHONE = "has_phone"
        const val HAS_DISCOUNT = "has_discount"
        const val DISCOUNT_PERCENT = "discount_percent"
        const val SOURCE = "source"
        const val HTTP_STATUS_CODE = "http_status_code"
    }

    object FlowType {
        const val MANAGEMENT = "management"
        const val NEW_SUBSCRIPTION = "new_subscription"
        const val REQUEST_SIM = "request_sim"
        const val TRANSFER = "transfer"
    }

    object EntryPoint {
        const val SIM_CENTER = "sim_center"
        const val RESTORE = "restore"
        const val LINK_WATCH = "link_watch"
        const val POPUP = "popup"
    }

    object InputMethod {
        const val MANUAL = "manual"
        const val BARCODE = "barcode"
        const val PREFILLED = "prefilled"
    }

    object PaymentPath {
        const val SKIP = "skip"
        const val STRIPE = "stripe"
        const val APIO = "apio"
        const val APIO_NEW_CARD = "apio_new_card"
        const val APIO_SAVED_CARD = "apio_saved_card"
    }

    object Result {
        const val SUCCESS = "success"
        const val ERROR = "error"
        const val CANCELLED = "cancelled"
        const val SKIPPED = "skipped"
        const val UNAVAILABLE = "unavailable"
        const val NOT_SHOWN = "not_shown"
        const val CLOSED = "closed"
        const val CTA_CLICKED = "cta_clicked"
        const val RETRY_TAPPED = "retry_tapped"
    }

    companion object {
        private const val MAX_EVENT_NAME_LENGTH = 40
        private const val MAX_PARAM_NAME_LENGTH = 40
        private const val MAX_PARAM_VALUE_LENGTH = 100
        private val ANALYTICS_KEY_REGEX = Regex("[^a-z0-9_]")
        private val ANALYTICS_VALUE_REGEX = Regex("[^A-Za-z0-9_.:-]")
    }
}
