package com.sosmartlabs.momotabletpadres.core.common.dug.explicitmusic.model

/**
 * Class for handling explicit music artists
 * @param name Artist name
 * @param explicitScore Proportion of explicit content on artist music
 */
data class ExplicitMusicArtist(val name: String, val explicitScore: Double)