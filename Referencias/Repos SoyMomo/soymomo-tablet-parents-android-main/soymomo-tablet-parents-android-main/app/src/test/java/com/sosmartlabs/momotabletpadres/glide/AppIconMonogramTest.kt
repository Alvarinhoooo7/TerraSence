package com.sosmartlabs.momotabletpadres.glide

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Unit tests for the pure logic behind the Gmail-style app-icon monogram avatars.
 *
 * The colour selection and letter derivation are kept in pure functions (no Android dependencies)
 * so the behaviour that matters — deterministic per-app colour and a sensible letter for any name —
 * is locked in here without Robolectric. The actual Drawable rendering / resource palette is
 * exercised on-device.
 */
class AppIconMonogramTest {

    private val paletteSize = 12

    // --- firstGlyph ---------------------------------------------------------

    @Test
    fun `first glyph is the upper-cased first letter`() {
        assertEquals("C", AppIconMonogram.firstGlyph("Chrome"))
        assertEquals("A", AppIconMonogram.firstGlyph("ajustes"))
        assertEquals("S", AppIconMonogram.firstGlyph("Spotify"))
    }

    @Test
    fun `first glyph trims surrounding whitespace`() {
        assertEquals("S", AppIconMonogram.firstGlyph("   Spotify"))
        assertEquals("D", AppIconMonogram.firstGlyph("Dolby Atmos "))
    }

    @Test
    fun `first glyph falls back to question mark for null, empty or blank`() {
        assertEquals("?", AppIconMonogram.firstGlyph(null))
        assertEquals("?", AppIconMonogram.firstGlyph(""))
        assertEquals("?", AppIconMonogram.firstGlyph("    "))
    }

    @Test
    fun `first glyph keeps accented letters`() {
        assertEquals("É", AppIconMonogram.firstGlyph("éclair"))
    }

    @Test
    fun `first glyph keeps a leading emoji intact rather than splitting the surrogate pair`() {
        // U+1F600 is a surrogate pair; taking name[0] would yield a broken half-char.
        val glyph = AppIconMonogram.firstGlyph("😀 Game")
        assertEquals("😀", glyph)
        assertEquals(2, glyph.length) // full code point preserved (2 UTF-16 units)
    }

    // --- colorIndex ---------------------------------------------------------

    @Test
    fun `color index is stable for the same name`() {
        assertEquals(
            AppIconMonogram.colorIndex("Chrome", paletteSize),
            AppIconMonogram.colorIndex("Chrome", paletteSize),
        )
    }

    @Test
    fun `color index ignores surrounding whitespace`() {
        assertEquals(
            AppIconMonogram.colorIndex("Chrome", paletteSize),
            AppIconMonogram.colorIndex("  Chrome  ", paletteSize),
        )
    }

    @Test
    fun `color index is always within palette bounds`() {
        val names = listOf("Chrome", "Ajustes", "Cámara", "Dolby Atmos", "WhatsApp", "", "  ", "😀")
        for (name in names) {
            val index = AppIconMonogram.colorIndex(name, paletteSize)
            assertTrue("index $index out of bounds for '$name'", index in 0 until paletteSize)
        }
    }

    @Test
    fun `color index is defined for null and empty names`() {
        assertEquals(0, AppIconMonogram.colorIndex(null, paletteSize))
        assertEquals(0, AppIconMonogram.colorIndex("", paletteSize))
    }

    @Test
    fun `color index guards against a non-positive palette size`() {
        assertEquals(0, AppIconMonogram.colorIndex("Chrome", 0))
        assertEquals(0, AppIconMonogram.colorIndex("Chrome", -5))
    }
}
