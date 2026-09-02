package com.sosmartlabs.momo.main.di

import android.content.Context
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationServices
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent

@Module
@InstallIn(SingletonComponent::class)
/**
 * Module for inject dependencies related with location services
 */
class LocationsModule {

    @Provides
    /**
     * Provides an instance for [FusedLocationProviderClient]
     * @param context [Context] for obtaining the provider
     */
    fun providesFusedLocationProviderClient(@ApplicationContext context: Context):
            FusedLocationProviderClient = LocationServices.getFusedLocationProviderClient(context)
}