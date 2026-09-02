package com.sosmartlabs.momotabletpadres.di

import android.app.AlarmManager
import android.bluetooth.BluetoothManager
import android.content.Context
import android.media.AudioManager
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.GlobalScope
import javax.inject.Singleton
import kotlin.coroutines.CoroutineContext

/**
 * Module that manages the dependency injection of coroutine-related components
 */
@Module
@InstallIn(SingletonComponent::class)
class CoroutinesModule {

    /**
     * Injects an external scope for coroutines
     */
    @Singleton
    @Provides
    fun providesExternalCoroutineScope(): CoroutineScope {
        return GlobalScope
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