package com.sosmartlabs.momo.utils

import androidx.annotation.MainThread
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.Observer
import timber.log.Timber
import java.util.concurrent.atomic.AtomicBoolean

/**
 * A [MutableLiveData] that delivers each value to at most one active observer and only once.
 *
 * Use it for transient UI signals (success/error feedback, one-shot navigation) so the value is
 * NOT re-delivered when an observer re-attaches — e.g. returning to a fragment after navigating
 * away would otherwise replay the last terminal state and re-fire a toast/navigation.
 */
class SingleLiveEvent<T> : MutableLiveData<T>() {

    private val pending = AtomicBoolean(false)

    @MainThread
    override fun observe(owner: LifecycleOwner, observer: Observer<in T>) {
        if (hasActiveObservers()) {
            Timber.w("SingleLiveEvent has more than one observer; only one will be notified of changes.")
        }
        super.observe(owner) { value ->
            if (pending.compareAndSet(true, false)) {
                observer.onChanged(value)
            }
        }
    }

    @MainThread
    override fun setValue(value: T?) {
        pending.set(true)
        super.setValue(value)
    }
}
