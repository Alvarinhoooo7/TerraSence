package com.sosmartlabs.momo.nps.subscription.di

import com.sosmartlabs.momo.nps.subscription.data.ParseSubscriptionNpsDataSource
import com.sosmartlabs.momo.nps.subscription.data.SubscriptionNpsDataSource
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class SubscriptionNpsModule {

    @Binds
    @Singleton
    abstract fun bindSubscriptionNpsDataSource(
        impl: ParseSubscriptionNpsDataSource,
    ): SubscriptionNpsDataSource
}
