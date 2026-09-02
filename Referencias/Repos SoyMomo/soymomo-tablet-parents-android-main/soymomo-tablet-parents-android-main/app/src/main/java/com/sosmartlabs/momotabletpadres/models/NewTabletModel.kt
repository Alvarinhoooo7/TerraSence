package com.sosmartlabs.momotabletpadres.models
/**
 * Models for Tablets
 */
enum class NewTabletModel(val id:Int) {
    LITE(2),
    PRO(1),
    UNO(0);
    companion object{
        fun fromId(id: Int):NewTabletModel{
            return when(id){
                2 ->{LITE}
                1 ->{PRO}
                0 ->{UNO}
                else ->{
                    throw Exception("Conversion failed, there is no case for id: $id")
                }
            }
        }
    }
}


