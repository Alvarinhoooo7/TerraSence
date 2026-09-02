package com.sosmartlabs.momo.testlab

import com.sosmartlabs.momo.addfirstwatch.model.WatchAdminInfo
import com.sosmartlabs.momo.addfirstwatch.model.WatchAvailabilityResult
import com.sosmartlabs.momo.addfirstwatch.model.WatchAvailabilityStatus
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.sim.model.BillingPeriod
import com.sosmartlabs.momo.sim.model.MnoProvider
import com.sosmartlabs.momo.sim.model.PaymentProvider
import com.sosmartlabs.momo.sim.model.Sim
import com.sosmartlabs.momo.sim.model.Subscription
import com.sosmartlabs.momo.sim.model.SubscriptionPlan
import com.sosmartlabs.momo.sim.model.SubscriptionsUserInfo
import timber.log.Timber
import java.util.Date

/**
 * DEBUG-ONLY manual-testing harness ("Test Lab"). The release source set contains a no-op twin
 * with the same API, so none of this exists in release builds.
 *
 * Two tiers:
 *
 * 1. MAGIC VALUES — typing these into the normal UI triggers fully client-side mock flows.
 *    No cloud function is called and nothing is saved to Parse.
 *
 *    IMEIs (type the 10-digit id in the add-watch IMEI field):
 *    - 9900000004 -> SUCCESS_WATCH_BELONGS_TO_OTHER_USER (fake admin card, co-admin request UI)
 *    - 9900000005 -> WATCH_ALREADY_LINKED
 *    - 9900000006 -> WATCH_ALREADY_LINKED_MISSING_PRE_INSERTED_SIM_ACTIVATION
 *    - 9900000007 -> WATCH_NOT_FOUND
 *    (The plain-SUCCESS and pre-inserted happy paths intentionally have NO magic IMEI: they need
 *    a real Wearer that the rest of the app can save against — use dev-server fixture watches.)
 *
 *    ICCIDs (type in the link-SIM field; 19 digits = 89 + calling code + 9999 marker):
 *    - 8934999900000000001 -> Spain SIM (EasyM2M/Stripe) -> IoT msisdn +345900000000001
 *    - 8946999900000000001 -> Sweden SIM (Stripe)        -> IoT msisdn +467100000000001
 *    - 8956999900000000001 -> Chile SIM (Entel/Apio)     -> msisdn +56989000000
 *    - 8934999900000000002 -> SIM already in use
 *    - 8934999900000000003 -> Alai SIM (blocked-operator dialog)
 *    - 8956999900000000002 -> Retired Entel SIM (cannot activate)
 *    Magic SIMs always take the skip-payment route and activation returns a fabricated,
 *    never-saved Subscription, ending on the payment-success screen (incl. the ES/SE IoT
 *    number dialog).
 *
 * 2. SKIP PAYMENT FOR REAL SIMS — long-press the header title on the link-SIM screen to toggle.
 *    Real ICCIDs then route to the skip-payment fragment instead of Stripe/Apio; the cloud
 *    activateSimCard provisions fully without payment (verified: it performs no payment check).
 *    Remember to terminate the free subscription server-side before re-testing the same SIM.
 */
object TestLab {

    const val isAvailable: Boolean = true

    private const val IMEI_BELONGS_TO_OTHER = "9900000004"
    private const val IMEI_ALREADY_LINKED = "9900000005"
    private const val IMEI_ALREADY_LINKED_MISSING_SIM = "9900000006"
    private const val IMEI_NOT_FOUND = "9900000007"

    private const val ICCID_ES = "8934999900000000001"
    private const val ICCID_SE = "8946999900000000001"
    private const val ICCID_CL = "8956999900000000001"
    private const val ICCID_IN_USE = "8934999900000000002"
    private const val ICCID_ALAI = "8934999900000000003"
    private const val ICCID_RETIRED = "8956999900000000002"

    private const val FIXTURE_MARKER = "testLabFixture"

    @Volatile
    private var skipPaymentEnabled = false

    // ---------------------------------------------------------------------------------------------
    // Tier 1 — watch availability matrix
    // ---------------------------------------------------------------------------------------------

    fun mockWatchAvailability(deviceId: String): WatchAvailabilityResult? {
        val result = when (deviceId) {
            IMEI_BELONGS_TO_OTHER -> WatchAvailabilityResult(
                WatchAvailabilityStatus.SUCCESS_WATCH_BELONGS_TO_OTHER_USER,
                WatchAdminInfo(
                    email = "te***@soymomo.com",
                    fullName = "Test Lab Admin",
                    phone = "+56 9 **** **99",
                    imageUrl = null,
                ),
            )
            IMEI_ALREADY_LINKED -> WatchAvailabilityResult(WatchAvailabilityStatus.WATCH_ALREADY_LINKED)
            IMEI_ALREADY_LINKED_MISSING_SIM ->
                WatchAvailabilityResult(WatchAvailabilityStatus.WATCH_ALREADY_LINKED_MISSING_PRE_INSERTED_SIM_ACTIVATION)
            IMEI_NOT_FOUND -> WatchAvailabilityResult(WatchAvailabilityStatus.WATCH_NOT_FOUND)
            else -> null
        }
        if (result != null) {
            Timber.w("TestLab: magic IMEI $deviceId -> ${result.status} (mocked, no cloud call)")
        }
        return result
    }

    /** addWatch result for magic IMEIs that proceed past validation (belongs-to-other -> 0). */
    fun mockAddWatchResult(deviceId: String): Int? = when (deviceId) {
        IMEI_BELONGS_TO_OTHER -> 0 // SUCCESS_PERMISSION_REQUESTED, without pushing the real admin
        else -> null
    }

    // ---------------------------------------------------------------------------------------------
    // Tier 1 — SIM / plans / activation mocks
    // ---------------------------------------------------------------------------------------------

    fun isTestSim(iccId: String?): Boolean =
        iccId in setOf(ICCID_ES, ICCID_SE, ICCID_CL, ICCID_IN_USE, ICCID_ALAI, ICCID_RETIRED)

    fun mockSim(iccId: String): Sim? {
        val sim = when (iccId) {
            ICCID_ES -> fabricateSim(iccId, mno = "EasyM2M", country = "ES", payment = "Stripe")
            ICCID_SE -> fabricateSim(iccId, mno = "Wherever", country = "SE", payment = "Stripe")
            ICCID_CL -> fabricateSim(iccId, mno = "Entel", country = "CL", payment = "Apio")
            ICCID_IN_USE -> fabricateSim(iccId, mno = "EasyM2M", country = "ES", payment = "Stripe")
            ICCID_ALAI -> fabricateSim(iccId, mno = "Alai", country = "CL", payment = "Apio")
            ICCID_RETIRED -> fabricateSim(iccId, mno = "Entel", country = "CL", payment = "Apio", retired = true)
            else -> return null
        }
        Timber.w("TestLab: magic ICCID $iccId -> fabricated ${sim.mnoProvider.country} SIM (mocked)")
        return sim
    }

    fun mockIsSimInUse(sim: Sim): Boolean? = when {
        !isFixture(sim) -> null
        else -> sim.iccId == ICCID_IN_USE
    }

    /**
     * Fabricated plans for magic SIMs — keyed on the ICCID so it covers both fully fabricated
     * SIMs and the dev-server pre-inserted fixture SIMs (seeded with the same magic ICCIDs).
     */
    fun mockSubscriptionPlans(sim: Sim): List<SubscriptionPlan>? {
        if (!isTestSim(sim.iccId)) return null
        val mnoProvider = sim.mnoProvider
        Timber.w("TestLab: fabricating test plans for ${mnoProvider.country} (mocked, no cloud call)")
        return listOf(
            fabricatePlan(mnoProvider, BillingPeriod.MONTHLY),
            fabricatePlan(mnoProvider, BillingPeriod.YEARLY),
        )
    }

    fun mockActivatedSubscription(
        watch: Wearer?,
        sim: Sim?,
        plan: SubscriptionPlan?,
        subscriber: SubscriptionsUserInfo?,
    ): Subscription? {
        if (sim == null || !isTestSim(sim.iccId)) return null
        val msisdn = when (sim.iccId) {
            ICCID_ES -> "+345900000000001" // matches PhoneExceptionRegistry ES IoT range
            ICCID_SE -> "+467100000000001" // matches PhoneExceptionRegistry SE IoT range
            else -> "+56989000000"
        }
        Timber.w("TestLab: fabricating ACTIVATED subscription msisdn=$msisdn (mocked, never saved)")
        return Subscription().apply {
            put(FIXTURE_MARKER, true)
            status = "ACTIVATED"
            isActive = true
            startDate = Date()
            this.msisdn = msisdn
            iccId = sim.iccId
            this.sim = sim
            plan?.let { this.plan = it }
            watch?.let { this.watch = it }
            subscriber?.let { this.subscriber = it }
            sim.paymentProvider?.let { paymentProvider = it }
        }
    }

    // ---------------------------------------------------------------------------------------------
    // Tier 2 — skip payment for real SIMs
    // ---------------------------------------------------------------------------------------------

    /** Magic SIMs always skip (they cannot pay); real SIMs skip when the toggle is on. */
    fun shouldSkipPayment(iccId: String?): Boolean = isTestSim(iccId) || skipPaymentEnabled

    /** Flips the skip-payment toggle and returns the new state. */
    fun toggleSkipPayment(): Boolean {
        skipPaymentEnabled = !skipPaymentEnabled
        Timber.w("TestLab: skip-payment toggled -> $skipPaymentEnabled")
        return skipPaymentEnabled
    }

    // ---------------------------------------------------------------------------------------------
    // Fabrication helpers — objects are local-only: no objectId, never saved.
    // ---------------------------------------------------------------------------------------------

    private fun isFixture(obj: com.parse.ParseObject): Boolean =
        obj.has(FIXTURE_MARKER) && obj.getBoolean(FIXTURE_MARKER)

    private fun fabricateSim(
        iccId: String,
        mno: String,
        country: String,
        payment: String,
        retired: Boolean = false,
    ): Sim =
        Sim().apply {
            put(FIXTURE_MARKER, true)
            this.iccId = iccId
            isPreInsertedInWatch = false
            isRetired = retired
            mnoProvider = MnoProvider().apply {
                put(FIXTURE_MARKER, true)
                name = mno
                this.country = country
            }
            paymentProvider = PaymentProvider().apply {
                put(FIXTURE_MARKER, true)
                name = payment
                this.country = country
            }
        }

    private fun fabricatePlan(mno: MnoProvider, period: BillingPeriod): SubscriptionPlan =
        SubscriptionPlan().apply {
            put(FIXTURE_MARKER, true)
            title = "Test Lab ${period.name.lowercase().replaceFirstChar { it.uppercase() }}"
            planDescription = "Fabricated ${mno.country} plan — Test Lab, not billable"
            price = if (period == BillingPeriod.MONTHLY) 1.0f else 10.0f
            currency = if (mno.country == "CL") "$" else "€"
            currencyCode = when (mno.country) {
                "CL" -> "CLP"
                "SE" -> "SEK"
                else -> "EUR"
            }
            data = "5 GB"
            calls = "100 min"
            sms = "100 SMS"
            backgroundImageColors = "#673AB7,#603BB0" // required non-null by GradientBackground
            warranty = ""
            billingPeriod = period.key
            billingPeriodType = period.key
            planNameId = "testlab_${mno.country?.lowercase()}_${period.key}"
            isActive = true
            isQA = true
            trialDays = 0
            mnoProvider = mno
            paymentProvider = PaymentProvider().apply {
                put(FIXTURE_MARKER, true)
                name = if (mno.country == "CL") "Apio" else "Stripe"
                country = mno.country
            }
        }
}
