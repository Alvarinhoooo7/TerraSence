package com.sosmartlabs.momotabletpadres.tablet.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet

/**
 * Base view model for tablet
 */
abstract class TabletViewModelBase(application: Application): AndroidViewModel(application) {

    /**
     * LiveData for access the current [Tablet] instance.
     * Private field, must be accessed through [tablet] property from outer classes
     */
    private val _tablet = MutableLiveData<Tablet>()

    /**
     * LiveData for access the current [Tablet] instance.
     */
    val tablet: LiveData<Tablet> get() = _tablet

    /**
     * Sets the current tablet
     * @param tablet Current [Tablet]
     */
    open fun setCurrentTablet(tablet: Tablet) {
        _tablet.postValue(tablet)
    }
}