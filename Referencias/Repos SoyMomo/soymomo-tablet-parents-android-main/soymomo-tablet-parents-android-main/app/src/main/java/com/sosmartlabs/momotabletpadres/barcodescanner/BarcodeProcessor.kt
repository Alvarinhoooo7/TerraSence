package com.sosmartlabs.momotabletpadres.barcodescanner

import android.animation.ValueAnimator
import androidx.annotation.MainThread
import com.google.android.gms.tasks.Task
import com.google.firebase.Firebase
import com.google.firebase.crashlytics.crashlytics
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import timber.log.Timber
import java.io.IOException

/** A processor to run the barcode detector.  */
class BarcodeProcessor(graphicOverlay: GraphicOverlay, private val workflowModel: WorkflowModel) : FrameProcessorBase<List<Barcode>>() {


    private val options = BarcodeScannerOptions.Builder()
        .setBarcodeFormats(
            Barcode.FORMAT_QR_CODE)
        .build()

    private val scanner = BarcodeScanning.getClient(options)
    private val cameraReticleAnimator: CameraReticleAnimator = CameraReticleAnimator(graphicOverlay)

    override fun detectInImage(image: InputImage): Task<List<Barcode>> =
        scanner.process(image)

    @MainThread
    override fun onSuccess(
        inputInfo: InputInfo,
        results: List<Barcode>,
        graphicOverlay: GraphicOverlay
    ) {

        if (!workflowModel.isCameraLive) return

        Timber.d("Barcode result size: ${results.size}")

        // Picks the barcode, if exists, that covers the center of graphic overlay.

        val barcodeInCenter = results.firstOrNull { barcode ->
            val boundingBox = barcode.boundingBox ?: return@firstOrNull false
            val box = graphicOverlay.translateRect(boundingBox)
            box.contains(graphicOverlay.width / 2f, graphicOverlay.height / 2f)
        }

        graphicOverlay.clear()
        if (barcodeInCenter == null) {
            cameraReticleAnimator.start()
            graphicOverlay.add(
                BarcodeReticleGraphic(
                    graphicOverlay,
                    cameraReticleAnimator
                )
            )
            workflowModel.setWorkflowState(WorkflowModel.WorkflowState.DETECTING)
        } else {
            cameraReticleAnimator.cancel()
            val sizeProgress =
                PreferenceUtils.getProgressToMeetBarcodeSizeRequirement(
                    graphicOverlay,
                    barcodeInCenter
                )
            if (sizeProgress < 1) {
                // Barcode in the camera view is too small, so prompt user to move camera closer.
                graphicOverlay.add(
                    BarcodeConfirmingGraphic(
                        graphicOverlay,
                        barcodeInCenter
                    )
                )
                workflowModel.setWorkflowState(WorkflowModel.WorkflowState.CONFIRMING)
            } else {
                // Barcode size in the camera view is sufficient.
                workflowModel.setWorkflowState(WorkflowModel.WorkflowState.DETECTED)
                workflowModel.detectedBarcode.setValue(barcodeInCenter)
            }
        }
        graphicOverlay.invalidate()
    }

    private fun createLoadingAnimator(graphicOverlay: GraphicOverlay, barcode: Barcode): ValueAnimator {
        val endProgress = 1.1f
        return ValueAnimator.ofFloat(0f, endProgress).apply {
            duration = 2000
            addUpdateListener {
                if ((animatedValue as Float).compareTo(endProgress) >= 0) {
                    graphicOverlay.clear()
                    workflowModel.setWorkflowState(WorkflowModel.WorkflowState.SEARCHED)
                    workflowModel.detectedBarcode.setValue(barcode)
                } else {
                    graphicOverlay.invalidate()
                }
            }
        }
    }

    override fun onFailure(e: Exception) {
        Timber.e(e, "Barcode detection failed!")
    }

    override fun stop() {
        super.stop()
        try {
            scanner.close()
        } catch (e: IOException) {
            Timber.e(e,"Failed to close barcode detector!")
            with(Firebase.crashlytics) {
                Timber.e("Failed to close barcode detector!")
                recordException(e)
            }
        }
    }

    companion object {
        private const val TAG = "BarcodeProcessor"
    }
}