package com.sosmartlabs.momotabletpadres.core.common.utils

import java.util.*

/**
 * Helper for find adequate field value in a list based on current locale
 */
object LocalizationHelper {

    /**
     * Makes the best effort for finding the appropriate field value in a list based in current locale
     * @param T Type for the object holding the required field
     * @param U Type for the required parameter
     * @param objectList List of [T] in which find the appropriate [U] required field
     * @param field Lambda that obtains the [U] field from an object of [T] type
     * @param language Lambda that obtains the language for the [T] object
     * @param country Lambda that obtains the country for the [T] object
     * @param executeOnFound Lambda that is called when an element is found for the object that contains it
     * @return Best value found for required parameter. Null if no parameter is found
     */
    fun <T, U> findLocalizedField(objectList: List<T>, field: (T) -> U?, language: (T) -> String?,
                                  country: (T) -> String?, executeOnFound: ((item: T) -> Unit)? = null): U? {
        val locale = Locale.getDefault()
        val searchAllLanguages = objectList.filter { field(it) != null }
        if (searchAllLanguages.isEmpty()) return null

        val searchLocaleLanguage = searchAllLanguages.filter { language(it).equals(locale.language, ignoreCase = true) }
        if (searchLocaleLanguage.isEmpty()) {
            executeOnFound?.invoke(searchAllLanguages[0])
            return field(searchAllLanguages[0])
        }

        val searchLocale = searchLocaleLanguage.find { country(it).equals(locale.country, ignoreCase = true) }
        val item = searchLocale
            ?: if (locale.language.equals("es", ignoreCase = true) && !locale.country.equals("ES", ignoreCase = true))
                searchLocaleLanguage.find { !language(it).equals("es", true) } ?: searchLocaleLanguage[0]
            else searchLocaleLanguage[0]
        executeOnFound?.invoke(item)
        return field(item)
    }
}