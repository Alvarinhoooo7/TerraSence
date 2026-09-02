package com.sosmartlabs.momo.utils;

import android.os.Build;

/**
 * @author mrg
 * @date 1/10/18
 */

public class SamsungUtils {
    public static boolean hasBrokenDatePickerDialog(){
        return Build.MANUFACTURER.equalsIgnoreCase("samsung")
                && Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP
                && Build.VERSION.SDK_INT <= Build.VERSION_CODES.LOLLIPOP_MR1;
    }
}
