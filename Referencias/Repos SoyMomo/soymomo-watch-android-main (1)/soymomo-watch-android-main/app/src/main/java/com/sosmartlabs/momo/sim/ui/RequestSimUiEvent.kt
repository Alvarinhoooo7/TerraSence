package com.sosmartlabs.momo.sim.ui

sealed class RequestSimUiEvent {
    data object ShowRetryDialog : RequestSimUiEvent()
    data object ShowSuccessDialog : RequestSimUiEvent()
}

