package com.sosmartlabs.momo.lingo.repository

import com.parse.ParseException
import com.parse.ParseQuery
import com.parse.coroutines.first
import com.parse.coroutines.suspendFind
import com.parse.coroutines.suspendSave
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.lingo.domain.LingoLanguageCatalog
import com.sosmartlabs.momo.lingo.domain.LingoLanguageProgress
import com.sosmartlabs.momo.lingo.domain.LingoLevelEntry
import com.sosmartlabs.momo.lingo.domain.LingoMilestone
import com.sosmartlabs.momo.lingo.domain.LingoMilestoneKind
import com.sosmartlabs.momo.lingo.domain.LingoProgressOverview
import com.sosmartlabs.momo.lingo.model.LingoAbcLevel
import com.sosmartlabs.momo.lingo.model.LingoGameSettings
import com.sosmartlabs.momo.lingo.model.LingoSettings
import com.sosmartlabs.momo.models.Wearer
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.withContext
import org.json.JSONObject
import timber.log.Timber
import java.util.Date
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.CoroutineContext

@Singleton
class LingoProgressRepository @Inject constructor(
    private val ioContext: CoroutineContext,
) {

    suspend fun fetchOverview(wearer: Wearer): LingoProgressOverview = coroutineScope {
        val lingoSettingsDeferred = async { fetchLingoSettings(wearer) }
        val gamesDeferred = async { fetchAllGameSettings(wearer) }

        val lingoSettings = lingoSettingsDeferred.await()
        val games = gamesDeferred.await()

        // One game object per language, preserving the updatedAt-descending order of the query.
        val gamesByLanguage = mostRecentPerLanguage(games)

        // Sequential (not map {}) because buildLanguageProgress is a suspend function.
        val withProgress = mutableListOf<LingoLanguageProgress>()
        for (game in gamesByLanguage) {
            withProgress.add(buildLanguageProgress(game))
        }
        val presentCodes = withProgress.map { it.code }.toSet()

        val remaining = LingoLanguageCatalog.supported()
            .filter { it.code !in presentCodes }
            .map { LingoLanguageProgress(it.code, it.displayName, null, emptyList(), emptyList()) }

        val storedLanguage = lingoSettings?.language?.takeIf { it.isNotEmpty() }
        val activeLanguage = storedLanguage
            ?: LingoLanguageCatalog.supported().firstOrNull()?.code
            ?: "en"

        // Always surface the active language, even if it is neither supported nor played yet, so the
        // switcher can show and target it.
        val languages = (withProgress + remaining).toMutableList()
        if (languages.none { it.code == activeLanguage }) {
            languages.add(
                0,
                LingoLanguageProgress(
                    code = activeLanguage,
                    displayName = LingoLanguageCatalog.displayName(activeLanguage),
                    lastUpdated = null,
                    levels = emptyList(),
                    milestones = emptyList(),
                ),
            )
        }

        LingoProgressOverview(activeLanguage = activeLanguage, languages = languages)
    }

    /**
     * Persists [code] as the wearer's active learning language, creating the LingoSettings row if
     * none exists yet.
     */
    suspend fun setActiveLanguage(code: String, wearer: Wearer) {
        withContext(ioContext) {
            try {
                val settings = fetchLingoSettings(wearer)
                    ?: LingoSettings().apply { this.wearer = wearer }
                settings.language = code
                settings.suspendSave()
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                CrashlyticsLog.recordNonFatalError(e, "LingoProgressRepository: setActiveLanguage failed")
                throw e
            }
        }
    }

    /**
     * Returns the wearer's LingoSettings, or null only when there genuinely is no row.
     *
     * A failure must NOT collapse to null: [setActiveLanguage] treats null as "create one", so a
     * swallowed network error would write a second LingoSettings row that nothing can clean up.
     * `first()` throws OBJECT_NOT_FOUND for an empty result rather than returning null, so absence
     * and failure arrive the same way and have to be told apart by code — same as
     * [fetchAllGameSettings] below. Ordered so that if duplicates already exist in production, every
     * read at least picks the same one.
     */
    private suspend fun fetchLingoSettings(wearer: Wearer): LingoSettings? {
        return withContext(ioContext) {
            try {
                ParseQuery.getQuery(LingoSettings::class.java)
                    .whereEqualTo("wearer", wearer)
                    .orderByAscending("createdAt")
                    .first()
            } catch (e: CancellationException) {
                throw e
            } catch (e: ParseException) {
                if (e.code == ParseException.OBJECT_NOT_FOUND) {
                    Timber.d("LingoProgressRepository: No LingoSettings for wearer")
                    return@withContext null
                }
                CrashlyticsLog.recordNonFatalError(e, "LingoProgressRepository: fetchLingoSettings failed")
                throw e
            } catch (e: Exception) {
                CrashlyticsLog.recordNonFatalError(e, "LingoProgressRepository: fetchLingoSettings failed")
                throw e
            }
        }
    }

    private suspend fun fetchAllGameSettings(wearer: Wearer): List<LingoGameSettings> {
        return withContext(ioContext) {
            try {
                ParseQuery.getQuery(LingoGameSettings::class.java)
                    .whereEqualTo("wearer", wearer)
                    .orderByDescending("updatedAt")
                    .setLimit(GAME_SETTINGS_QUERY_LIMIT)
                    .suspendFind()
            } catch (e: CancellationException) {
                throw e
            } catch (e: ParseException) {
                if (e.code == ParseException.OBJECT_NOT_FOUND) return@withContext emptyList()
                CrashlyticsLog.recordNonFatalError(e, "LingoProgressRepository: fetchAllGameSettings failed")
                throw e
            } catch (e: Exception) {
                CrashlyticsLog.recordNonFatalError(e, "LingoProgressRepository: fetchAllGameSettings failed")
                throw e
            }
        }
    }

    /** Keeps the first (most-recently-updated) game object seen per language. */
    private fun mostRecentPerLanguage(games: List<LingoGameSettings>): List<LingoGameSettings> {
        val seen = mutableSetOf<String>()
        val result = mutableListOf<LingoGameSettings>()
        for (game in games) {
            val language: String? = game.language
            if (language.isNullOrEmpty() || !seen.add(language)) continue
            result.add(game)
        }
        return result
    }

    private suspend fun buildLanguageProgress(game: LingoGameSettings): LingoLanguageProgress {
        val language: String = game.language
        val levels = fetchLevels(language)
        val statsMap = decodeGameStats(game.gameStats)
        return LingoLanguageProgress(
            code = language,
            displayName = LingoLanguageCatalog.displayName(language),
            lastUpdated = game.updatedAt,
            levels = buildLevelEntries(levels, statsMap),
            milestones = buildMilestones(statsMap, levels),
        )
    }

    private suspend fun fetchLevels(language: String): List<LingoAbcLevel> {
        return withContext(ioContext) {
            try {
                val levels = ParseQuery.getQuery(LingoAbcLevel::class.java)
                    .whereEqualTo("language", language)
                    .orderByAscending("unitLevel")
                    .setLimit(LEVELS_QUERY_LIMIT)
                    .suspendFind()
                if (levels.size >= LEVELS_QUERY_LIMIT) {
                    CrashlyticsLog.log(
                        "LingoProgressRepository: fetchLevels hit the $LEVELS_QUERY_LIMIT-level " +
                            "cap for language=$language; some levels may be truncated"
                    )
                }
                levels
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                CrashlyticsLog.recordNonFatalError(e, "LingoProgressRepository: fetchLevels failed")
                throw e
            }
        }
    }

    // MARK: - Decode helpers

    private data class LingoKeyStats(
        val cardCorrectCount: Int = 0,
        val spellingCorrectCount: Int = 0,
    )

    private data class LingoLevelStats(
        val completedAt: Date? = null,
        val reviewCompletedAt: Date? = null,
        val challengeCompletedAt: Date? = null,
        val lastIncorrect: List<String> = emptyList(),
        val keys: Map<String, LingoKeyStats> = emptyMap(),
    )

    private fun decodeGameStats(json: JSONObject?): Map<String, LingoLevelStats> {
        val levelsJson = json?.optJSONObject("levels") ?: return emptyMap()
        val result = mutableMapOf<String, LingoLevelStats>()
        val levelIds = levelsJson.keys()
        while (levelIds.hasNext()) {
            val levelId = levelIds.next()
            val levelObj = levelsJson.optJSONObject(levelId) ?: continue
            result[levelId] = decodeLevelStats(levelObj)
        }
        return result
    }

    private fun decodeLevelStats(obj: JSONObject): LingoLevelStats {
        val completedAt = obj.optLong("completedAt", 0).takeIf { it > 0 }?.let { Date(it) }
        val reviewCompletedAt = obj.optLong("reviewCompletedAt", 0).takeIf { it > 0 }?.let { Date(it) }
        val challengeCompletedAt = obj.optLong("challengeCompletedAt", 0).takeIf { it > 0 }?.let { Date(it) }

        val lastIncorrect = mutableListOf<String>()
        obj.optJSONArray("lastIncorrect")?.let { arr ->
            for (i in 0 until arr.length()) lastIncorrect.add(arr.optString(i))
        }

        val keysMap = mutableMapOf<String, LingoKeyStats>()
        obj.optJSONObject("keys")?.let { keysObj ->
            val keyNames = keysObj.keys()
            while (keyNames.hasNext()) {
                val keyName = keyNames.next()
                val keyObj = keysObj.optJSONObject(keyName)
                if (keyObj != null) {
                    keysMap[keyName] = LingoKeyStats(
                        cardCorrectCount = keyObj.optInt("cardCorrectCount", 0),
                        spellingCorrectCount = keyObj.optInt("spellingCorrectCount", 0),
                    )
                }
            }
        }

        return LingoLevelStats(
            completedAt = completedAt,
            reviewCompletedAt = reviewCompletedAt,
            challengeCompletedAt = challengeCompletedAt,
            lastIncorrect = lastIncorrect,
            keys = keysMap,
        )
    }

    private fun isMastered(stats: LingoKeyStats): Boolean =
        stats.cardCorrectCount >= 3 && stats.spellingCorrectCount >= 1

    private fun buildLevelEntries(
        levels: List<LingoAbcLevel>,
        statsMap: Map<String, LingoLevelStats>,
    ): List<LingoLevelEntry> {
        return levels.mapNotNull { level ->
            val levelId = level.levelId ?: return@mapNotNull null
            if (levelId.isEmpty()) return@mapNotNull null
            val stats = statsMap[levelId] ?: return@mapNotNull null

            val keysArray = level.keys?.let { arr ->
                (0 until arr.length()).map { arr.optString(it) }
            } ?: emptyList()

            val totalKeys = if (keysArray.isNotEmpty()) keysArray.size else stats.keys.size

            val completedWords = stats.keys.filter { isMastered(it.value) }.keys.sorted()
            // Every seen word has a keys entry (any correct/incorrect count); non-mastered = learning.
            val learningWords = stats.keys.filterNot { isMastered(it.value) }.keys.sorted()

            LingoLevelEntry(
                levelId = levelId,
                unitLevel = level.unitLevel ?: 0,
                displayName = level.displayName ?: levelId,
                completedAt = stats.completedAt,
                reviewCompletedAt = stats.reviewCompletedAt,
                challengeCompletedAt = stats.challengeCompletedAt,
                lastIncorrect = stats.lastIncorrect,
                totalKeys = totalKeys,
                completedWords = completedWords,
                learningWords = learningWords,
                keyImageMap = decodeKeyImageMap(level.keyImageMap),
            )
        }
    }

    /** Vocabulary key -> shared image name; empty keys/values are skipped. */
    private fun decodeKeyImageMap(json: JSONObject?): Map<String, String> {
        json ?: return emptyMap()
        val map = mutableMapOf<String, String>()
        val keyNames = json.keys()
        while (keyNames.hasNext()) {
            val key = keyNames.next()
            // opt(), not optString(): optString coerces a JSON null to the literal "null" and a
            // nested object to its serialized text. Both pass isNotEmpty() and would be used as an
            // image name, defeating the intended "the key names the image" fallback.
            val value = json.opt(key) as? String ?: continue
            if (value.isNotEmpty()) map[key] = value
        }
        return map
    }

    private fun buildMilestones(
        statsMap: Map<String, LingoLevelStats>,
        levels: List<LingoAbcLevel>,
    ): List<LingoMilestone> {
        val levelNames = levels.associate { (it.levelId ?: "") to (it.displayName ?: it.levelId ?: "") }

        val milestones = mutableListOf<LingoMilestone>()
        for ((levelId, stats) in statsMap) {
            val displayName = levelNames[levelId] ?: levelId
            stats.completedAt?.let { milestones.add(LingoMilestone(it, LingoMilestoneKind.COMPLETED, displayName)) }
            stats.reviewCompletedAt?.let { milestones.add(LingoMilestone(it, LingoMilestoneKind.REVIEW, displayName)) }
            stats.challengeCompletedAt?.let { milestones.add(LingoMilestone(it, LingoMilestoneKind.CHALLENGE, displayName)) }
        }
        return milestones.sortedByDescending { it.date }
    }

    companion object {
        // Upper bound for a single language's level catalogue. If a language ever
        // exceeds this, fetchLevels() logs so the truncation is visible.
        private const val LEVELS_QUERY_LIMIT = 200

        // Upper bound for a wearer's game-settings rows (one per language played).
        private const val GAME_SETTINGS_QUERY_LIMIT = 100
    }
}
