package com.sosmartlabs.momotabletpadres.utils.firebase

import com.google.firebase.Firebase
import com.google.firebase.analytics.FirebaseAnalytics
import com.google.firebase.analytics.analytics
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * Module that manages the dependency injection of coroutine-related components
 */
@Module
@InstallIn(SingletonComponent::class)
class FirebaseModule {

    /**
     * Injects an external scope for coroutines
     */
    @Singleton
    @Provides
    fun providesFirebaseAnalytics(): FirebaseAnalytics {
        return Firebase.analytics
    }

}