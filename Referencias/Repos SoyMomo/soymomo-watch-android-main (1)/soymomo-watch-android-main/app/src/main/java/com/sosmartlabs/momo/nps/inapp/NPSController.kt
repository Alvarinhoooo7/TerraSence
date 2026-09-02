package com.sosmartlabs.momo.nps.inapp

import androidx.fragment.app.FragmentManager
import com.sosmartlabs.momo.models.NPSScheduler
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import timber.log.Timber
import javax.inject.Inject

class NPSController @Inject constructor() {

    fun showNPS(npsScheduler: NPSScheduler, fragmentManager: FragmentManager) {
        Timber.d("NPSController: showNPS called with NPSScheduler id=${npsScheduler.objectId}")
        CrashlyticsLog.log("NPSController: showNPS called with NPSScheduler id=${npsScheduler.objectId}")

        try {
            val dialog = NPSDialog.newInstance(npsScheduler)
            Timber.d("NPSController: NPSDialog instance created")
            CrashlyticsLog.log("NPSController: NPSDialog instance created")

            dialog.show(fragmentManager, NPS_DIALOG_TAG)
            Timber.d("NPSController: NPSDialog shown with tag $NPS_DIALOG_TAG")
            CrashlyticsLog.log("NPSController: NPSDialog shown with tag $NPS_DIALOG_TAG")
        } catch (e: Exception) {
            Timber.e(e, "NPSController: Error showing NPSDialog")
            CrashlyticsLog.recordNonFatalError(e, "NPSController: Error showing NPSDialog")
        }
    }

    companion object {
        const val NPS_DIALOG_TAG = "NPSDialog"
    }
}
