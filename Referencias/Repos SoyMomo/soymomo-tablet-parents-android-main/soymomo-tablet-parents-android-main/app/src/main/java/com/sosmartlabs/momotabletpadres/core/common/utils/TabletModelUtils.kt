package com.sosmartlabs.momotabletpadres.core.common.utils

import com.sosmartlabs.momotabletpadres.tablet.model.TabletModel

/**
 * Helper for obtaining tablet model
 */
object TabletModelUtils  {

    /**
     * Gets the [TabletModel] instance for the given hardware model
     * @param hardwareModel Hardware model to map
     * @return [TabletModel] instance according with given hardware model
     */
    fun fromHardwareModel(hardwareModel: String?): TabletModel {
        return when (hardwareModel) {
            "SoyMomo_Lite_V1" -> {
                TabletModel.LITE
            }
            "SoyMomo_Lite_V2", "SoyMomoLite_V2C" -> {
                TabletModel.LITE_2
            }
            "SoyMomo_Lite_V3", "SoyMomo_Lite_V3_EEA" -> {
                TabletModel.LITE_3
            }
            "SoyMomo_Pro_V1" -> {
                TabletModel.PRO
            }
            "SoyMomo_Pro_EU_V1" -> {
                TabletModel.PRO_EU
            }
            "SoyMomo_Pro_V2", "SoyMomo_Pro_V2_24" -> {
                TabletModel.PRO_2
            }
            "S8-RK3368" -> {
                TabletModel.UNO
            }
            "moto g34 5G", "moto g35 5G" -> {
                TabletModel.PHONE_1
            }
            else -> {
                TabletModel.PHONE_1
            }
        }
    }

    /**
     * Gets the hardware model for the given [TabletModel]
     * @param tabletModel [TabletModel] to map into its hardware model
     * @return Hardware model string
     */
    fun fromTabletModel(tabletModel: TabletModel): String{
        return when (tabletModel) {
            TabletModel.LITE -> "SoyMomo_Lite_V1"
            TabletModel.LITE_2 -> "SoyMomo_Lite_V2"
            TabletModel.LITE_3 -> "SoyMomo_Lite_V3"
            TabletModel.PRO -> "SoyMomo_Pro_V1"
            TabletModel.PRO_EU -> "SoyMomo_Pro_EU_V1"
            TabletModel.UNO -> "S8-RK3368"
            TabletModel.PHONE_1 -> "SoyMomo_MomoPhone_V1"
            else -> "UNKNOWN"
        }
    }
}