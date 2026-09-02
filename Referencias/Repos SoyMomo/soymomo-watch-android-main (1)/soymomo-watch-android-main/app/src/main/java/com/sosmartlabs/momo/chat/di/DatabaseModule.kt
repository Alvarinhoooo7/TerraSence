package com.sosmartlabs.momo.chat.di

import android.content.Context
import com.sosmartlabs.momo.chat.data.local.database.ChatDatabase
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * Module for injecting a Singleton ChatDatabase instance using Hilt
 */
@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    /**
     * Injects a singleton instance of ChatDatabase
     */
    @Singleton
    @Provides
    fun provideChatDatabase(@ApplicationContext appContext: Context): ChatDatabase {
        return ChatDatabase.getInstance(appContext)
    }
}