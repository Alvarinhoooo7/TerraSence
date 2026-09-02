package com.sosmartlabs.momotabletpadres.utils

import com.google.i18n.phonenumbers.PhoneNumberUtil
import com.hbb20.CountryCodePicker
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import timber.log.Timber

class PhoneNumberUtils {

    companion object {

        private val ES_IOT_M2M_REGEX = Regex("""^\+34(59\d{11})$""")

        fun parsePhoneCountryCode(phone: String): String? {
            Timber.d("PhoneNumberUtils: parsePhoneCountryCode: Starting to parse phone number: $phone")
            return try {
                val phoneUtil = PhoneNumberUtil.getInstance()
                Timber.d("PhoneNumberUtils: parsePhoneCountryCode: Created PhoneNumberUtil instance")

                val phoneNumber = phoneUtil.parse(phone, null)
                Timber.d("PhoneNumberUtils: parsePhoneCountryCode: Parsed phone number successfully. Country code: ${phoneNumber.countryCode}, National number: ${phoneNumber.nationalNumber}")

                val nationalNumber = phoneNumber.nationalNumber.toString()
                Timber.d("PhoneNumberUtils: parsePhoneCountryCode: Returning national number: $nationalNumber")
                nationalNumber
            } catch (e: Exception) {
                Timber.e(e, "PhoneNumberUtils: parsePhoneCountryCode: Error parsing phone number: $phone")
                CrashlyticsLog.recordNonFatalError(e, "PhoneNumberUtils: Error parsing parsePhoneCountryCode")
                null
            }
        }

        /**
         * Validates phone number using libphonenumber's isValidNumber
         *
         * @param ccp CountryCodePicker instance to validate
         * @return true if the number is valid, false otherwise
         */
        fun isValidPhoneNumber(ccp: CountryCodePicker): Boolean {
            val fullNumber = ccp.fullNumber
            if (isSpanishIotNumber(fullNumber)) {
                Timber.d("PhoneNumberUtils: isValidPhoneNumber(CCP): Special Spanish IoT number detected and considered valid: $fullNumber")
                return true
            }

            Timber.d("PhoneNumberUtils: isValidPhoneNumber(CCP): Starting validation for CCP phone number")
            return try {
                val selectedCountryNameCode = ccp.selectedCountryNameCode
                if (fullNumber.isBlank()) {
                    Timber.d("PhoneNumberUtils: isValidPhoneNumber(CCP): Phone number is blank, returning false")
                    return false
                }

                val phoneUtil = PhoneNumberUtil.getInstance()
                Timber.d("PhoneNumberUtils: isValidPhoneNumber(CCP): Created PhoneNumberUtil instance")

                val phoneNumber = phoneUtil.parse(fullNumber, selectedCountryNameCode)
                Timber.d("PhoneNumberUtils: isValidPhoneNumber(CCP): Parsed phone number - Country code: ${phoneNumber.countryCode}, National number: ${phoneNumber.nationalNumber}")

                val isValid = phoneUtil.isValidNumber(phoneNumber)
                Timber.d("PhoneNumberUtils: isValidPhoneNumber(CCP): LibPhoneNumber validation result: $isValid")
                isValid
            } catch (e: Exception) {
                Timber.w(e, "PhoneNumberUtils: isValidPhoneNumber(CCP): Error validating phone number with libphonenumber: ${ccp.fullNumber}")
                CrashlyticsLog.recordNonFatalError(e, "Error validating phone number")

                // Fallback: if libphonenumber fails, try CCP's validation
                try {
                    val ccpValidation = ccp.isValidFullNumber
                    Timber.d("PhoneNumberUtils: isValidPhoneNumber(CCP): Fallback to CCP validation result: $ccpValidation")
                    ccpValidation
                } catch (ccpException: Exception) {
                    Timber.w(ccpException, "PhoneNumberUtils: isValidPhoneNumber(CCP): CCP validation also failed, using basic length check")
                    // Last resort: basic length check
                    val cleanedNumber = ccp.fullNumber.replace(Regex("[^\\d+]"), "")
                    val lengthCheck = cleanedNumber.length >= 8
                    Timber.d("PhoneNumberUtils: isValidPhoneNumber(CCP): Basic length check for cleaned number '$cleanedNumber' (length: ${cleanedNumber.length}): $lengthCheck")
                    lengthCheck
                }
            }
        }

        /**
         * Validates phone number using libphonenumber's isValidNumber.
         *
         * @param phoneNumber Full phone number string to validate (including country code)
         * @param countryCode Country code in format like "CL", "US", etc.
         * @return true if the number is valid, false otherwise
         */
        fun isValidPhoneNumber(phoneNumber: String, countryCode: String): Boolean {
            if (isSpanishIotNumber(phoneNumber)) {
                Timber.d("PhoneNumberUtils: isValidPhoneNumber(String): Special Spanish IoT number detected and considered valid: $phoneNumber")
                return true
            }
            Timber.d("PhoneNumberUtils: isValidPhoneNumber(String): Starting validation for phone number: $phoneNumber with country code: $countryCode")
            return try {
                if (phoneNumber.isBlank()) {
                    Timber.d("PhoneNumberUtils: isValidPhoneNumber(String): Phone number is blank, returning false")
                    return false
                }

                val phoneUtil = PhoneNumberUtil.getInstance()
                Timber.d("PhoneNumberUtils: isValidPhoneNumber(String): Created PhoneNumberUtil instance")

                val parsedNumber = phoneUtil.parse(phoneNumber, countryCode)
                Timber.d("PhoneNumberUtils: isValidPhoneNumber(String): Parsed phone number - Country code: ${parsedNumber.countryCode}, National number: ${parsedNumber.nationalNumber}")

                val isValid = phoneUtil.isValidNumber(parsedNumber)
                Timber.d("PhoneNumberUtils: isValidPhoneNumber(String): LibPhoneNumber validation result: $isValid")
                isValid
            } catch (e: Exception) {
                Timber.w(e, "PhoneNumberUtils: isValidPhoneNumber(String): Error validating phone number: $phoneNumber")
                CrashlyticsLog.recordNonFatalError(e, "Error validating phone number")
                Timber.d("PhoneNumberUtils: isValidPhoneNumber(String): Returning false due to exception")
                false
            }
        }

        /**
         * Checks if a phone number is a Spanish M2M/IoT MSISDN.
         *
         * Background:
         * Our Spanish SIM supplier (EasyM2M) provides IoT SIMs with non-standard phone numbers
         * that follow the M2M/IoT numbering format (e.g., +345901008996646). Standard phone number
         * validation libraries like libphonenumber don't recognize these as valid, causing app failures.
         * This method provides special handling for these legitimate IoT numbers.
         *
         * Rules (Spain):
         * - E.164: up to 15 digits total (excluding the leading '+').
         * - Spain country code: +34.
         * - M2M range: starts with national prefix '59' and has 13 national digits total.
         *   => Full international form: +34 59XXXXXXXXXXX  (2 + 13 = 15 digits; 16 chars incl. '+').
         *
         * Notes:
         * - This validates FORMAT ONLY (not assignment/activation).
         * - Handles input with or without '+' prefix.
         *
         * @see https://www.cnmc.es/sites/default/files/3092737.pdf Spanish numbering plan reference
         */
        private fun isSpanishIotNumber(phoneNumber: String): Boolean {
            Timber.d("PhoneNumberUtils: isSpanishIotNumber: Checking if phone number is Spanish IoT: $phoneNumber")

            // Normalize common separators, preserve '+'
            val normalized = phoneNumber.trim()
                .replace("[\\s\\-\\u00A0]".toRegex(), "")

            Timber.d("PhoneNumberUtils: isSpanishIotNumber: Normalized phone number: $normalized")

            // Handle number with or without '+' prefix
            val numberToCheck = if (normalized.startsWith("+")) {
                normalized
            } else {
                // If no '+', assume it might be Spanish format and prepend +34
                if (normalized.startsWith("34") && normalized.length >= 3) {
                    "+$normalized"
                } else {
                    // For other formats, just prepend '+' to see if it matches
                    "+$normalized"
                }
            }

            Timber.d("PhoneNumberUtils: isSpanishIotNumber: Number to check: $numberToCheck")

            // Must be only digits after the '+'
            if (numberToCheck.drop(1).any { !it.isDigit() }) {
                Timber.d("PhoneNumberUtils: isSpanishIotNumber: Phone number contains non-digit characters after '+', returning false")
                return false
            }

            // Match +34 + '59' + 11 more digits (13 national digits total)
            val isMatch = ES_IOT_M2M_REGEX.matches(numberToCheck)
            Timber.d("PhoneNumberUtils: isSpanishIotNumber: Regex match result for '$numberToCheck': $isMatch")

            return isMatch
        }

    }
}