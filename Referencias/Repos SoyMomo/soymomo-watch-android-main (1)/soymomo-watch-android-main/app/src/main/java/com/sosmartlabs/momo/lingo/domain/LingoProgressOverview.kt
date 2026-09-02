package com.sosmartlabs.momo.lingo.domain

import java.util.Date

/**
 * Progress for a single language the wearer has (or could have) a LingoGameSettings object for.
 */
data class LingoLanguageProgress(
    val code: String,
    val displayName: String,
    // LingoGameSettings.updatedAt, null when there is no game object yet (a supported-but-unplayed
    // language). This is what distinguishes a language the wearer has been learning.
    val lastUpdated: Date?,
    val levels: List<LingoLevelEntry>,
    val milestones: List<LingoMilestone>,
) {
    val hasProgress: Boolean get() = levels.isNotEmpty()
}

/**
 * The full picture shown by the Lingo progress screen: every language the wearer can view/select,
 * plus which one is currently active on the watch.
 */
data class LingoProgressOverview(
    val activeLanguage: String,
    // Languages with progress first (most-recently-played first), then remaining supported languages.
    val languages: List<LingoLanguageProgress>,
)
