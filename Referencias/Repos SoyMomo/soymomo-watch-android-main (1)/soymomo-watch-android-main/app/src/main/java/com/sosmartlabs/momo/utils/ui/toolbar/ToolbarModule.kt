package com.sosmartlabs.momo.utils.ui.toolbar

import androidx.appcompat.app.AppCompatActivity
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.components.ActivityComponent
import dagger.hilt.android.scopes.ActivityScoped

@Module
@InstallIn(ActivityComponent::class)
class ToolbarModule {

    @ActivityScoped
    @Provides
    fun toolbarConstructor(activity : AppCompatActivity) = ToolbarConstructor(activity)

}