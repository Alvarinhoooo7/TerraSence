package com.sosmartlabs.momotabletpadres.sim.model

enum class SimStatus {
    DEFAULT,
    SEARCHING,
    SIM_ACTIVATING,
    SIM_ACTIVATED,
    SIM_ACTIVATING_ERROR,
    SIM_INVALID,
    SIM_AVAILABLE,
    SIM_NOT_FOUND,
    SIM_ALREADY_IN_USE,
    ICC_ID_LENGTH,
    UNKNOWN_ERROR,
    ALAI // Fuck Alai
}