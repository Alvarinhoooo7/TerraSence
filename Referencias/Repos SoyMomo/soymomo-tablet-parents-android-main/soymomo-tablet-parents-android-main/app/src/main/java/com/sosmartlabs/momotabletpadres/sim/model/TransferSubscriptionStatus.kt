package com.sosmartlabs.momotabletpadres.sim.model


enum class TransferSubscriptionStatus(var error: String? = null, var message: String? = null, var statusCode: Int? = null) {
    DEFAULT,
    TRANSFER_IN_PROGRESS,
    TRANSFER_SUCCESS,
    TRANSFER_ERROR;

    companion object {
        fun transferError(error: String, message: String, statusCode: Int): TransferSubscriptionStatus {
            return TRANSFER_ERROR.apply {
                this.error = error
                this.message = message
                this.statusCode = statusCode
            }
        }
    }
}