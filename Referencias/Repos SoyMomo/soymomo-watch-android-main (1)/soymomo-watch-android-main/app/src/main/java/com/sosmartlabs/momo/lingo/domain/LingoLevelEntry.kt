package com.sosmartlabs.momo.lingo.domain

import java.util.Date

data class LingoLevelEntry(
    val levelId: String,
    val unitLevel: Int,
    val displayName: String,
    val completedAt: Date?,
    val reviewCompletedAt: Date?,
    val challengeCompletedAt: Date?,
    val lastIncorrect: List<String>,
    val totalKeys: Int,
    val completedWords: List<String>,
    val learningWords: List<String>,
    // Vocabulary key -> shared image name (from LingoAbcLevel.keyImageMap); empty when unused.
    val keyImageMap: Map<String, String> = emptyMap(),
) {
    val masteredKeys: Int get() = completedWords.size
}
