package com.sosmartlabs.momotabletpadres.barcodescanner

import android.graphics.RectF
import android.hardware.Camera
import com.google.android.gms.common.images.Size
import com.google.mlkit.vision.barcode.common.Barcode
import kotlin.math.abs

object PreferenceUtils {

    private val minimumBarcodeWidth = 25
    private val barcodeReticleWidth = 80
    private val barcodeReticleHeight = 35

    fun getProgressToMeetBarcodeSizeRequirement(
        overlay: GraphicOverlay,
        barcode: Barcode
    ): Float {
        val reticleBoxWidth = getBarcodeReticleBox(overlay).width()
        val barcodeWidth = overlay.translateX(barcode.boundingBox?.width()?.toFloat() ?: 0f)
        val requiredWidth = reticleBoxWidth * minimumBarcodeWidth / 100
        return (barcodeWidth / requiredWidth).coerceAtMost(1f)
    }

    fun getBarcodeReticleBox(overlay: GraphicOverlay): RectF {
        val overlayWidth = overlay.width.toFloat()
        val overlayHeight = overlay.height.toFloat()
        val boxWidth = overlayWidth * barcodeReticleWidth / 100
        val boxHeight = overlayHeight * barcodeReticleHeight / 100
        val cx = overlayWidth / 2
        val cy = overlayHeight / 2
        return RectF(cx - boxWidth / 2, cy - boxHeight / 2, cx + boxWidth / 2, cy + boxHeight / 2)
    }

    fun getPreferredPreviewSize(camera: Camera, width: Int? = null, height: Int? = null): CameraSizePair? {
        val validPreviewSizes = Utils.generateValidPreviewSizeList(camera)

        if (width != null && height != null) {
            val previewSizePair = getOptimalPreviewSize(validPreviewSizes, width, height)

            if (previewSizePair?.picture != null) return previewSizePair
        }

        return validPreviewSizes.findLast { it.preview == Size(1920, 1080) && it.picture != null }
            ?: validPreviewSizes.findLast { it.preview == Size(1280, 720)  && it.picture != null  }
    }

    private fun getOptimalPreviewSize(sizePairs: List<CameraSizePair>?, w: Int, h: Int): CameraSizePair? {
        val ASPECT_TOLERANCE = 0.1
        val targetRatio = h.toDouble() / w
        if (sizePairs == null) return null
        var optimalSize: CameraSizePair? = null
        var minDiff = Double.MAX_VALUE
        for (sizePair in sizePairs) {
            val ratio = sizePair.preview.height.toDouble() / sizePair.preview.width
            if (abs(ratio - targetRatio) > ASPECT_TOLERANCE) continue
            if (abs(sizePair.preview.height - h) < minDiff) {
                optimalSize = sizePair
                minDiff = abs(sizePair.preview.height - h).toDouble()
            }
        }
        if (optimalSize == null) {
            minDiff = Double.MAX_VALUE
            for (size in sizePairs) {
                if (abs(size.preview.height - h) < minDiff) {
                    optimalSize = size
                    minDiff = abs(size.preview.height - h).toDouble()
                }
            }
        }
        return optimalSize
    }
}