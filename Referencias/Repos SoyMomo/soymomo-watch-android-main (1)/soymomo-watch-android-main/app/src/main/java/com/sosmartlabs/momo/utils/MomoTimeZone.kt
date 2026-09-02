package com.sosmartlabs.momo.utils

/**
 * @author mrg
 * @date 8/17/17
 */

data class MomoTimeZone(val name: String, val value: String){
    override fun toString() = this.name

    companion object {
        fun getTimeZones(): ArrayList<MomoTimeZone> {
            val list = ArrayList<MomoTimeZone>()
            list.add(MomoTimeZone("GMT-12:00", "-12"))
            list.add(MomoTimeZone("GMT-11:00", "-11"))
            list.add(MomoTimeZone("GMT-10:00", "-10"))
            list.add(MomoTimeZone("GMT-09:30", "-9.5"))
            list.add(MomoTimeZone("GMT-09:00", "-9"))
            list.add(MomoTimeZone("GMT-08:00", "-8"))
            list.add(MomoTimeZone("GMT-07:00", "-7"))
            list.add(MomoTimeZone("GMT-06:00", "-6"))
            list.add(MomoTimeZone("GMT-05:00", "-5"))
            list.add(MomoTimeZone("GMT-04:00", "-4"))
            list.add(MomoTimeZone("GMT-03:30", "-3.5"))
            list.add(MomoTimeZone("GMT-03:00", "-3"))
            list.add(MomoTimeZone("GMT-02:00", "-2"))
            list.add(MomoTimeZone("GMT-01:00", "-1"))
            list.add(MomoTimeZone("GMT±00:00", "0"))
            list.add(MomoTimeZone("GMT+01:00", "1"))
            list.add(MomoTimeZone("GMT+02:00", "2"))
            list.add(MomoTimeZone("GMT+03:00", "3"))
            list.add(MomoTimeZone("GMT+03:30", "3.5"))
            list.add(MomoTimeZone("GMT+04:00", "4"))
            list.add(MomoTimeZone("GMT+04:30", "4.5"))
            list.add(MomoTimeZone("GMT+05:00", "5"))
            list.add(MomoTimeZone("GMT+05:30", "5.5"))
            list.add(MomoTimeZone("GMT+05:45", "5.75"))
            list.add(MomoTimeZone("GMT+06:00", "6"))
            list.add(MomoTimeZone("GMT+06:30", "6.5"))
            list.add(MomoTimeZone("GMT+07:00", "7"))
            list.add(MomoTimeZone("GMT+08:00", "8"))
            list.add(MomoTimeZone("GMT+08:30", "8.5"))
            list.add(MomoTimeZone("GMT+08:45", "8.75"))
            list.add(MomoTimeZone("GMT+09:00", "9"))
            list.add(MomoTimeZone("GMT+09:30", "9.5"))
            list.add(MomoTimeZone("GMT+10:00", "10"))
            list.add(MomoTimeZone("GMT+10:30", "10.5"))
            list.add(MomoTimeZone("GMT+11:00", "11"))
            list.add(MomoTimeZone("GMT+12:00", "12"))
            list.add(MomoTimeZone("GMT+12:45", "12.75"))
            list.add(MomoTimeZone("GMT+13:00", "13"))
            list.add(MomoTimeZone("GMT+14:00", "14"))
            return list
        }
    }
}

