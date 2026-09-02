package com.sosmartlabs.momo.sim

import androidx.arch.core.executor.testing.InstantTaskExecutorRule
import androidx.lifecycle.MutableLiveData
import com.sosmartlabs.momo.utils.Resource
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

/**
 * Regression guard for the portal / pending-payment observer pattern in
 * SubscriptionListFragment and SubscriptionDetailFragment.
 *
 * LiveData has no value-equality dedup: every post dispatches. The original
 * pattern called setXxxDefault() from the `else` branch too, so the DEFAULT
 * post re-fired the observer, whose `else` re-posted DEFAULT — an infinite
 * background→main ping-pong that span for as long as the screen was open.
 * The fix: the `else` (DEFAULT) branch takes no action, and the ViewModel's
 * setters guard against DEFAULT-over-DEFAULT posts.
 */
class SubscriptionObserverLoopRegressionTest {

    @get:Rule
    val instantTaskExecutorRule = InstantTaskExecutorRule()

    /** Mirrors the FIXED fragment observers: `else` takes no action. */
    @Test
    fun fixedPattern_settlesAfterSingleDefaultDelivery() {
        val liveData = MutableLiveData<Resource<String, Unit>>()
        var fires = 0
        val guard = 25

        liveData.observeForever { resource ->
            fires++
            if (fires >= guard) return@observeForever
            when (resource.status) {
                Resource.Status.LOADING -> { /* log only */ }
                Resource.Status.LOAD_SUCCESS -> liveData.value = Resource(status = Resource.Status.DEFAULT)
                Resource.Status.LOAD_ERROR -> liveData.value = Resource(status = Resource.Status.DEFAULT)
                else -> { /* DEFAULT is the reset state - intentionally no action */ }
            }
        }

        liveData.value = Resource(status = Resource.Status.LOAD_SUCCESS, data = "https://portal")

        // Exactly: SUCCESS delivery + one DEFAULT delivery.
        assertTrue("Expected 2 deliveries (success + default), got $fires", fires == 2)
    }

    /**
     * Tripwire documenting the bug: re-adding setDefault() to the `else` branch
     * makes the observer self-sustain. If someone "simplifies" the fragments back
     * to the old shape, this test shows why it loops.
     */
    @Test
    fun buggyPattern_wouldSelfSustain() {
        val liveData = MutableLiveData<Resource<String, Unit>>()
        var fires = 0
        val guard = 25

        liveData.observeForever { resource ->
            fires++
            if (fires >= guard) return@observeForever
            when (resource.status) {
                Resource.Status.LOADING -> { /* log only */ }
                // The OLD pattern: every terminal branch re-posts DEFAULT,
                // including the DEFAULT branch itself.
                else -> liveData.value = Resource(status = Resource.Status.DEFAULT)
            }
        }

        liveData.value = Resource(status = Resource.Status.LOAD_SUCCESS, data = "https://portal")

        assertTrue(
            "The unguarded else->setDefault pattern should loop (capped at $guard); got $fires",
            fires >= guard
        )
    }
}
