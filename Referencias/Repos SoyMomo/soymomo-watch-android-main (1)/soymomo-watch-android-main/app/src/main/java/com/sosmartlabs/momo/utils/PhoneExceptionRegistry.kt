package com.sosmartlabs.momo.utils

/**
 * Single source of truth for IoT/M2M MSISDN exceptions.
 *
 * SoyMomo's IoT SIM suppliers (Spain: EasyM2M; Sweden: our M2M provider) issue SIMs with
 * non-standard, longer MSISDNs (13 national digits) that Google's libphonenumber rejects. This
 * registry recognises those ranges so they parse, pre-fill and validate correctly.
 *
 * Adding support for a future country is a ONE-LINE change: add a [Rule] to [rules]. Nothing else
 * needs to change — validation ([PhoneNumberUtils.isValidPhoneNumber]), country resolution
 * ([PhoneNumberUtils.getCountryForPhone]), watch-number pre-fill and the payment-success info
 * dialog all read from here.
 */
object PhoneExceptionRegistry {

    /**
     * @param isoCountryCode     ISO-3166 alpha-2 code, e.g. "ES".
     * @param countryCallingCode E.164 country calling code without '+', e.g. "34".
     * @param regex              Anchored full-match regex for the international MSISDN; the national
     *                           number must be capture group 1.
     */
    data class Rule(
        val isoCountryCode: String,
        val countryCallingCode: String,
        val regex: Regex,
    )

    /** IoT/M2M ranges we accept. Extend this list to add a country — no other code changes needed. */
    private val rules: List<Rule> = listOf(
        // Spain (EasyM2M): +34 59XXXXXXXXXXX  (national prefix 59, 13 national digits)
        Rule("ES", "34", Regex("""^\+34(59\d{11})$""")),
        // Sweden (M2M provider): +46 71XXXXXXXXXXX  (national prefix 71, 13 national digits)
        Rule("SE", "46", Regex("""^\+46(71\d{11})$""")),
    )

    /** ISO alpha-2 codes covered by the registry — e.g. for gating country-specific UI. */
    val supportedCountries: Set<String>
        get() = rules.map { it.isoCountryCode }.toSet()

    /** Returns the [Rule] matching [phone], or null if it is not a known IoT/M2M number. */
    fun match(phone: String?): Rule? {
        val normalized = normalize(phone) ?: return null
        return rules.firstOrNull { it.regex.matches(normalized) }
    }

    /** True when [phone] is a recognised IoT/M2M exception number. */
    fun isException(phone: String?): Boolean = match(phone) != null

    /** ISO alpha-2 country code for [phone] if it is a known exception, else null. */
    fun isoCountryCode(phone: String?): String? = match(phone)?.isoCountryCode

    /**
     * National (local) part of a matched IoT/M2M number, e.g. "5901008996646" for a Spanish MSISDN.
     * Returns null if [phone] is not a known exception. Use this to pre-fill a carrier-number field
     * when libphonenumber would otherwise reject the number.
     */
    fun nationalNumber(phone: String?): String? {
        val normalized = normalize(phone) ?: return null
        val rule = rules.firstOrNull { it.regex.matches(normalized) } ?: return null
        return rule.regex.find(normalized)?.groupValues?.getOrNull(1)
    }

    /**
     * Normalises [phone] for matching: trims whitespace/separators and ensures a single leading '+'.
     * Returns null when blank or when any non-digit character remains after the '+'.
     */
    private fun normalize(phone: String?): String? {
        if (phone.isNullOrBlank()) return null
        val stripped = phone.trim().replace("[\\s\\-\\u00A0]".toRegex(), "")
        val withPlus = if (stripped.startsWith("+")) stripped else "+$stripped"
        if (withPlus.length < 2 || withPlus.drop(1).any { !it.isDigit() }) return null
        return withPlus
    }
}
