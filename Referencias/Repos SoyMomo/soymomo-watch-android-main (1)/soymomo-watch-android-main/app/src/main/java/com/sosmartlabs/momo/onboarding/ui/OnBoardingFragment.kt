package com.sosmartlabs.momo.onboarding.ui

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Parcelable
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.view.isVisible
import androidx.fragment.app.Fragment
import com.sosmartlabs.momo.databinding.FragmentOnboardingBinding
import com.sosmartlabs.momo.onboarding.OnBoardingActivity
import com.sosmartlabs.momo.onboarding.model.OnBoardingPage
import kotlinx.parcelize.Parcelize

/**
 * Fragment displaying a single onboarding page.
 * Uses ViewBinding for safe view access and modern lifecycle handling.
 */
class OnBoardingFragment : Fragment() {

    private var _binding: FragmentOnboardingBinding? = null
    private val binding get() = _binding!!

    private val page: OnBoardingPage by lazy {
        requireArguments().getOnBoardingPage(ARG_PAGE) ?: error("OnBoardingPage is required")
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentOnboardingBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupPage()
    }

    private fun setupPage() {
        with(binding) {
            // Set animation and content
            tutorialLottieView.setAnimation(page.animation)
            tutorialTitle.setText(page.titleRes)
            tutorialText.setText(page.textRes)

            // Configure last page
            if (page.isLastPage) {
                setupLastPage()
            }
        }
    }

    private fun setupLastPage() {
        with(binding) {
            // Make website link clickable
            tutorialText.setOnClickListener {
                openWebsite("https://www.soymomo.com/")
            }

            // Show finish button
            buttonTutorialFinish.isVisible = true
            buttonTutorialFinish.setOnClickListener {
                (activity as? OnBoardingActivity)?.finishTutorial()
            }
        }
    }

    private fun openWebsite(url: String) {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
        startActivity(intent)
    }

    override fun onResume() {
        super.onResume()
        binding.tutorialLottieView.resumeAnimation()
    }

    override fun onPause() {
        super.onPause()
        binding.tutorialLottieView.pauseAnimation()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }

    companion object {
        private const val ARG_PAGE = "arg_page"

        /**
         * Creates a new instance of OnBoardingFragment with the specified page data.
         */
        fun newInstance(page: OnBoardingPage): OnBoardingFragment {
            return OnBoardingFragment().apply {
                arguments = Bundle().apply {
                    putParcelable(ARG_PAGE, page.toParcelable())
                }
            }
        }
    }
}

/**
 * Parcelable wrapper for OnBoardingPage to pass through Bundle.
 */
@Parcelize
private data class ParcelableOnBoardingPage(
    val animation: Int,
    val titleRes: Int,
    val textRes: Int,
    val isLastPage: Boolean
) : Parcelable

private fun OnBoardingPage.toParcelable() = ParcelableOnBoardingPage(
    animation = animation,
    titleRes = titleRes,
    textRes = textRes,
    isLastPage = isLastPage
)

private fun Bundle.getOnBoardingPage(key: String): OnBoardingPage? {
    val parcelable = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        getParcelable(key, ParcelableOnBoardingPage::class.java)
    } else {
        @Suppress("DEPRECATION")
        getParcelable(key)
    } ?: return null
    
    return OnBoardingPage(
        animation = parcelable.animation,
        titleRes = parcelable.titleRes,
        textRes = parcelable.textRes,
        isLastPage = parcelable.isLastPage
    )
}