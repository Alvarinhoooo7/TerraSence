package com.sosmartlabs.momo.lingo.domain

import java.util.Locale

/**
 * A MomoLingo language the wearer can learn.
 *
 * [code] is the exact value stored in LingoSettings.language / LingoGameSettings.language — it
 * carries the variant so regional Spanishes can coexist ("es-ES" today, "es-419" in the future),
 * alongside "en". [locale] is a BCP-47 identifier used only to derive a display name with its
 * region only where it matters (e.g. "es-ES" -> "Español (España)"); bare "en" -> "English".
 */
data class LingoLanguage(
    val code: String,
    val locale: String,
) {
    val displayName: String get() = displayName(code, locale)

    companion object {
        /**
         * A localized "Language (Region)" name in the user's current locale, derived from
         * [localeIdentifier]. The platform resolves the whole string, so no per-language string
         * resources are needed.
         */
        fun displayName(code: String, localeIdentifier: String): String {
            val current = Locale.getDefault()
            val resolved = Locale.forLanguageTag(localeIdentifier)
                .getDisplayName(current)
                .takeIf { it.isNotEmpty() }
                ?: Locale.forLanguageTag(code)
                    .getDisplayLanguage(current)
                    .takeIf { it.isNotEmpty() }
            val name = resolved ?: return code.uppercase()
            return name.replaceFirstChar { if (it.isLowerCase()) it.titlecase(current) else it.toString() }
        }
    }
}

/**
 * The languages MomoLingo supports. This list ships with the app — update it here (and keep the
 * watch app's matching list in sync) whenever a language is added. Each entry pairs the bare code
 * stored in Parse with a locale used only to render the display name and its regional variant.
 */
object LingoLanguageCatalog {

    fun supported(): List<LingoLanguage> = listOf(
        LingoLanguage(code = "en", locale = "en"),
        LingoLanguage(code = "es-ES", locale = "es-ES"),
    )

    /** The display locale configured for a code, falling back to the code itself. */
    fun localeFor(code: String): String =
        supported().firstOrNull { it.code == code }?.locale ?: code

    /** A localized display name for any code, even one not present in the supported list. */
    fun displayName(code: String): String =
        LingoLanguage.displayName(code, localeFor(code))
}
