package com.sosmartlabs.momotabletpadres.core.settings.dug.common.model

import android.content.Context
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.tablet.model.TabletModel
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
open class DugFeaturesRepository @Inject constructor(
    @ApplicationContext protected val context: Context
) {
    fun getDugFeaturesByTabletModel(tablet: Tablet) =
        when(tablet.model) {
            TabletModel.PRO, TabletModel.PRO_EU, TabletModel.PRO_2, TabletModel.PHONE_1 ->
                getVisionFeaturesByTablet(tablet) + getNLPFullFeaturesByTablet(tablet)
            else -> listOf()
        }

    protected fun getNLPLightFeaturesByTablet(tablet: Tablet): List<DugFeature> =
        listOf(getUnsafeSearchDetectorFeature(tablet), getExplicitMusicDetectorFeature(tablet))

    protected fun getNLPFullFeaturesByTablet(tablet: Tablet): List<DugFeature> =
        listOf(
            getProfanityDetectorFeature(tablet),
            getUnsafeSearchDetectorFeature(tablet), 
            getMoodDetectorFeature(tablet),
            getExplicitMusicDetectorFeature(tablet)
        )

    protected fun getVisionFeaturesByTablet(tablet: Tablet): List<DugFeature> =
        listOf(getSmartDetectorFeature(tablet))

    protected fun getSmartDetectorFeature(tablet: Tablet) = DugFeature(
        DugFeatureType.SMART_DETECTOR,
        context.getText(R.string.image_detector_title).toString(),
        R.drawable.ic_dug_smart_detection, 
        tablet.smartDetectionEnabled ?: false
    )

    protected fun getProfanityDetectorFeature(tablet: Tablet) = DugFeature(
        DugFeatureType.PROFANITY_DETECTOR,
        context.getText(R.string.text_detector_title).toString(),
        R.drawable.ic_dug_profanity_detection,
        tablet.profanityDetectionEnabled ?: false)

    protected fun getUnsafeSearchDetectorFeature(tablet: Tablet) = DugFeature(
        DugFeatureType.UNSAFE_SEARCH_DETECTOR,
        context.getText(R.string.unsafe_search_detector_title).toString(),
        R.drawable.ic_dug_unsafe_search_detection,
        tablet.unsafeSearchDetectionEnabled ?: false)

    protected fun getMoodDetectorFeature(tablet: Tablet) = DugFeature(
        DugFeatureType.MOOD_DETECTOR,
        context.getText(R.string.mood_detector_title).toString(),
        R.drawable.ic_dug_mood_detection,
        tablet.moodDetectionEnabled ?: false)

    protected fun getExplicitMusicDetectorFeature(tablet: Tablet) = DugFeature(
        DugFeatureType.EXPLICIT_MUSIC_DETECTOR,
        context.getText(R.string.explicit_music_detector_title).toString(),
        R.drawable.ic_dug_explicit_music_detection,
        tablet.explicitMusicDetectionEnabled ?: false)
}