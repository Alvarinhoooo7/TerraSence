package com.sosmartlabs.momo.utils.validation.chile

/**
 * Live input formatter for Chilean RUT entry. Keeps the verification dash
 * immediately before the last character as the user types, stripping any
 * invalid characters. Unlike [RUTValidation.formatRut] this works on partial
 * input and does not require the RUT to validate.
 */
object RutInputFormatter {

    fun format(input: String): String {
        val cleaned = input
            .uppercase()
            .filter { it.isDigit() || it == 'K' }

        if (cleaned.length < 2) return cleaned

        return "${cleaned.dropLast(1)}-${cleaned.last()}"
    }
}
