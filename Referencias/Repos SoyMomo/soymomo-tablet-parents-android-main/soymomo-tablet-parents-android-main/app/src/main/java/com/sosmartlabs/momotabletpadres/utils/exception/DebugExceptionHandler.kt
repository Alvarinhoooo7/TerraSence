package com.sosmartlabs.momotabletpadres.utils.exception

import com.sosmartlabs.momotabletpadres.BuildConfig
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
open class DebugExceptionHandler @Inject constructor(){
    /**
     * Exception will be thrown jus
     */
    open fun checkDebugExceptionFlag(): Boolean{
        Timber.e( "handleException: You see this because are in Debug, this error can be skipped but it should be fixed in future releases.")
        return BuildConfig.DEBUG
    }
}