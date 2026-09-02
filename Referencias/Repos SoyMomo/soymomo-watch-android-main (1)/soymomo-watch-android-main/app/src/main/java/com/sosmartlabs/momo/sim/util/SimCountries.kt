package com.sosmartlabs.momo.sim.util

/**
 * Single source of truth for the countries where SoyMomo SIM is offered.
 * Previously this list was hardcoded separately in SubscriptionEmptyFragment and
 * ConfigureSimFragment and drifted one country at a time across releases.
 */
object SimCountries {

    val SUPPORTED = listOf("CL", "US", "DE", "ES", "SE")

    fun isSupported(countryCode: String?): Boolean = countryCode in SUPPORTED
}
