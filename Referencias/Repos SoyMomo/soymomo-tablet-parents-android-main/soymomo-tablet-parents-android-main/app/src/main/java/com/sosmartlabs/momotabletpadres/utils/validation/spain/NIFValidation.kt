package com.sosmartlabs.momotabletpadres.utils.validation.spain

class NIFValidation {

    companion object {

        /**
         * Define a regular expression that matches a NIF in the correct format
         */
        private val nifRegex = Regex("^[0-9]{8}[TRWAGMYFPDXBNJZSQVHLCKE]$")

        /**
         * Define a Character array with NIF validation position
         */
        private const val validationChars = "TRWAGMYFPDXBNJZSQVHLCKE"

        /**
         * Define a function that takes a NIF as a String and returns
         * true if it is a valid NIF, and false otherwise
         */
        fun isValidNif(nif: String): Boolean {
            // Check if the NIF is in the correct format using the regular expression
            if (!nifRegex.matches(nif)) {
                return false
            }

            // Convert the NIF to an array of digits
            val digits = nif.substring(0, 8)

            // Get letter value
            val letter = nif.last()

            // Calculate the verifier digit using the formula for a NIF
            val verifier = digits.toInt() % 23

            // Check if the calculated verifier digit matches the one in the NIF
            return letter == validationChars[verifier]
        }

    }

}