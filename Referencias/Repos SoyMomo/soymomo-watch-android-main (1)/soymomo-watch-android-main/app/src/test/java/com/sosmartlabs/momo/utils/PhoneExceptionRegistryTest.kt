package com.sosmartlabs.momo.utils

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Mirrors the iOS PhoneExceptionRegistryTests: match / isoCountryCode / isException, plus the
 * national-number extraction and normalization the Android pre-fill relies on.
 */
class PhoneExceptionRegistryTest {

    // --- Spain (+34 59XXXXXXXXXXX) ---

    @Test
    fun `spanish IoT number is a recognised exception`() {
        val phone = "+345901008996646"
        assertTrue(PhoneExceptionRegistry.isException(phone))
        assertEquals("ES", PhoneExceptionRegistry.isoCountryCode(phone))
        assertEquals("ES", PhoneExceptionRegistry.match(phone)?.isoCountryCode)
        assertEquals("34", PhoneExceptionRegistry.match(phone)?.countryCallingCode)
        assertEquals("5901008996646", PhoneExceptionRegistry.nationalNumber(phone))
    }

    // --- Sweden (+46 71XXXXXXXXXXX) ---

    @Test
    fun `swedish IoT number is a recognised exception`() {
        val phone = "+467191031730136"
        assertTrue(PhoneExceptionRegistry.isException(phone))
        assertEquals("SE", PhoneExceptionRegistry.isoCountryCode(phone))
        assertEquals("7191031730136", PhoneExceptionRegistry.nationalNumber(phone))
    }

    // --- Normalization ---

    @Test
    fun `matches despite spaces and hyphens`() {
        assertTrue(PhoneExceptionRegistry.isException("+34 5901 0089 96646"))
        assertTrue(PhoneExceptionRegistry.isException("+34-59-0100899-6646"))
    }

    @Test
    fun `matches when the leading plus is missing`() {
        assertTrue(PhoneExceptionRegistry.isException("345901008996646"))
        assertEquals("ES", PhoneExceptionRegistry.isoCountryCode("345901008996646"))
    }

    // --- Negatives: regular numbers are untouched ---

    @Test
    fun `regular spanish mobile is not an exception`() {
        val phone = "+34600123456"
        assertFalse(PhoneExceptionRegistry.isException(phone))
        assertNull(PhoneExceptionRegistry.isoCountryCode(phone))
        assertNull(PhoneExceptionRegistry.nationalNumber(phone))
        assertNull(PhoneExceptionRegistry.match(phone))
    }

    @Test
    fun `regular swedish mobile is not an exception`() {
        assertFalse(PhoneExceptionRegistry.isException("+46701234567"))
    }

    @Test
    fun `chilean number is not an exception`() {
        assertFalse(PhoneExceptionRegistry.isException("+56989589426"))
    }

    @Test
    fun `wrong length in the IoT range does not match`() {
        // One digit short of the required 13 national digits.
        assertFalse(PhoneExceptionRegistry.isException("+3459010089966"))
        // One digit too many.
        assertFalse(PhoneExceptionRegistry.isException("+3459010089966460"))
    }

    @Test
    fun `right length but wrong national prefix does not match`() {
        // 13 national digits but starting 58 instead of the Spanish IoT prefix 59.
        assertFalse(PhoneExceptionRegistry.isException("+345801008996646"))
    }

    @Test
    fun `non-digit content is rejected`() {
        assertFalse(PhoneExceptionRegistry.isException("+345901008996646X"))
        assertFalse(PhoneExceptionRegistry.isException("+34 59 call me"))
    }

    @Test
    fun `null and blank are handled`() {
        assertFalse(PhoneExceptionRegistry.isException(null))
        assertFalse(PhoneExceptionRegistry.isException(""))
        assertFalse(PhoneExceptionRegistry.isException("   "))
        assertNull(PhoneExceptionRegistry.match(null))
        assertNull(PhoneExceptionRegistry.isoCountryCode(null))
        assertNull(PhoneExceptionRegistry.nationalNumber(null))
    }

    @Test
    fun `supported countries are exactly ES and SE`() {
        assertEquals(setOf("ES", "SE"), PhoneExceptionRegistry.supportedCountries)
    }
}
