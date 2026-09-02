package com.sosmartlabs.momotabletpadres.utils.validation

import com.sosmartlabs.momotabletpadres.utils.validation.chile.RUTValidation
import com.sosmartlabs.momotabletpadres.utils.validation.spain.NIFValidation
import java.util.*

class NationalIdValidation {

    companion object {
        fun validatePersonalId(id: String, country: String = Locale.getDefault().country): Boolean {
            return when (country) {
                "CL" -> RUTValidation.validateRut(id)
                "US" -> true
                "ES" -> NIFValidation.isValidNif(id)
                "DE" -> true
                else -> false
            }
        }

        fun formatPersonalId(id: String, country: String = Locale.getDefault().country): String? {
            return when (country) {
                "CL" -> RUTValidation.formatRut(id)
                "US" -> ""
                "ES" -> id
                "DE" -> ""
                else -> ""
            }
        }
    }

}