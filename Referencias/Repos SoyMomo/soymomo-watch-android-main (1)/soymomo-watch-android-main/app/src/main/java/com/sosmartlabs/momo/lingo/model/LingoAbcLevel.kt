package com.sosmartlabs.momo.lingo.model

import com.parse.ParseClassName
import com.parse.ParseObject
import com.parse.ktx.delegates.ParseDelegate
import org.json.JSONArray
import org.json.JSONObject

@ParseClassName("LingoAbcLevel")
class LingoAbcLevel : ParseObject() {
    // Nullable delegates: a missing field returns null instead of throwing on the
    // erased cast. This lets the repository skip a malformed level (see
    // LingoProgressRepository.buildLevelEntries) rather than failing the whole
    // progress fetch with a NullPointerException.
    var language by ParseDelegate<String?>(null)
    var levelId by ParseDelegate<String?>(null)
    var levelType by ParseDelegate<String?>(null)
    var unitLevel by ParseDelegate<Int?>(null)
    var displayName by ParseDelegate<String?>(null)
    var imageKey by ParseDelegate<String?>(null)

    val keys: JSONArray?
        get() = if (has("keys")) getJSONArray("keys") else null

    // Maps a vocabulary key to the shared image name to use for it, so several keys can reuse one
    // drawable. When absent/empty, or for a key not present here, the key itself names the image.
    val keyImageMap: JSONObject?
        get() = if (has("keyImageMap")) getJSONObject("keyImageMap") else null

    val includesIds: JSONArray?
        get() = if (has("includesIds")) getJSONArray("includesIds") else null

    val specialRules: JSONObject?
        get() = if (has("specialRules")) getJSONObject("specialRules") else null
}
