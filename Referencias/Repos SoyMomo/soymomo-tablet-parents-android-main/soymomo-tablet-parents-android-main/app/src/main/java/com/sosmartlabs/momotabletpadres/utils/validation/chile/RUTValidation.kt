package com.sosmartlabs.momotabletpadres.utils.validation.chile

import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import com.sosmartlabs.momotabletpadres.utils.model.FORMAT
import com.sosmartlabs.momotabletpadres.utils.model.Rut
import timber.log.Timber

class RUTValidation {

    companion object {

        /**
         * Returns the RUT validated and formatted to 12345678-9
         */
        fun formatRut(input: String): String? {
            return Rut.parse(input)?.let { rut ->
                if (rut.isValid()) {
                    rut.format(FORMAT.ONLY_DASH_UPPERCASE)
                } else {
                    null
                }
            }
        }

        /**
         * Validate rut in the form 12345678-9
         */
        fun validateRut(input: String): Boolean {
            return try {
                CrashlyticsLog.log("validateRut $input")
                val rut = Rut.parse(input)
                rut?.isValid() ?: false
            } catch (e: Exception) {
                Timber.e(e)
                false
            }
        }

    }

}