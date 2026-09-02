package com.sosmartlabs.momotabletpadres.appinfo.model.remote

import com.parse.ParseClassName
import com.parse.ParseObject
import com.parse.ktx.delegates.ParseDelegate
import com.parse.ktx.delegates.ParseRelationDelegate

/**
 * Represents an element from AppInfo collection on Parse database
 */
@ParseClassName("AppInfo")
class ParseAppInfo: ParseObject() {
    var lang by ParseDelegate<String?>(null)
    var country by ParseDelegate<String?>(null)
    var screenshots by ParseDelegate<MutableList<String>?>(null)
    var title by ParseDelegate<String?>(null)
    var description by ParseDelegate<String?>(null)
    var descriptionHTML by ParseDelegate<String?>(null)
    var summary by ParseDelegate<String?>(null)
    var installs by ParseDelegate<String?>(null)
    var scoreText by ParseDelegate<String?>(null)
    var currency by ParseDelegate<String?>(null)
    var priceText by ParseDelegate<String?>(null)
    var free by ParseDelegate<Boolean?>(null)
    var size by ParseDelegate<String?>(null)
    var offersIAP by ParseDelegate<Boolean?>(null)
    var androidVersion by ParseDelegate<String?>(null)
    var androidVersionText by ParseDelegate<String?>(null)
    var IAPRange by ParseDelegate<String?>(null)
    var developerId by ParseDelegate<String?>(null)
    var developerEmail by ParseDelegate<String?>(null)
    var developerWebsite by ParseDelegate<String?>(null)
    var developer by ParseDelegate<String?>(null)
    var privacyPolicy by ParseDelegate<String?>(null)
    var developerInternalID by ParseDelegate<String?>(null)
    var genre by ParseDelegate<String?>(null)
    var genreId by ParseDelegate<String?>(null)
    var developerAddress by ParseDelegate<String?>(null)
    var familyGenre by ParseDelegate<String?>(null)
    var familyGenreId by ParseDelegate<String?>(null)
    var icon by ParseDelegate<String?>(null)
    var headerImage by ParseDelegate<String?>(null)
    var videoImage by ParseDelegate<String?>(null)
    var contentRating by ParseDelegate<String?>(null)
    var contentRatingDescription by ParseDelegate<String?>(null)
    var video by ParseDelegate<String?>(null)
    var released by ParseDelegate<String?>(null)
    var version by ParseDelegate<String?>(null)
    var adSupported by ParseDelegate<Boolean?>(null)
    var editorsChoice by ParseDelegate<Boolean?>(null)
    var appId by ParseDelegate<String?>(null)
    var url by ParseDelegate<String?>(null)
    var recentChanges by ParseDelegate<String?>(null)
    var packageName by ParseDelegate<String>(null)
    val dugDescriptionHTML by ParseDelegate<String?>(null)
    val saferAppAlternative by ParseRelationDelegate<ParseAppInfo>(null)
    val dugAnalysis by ParseDelegate<String?>(null)
}
