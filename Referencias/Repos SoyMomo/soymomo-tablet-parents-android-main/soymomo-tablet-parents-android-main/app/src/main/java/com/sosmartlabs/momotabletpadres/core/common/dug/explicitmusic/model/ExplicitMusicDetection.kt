package com.sosmartlabs.momotabletpadres.core.common.dug.explicitmusic.model

import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import java.util.*

/**
 * Class for handling explicit music detection data
 * @param objectId Object Id in Parse Database for thi object, if any
 * @param tablet Tablet where the detection occurs
 * @param packageName App package name where the song was detected
 * @param songTitle Song title
 * @param songImage Song representative image
 * @param detectedArtist Detected artist name in song
 * @param artist Additional data about the detected artist
 * @param detectionDate Song detection date
 */
data class ExplicitMusicDetection(val objectId: String?, val tablet: Tablet? = null,
                                  val packageName: String, val songTitle: String, val songImage: String,
                                  val detectedArtist: String, val artist: ExplicitMusicArtist,
                                  val detectionDate: Date, val hasFeedback: Boolean)
