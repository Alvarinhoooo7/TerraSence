package com.sosmartlabs.momo.addfirstwatch.ui.fragments

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.os.bundleOf
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import com.airbnb.lottie.LottieDrawable
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.addfirstwatch.ui.AddFirstMomoViewModel
import com.sosmartlabs.momo.databinding.AddWatchFinishFragmentBinding
import com.sosmartlabs.momo.dispatch.DispatchActivity
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber

@AndroidEntryPoint
class FinishFragment : Fragment() {

    private lateinit var binding: AddWatchFinishFragmentBinding
    private val addFirstMomoViewModel: AddFirstMomoViewModel by activityViewModels()

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        Timber.d("FinishFragment: onCreateView called")
        try {
            binding = AddWatchFinishFragmentBinding.inflate(inflater, container, false)
            Timber.d("FinishFragment: Binding inflated successfully")
        } catch (e: Exception) {
            Timber.e(e, "FinishFragment: Error inflating binding in onCreateView")
            CrashlyticsLog.recordNonFatalError(e, "FinishFragment: Error inflating binding in onCreateView")
            throw e
        }

        setAnimation()
        Timber.d("FinishFragment: Animation set")
        try {
            addFirstMomoViewModel.setProgressStep(5)
            Timber.d("FinishFragment: Progress step set to 5")
        } catch (e: Exception) {
            Timber.e(e, "FinishFragment: Error setting progress step")
            CrashlyticsLog.recordNonFatalError(e, "FinishFragment: Error setting progress step")
        }
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        Timber.d("FinishFragment: onViewCreated called")
        super.onViewCreated(view, savedInstanceState)
        addFirstMomoViewModel.trackAddWatchCompleted()
        setupListeners()
    }

    private fun setAnimation() {
        Timber.d("FinishFragment: setAnimation called")
        try {
            with(binding.finishAnimation) {
                setAnimation(R.raw.soymomo_welcome)
                repeatCount = LottieDrawable.INFINITE
                playAnimation()
            }
            Timber.d("FinishFragment: Lottie animation started")
        } catch (e: Exception) {
            Timber.e(e, "FinishFragment: Error setting animation")
            CrashlyticsLog.recordNonFatalError(e, "FinishFragment: Error setting animation")
        }
    }

    private fun navigateById(navId: Int, bundle: Bundle = bundleOf()) {
        Timber.d("FinishFragment: navigateById called with navId=$navId, bundle=$bundle")
        try {
            findNavController().navigate(navId, bundle)
            Timber.d("FinishFragment: Navigation to $navId successful")
        } catch (e: Exception) {
            Timber.e(e, "FinishFragment: Navigation error to $navId")
            CrashlyticsLog.recordNonFatalError(e, "FinishFragment: Navigation error to $navId")
        }
    }

    private fun setupListeners() {
        Timber.d("FinishFragment: setupListeners called")
        binding.buttonFinish.setOnClickListener {
            Timber.d("FinishFragment: buttonFinish clicked")
            try {
                requireActivity().finish()
                Timber.d("FinishFragment: Activity finished")
            } catch (e: Exception) {
                Timber.e(e, "FinishFragment: Error finishing activity")
                CrashlyticsLog.recordNonFatalError(e, "FinishFragment: Error finishing activity")
            }
            try {
                val intent = Intent(requireContext(), DispatchActivity::class.java).apply {
                    putExtra(DispatchActivity.EXTRA_FROM_ADD_WATCH_FLOW, true)
                }
                Timber.d("FinishFragment: Starting DispatchActivity with EXTRA_FROM_ADD_WATCH_FLOW=true")
                startActivity(intent)
            } catch (e: Exception) {
                Timber.e(e, "FinishFragment: Error starting DispatchActivity")
                CrashlyticsLog.recordNonFatalError(e, "FinishFragment: Error starting DispatchActivity")
            }
        }
    }

    override fun onDestroyView() {
        Timber.d("FinishFragment: onDestroyView called")
        super.onDestroyView()
        dispose()
    }

    private fun dispose() {
        Timber.d("FinishFragment: dispose called")
    }
}
