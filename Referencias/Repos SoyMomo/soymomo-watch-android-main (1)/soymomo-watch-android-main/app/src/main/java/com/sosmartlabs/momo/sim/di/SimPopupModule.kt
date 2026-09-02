package com.sosmartlabs.momo.sim.di

import android.content.Context
import com.sosmartlabs.momo.sim.repository.SimPopupRepository
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object SimPopupModule {

    @Provides
    @Singleton
    fun provideSimPopupRepository(
        @ApplicationContext context: Context
    ): SimPopupRepository = SimPopupRepository(context)
}

