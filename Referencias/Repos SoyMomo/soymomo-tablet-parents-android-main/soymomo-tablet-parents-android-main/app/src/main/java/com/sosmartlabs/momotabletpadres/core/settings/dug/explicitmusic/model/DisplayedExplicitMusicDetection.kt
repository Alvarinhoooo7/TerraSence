package com.sosmartlabs.momotabletpadres.core.settings.dug.explicitmusic.model

import android.graphics.drawable.Drawable
import java.util.*

data class DisplayedExplicitMusicDetection(val objectId: String?, val appIcon: Drawable?, val appName: String?, val packageName: String, val songTitle: String, val songImage: String,
                                           val detectedArtist: String, val explicitArtistScore: Double,
                                           val detectionDate: Date, val hasFeedback: Boolean
)
