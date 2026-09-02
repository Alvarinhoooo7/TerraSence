package com.sosmartlabs.momo.di

import android.app.AlarmManager
import android.bluetooth.BluetoothManager
import android.content.Context
import android.media.AudioManager
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import kotlinx.coroutines.CoroutineExceptionHandler
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import timber.log.Timber
import javax.inject.Singleton
import kotlin.coroutines.CoroutineContext

/**
 * Module that manages the dependency injection of coroutine-related components
 */
@Module
@InstallIn(SingletonComponent::class)
class CoroutinesModule {

    /**
     * Injects an external scope for coroutines.
     *
     * App-lifetime scope (never cancelled), like the GlobalScope it replaces, but with a
     * CoroutineExceptionHandler so escaping exceptions become logged non-fatals instead of
     * killing the process. No dispatcher is set on purpose: launches without an explicit
     * context keep running on Dispatchers.Default, exactly like GlobalScope.
     */
    @Singleton
    @Provides
    fun providesExternalCoroutineScope(): CoroutineScope {
        return CoroutineScope(
            SupervisorJob() + CoroutineExceptionHandler { _, throwable ->
                Timber.e(throwable, "Uncaught exception in external coroutine scope")
                CrashlyticsLog.recordNonFatalError(throwable, "Uncaught exception in externalScope coroutine")
            }
        )
    }

    /**
     * Injects a CoroutineContext for IO operations
     */
    @Singleton
    @Provides
    fun providesIoCoroutineContext(): CoroutineContext {
        return Dispatchers.IO
    }
}