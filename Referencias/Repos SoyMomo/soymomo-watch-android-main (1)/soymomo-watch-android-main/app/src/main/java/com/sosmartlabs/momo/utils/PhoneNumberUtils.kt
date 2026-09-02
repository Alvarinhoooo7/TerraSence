package com.sosmartlabs.momo.utils

import com.google.i18n.phonenumbers.PhoneNumberUtil
import com.hbb20.CountryCodePicker
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import timber.log.Timber

class PhoneNumberUtils {

    companion object {

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

            // IoT/M2M numbers (see PhoneExceptionRegistry) are rejected by libphonenumber but are valid.
            if (PhoneExceptionRegistry.isException(fullNumber)) {
                Timber.d("PhoneNumberUtils: isValidPhoneNumber(CCP): IoT/M2M exception number considered valid: $fullNumber")
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
            // IoT/M2M numbers (see PhoneExceptionRegistry) are rejected by libphonenumber but are valid.
            if (PhoneExceptionRegistry.isException(phoneNumber)) {
                Timber.d("PhoneNumberUtils: isValidPhoneNumber(String): IoT/M2M exception number considered valid: $phoneNumber")
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
         * Resolves the ISO-3166 alpha-2 country for [phone]. Checks the IoT/M2M exception registry
         * FIRST (so non-standard SoyMomo device numbers resolve correctly), then falls back to
         * libphonenumber region detection. Returns null if the country cannot be determined.
         */
        fun getCountryForPhone(phone: String?): String? {
            if (phone.isNullOrBlank()) return null

            PhoneExceptionRegistry.isoCountryCode(phone)?.let { exceptionCountry ->
                Timber.d("PhoneNumberUtils: getCountryForPhone: IoT/M2M exception country $exceptionCountry for $phone")
                return exceptionCountry
            }

            return try {
                val phoneUtil = PhoneNumberUtil.getInstance()
                val parsed = phoneUtil.parse(phone, null)
                phoneUtil.getRegionCodeForNumber(parsed)
            } catch (e: Exception) {
                Timber.w(e, "PhoneNumberUtils: getCountryForPhone: could not resolve country for $phone")
                null
            }
        }
    }
}
