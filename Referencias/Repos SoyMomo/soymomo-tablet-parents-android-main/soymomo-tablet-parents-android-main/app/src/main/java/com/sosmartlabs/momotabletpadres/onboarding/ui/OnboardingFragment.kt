package com.sosmartlabs.momotabletpadres.onboarding.ui

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.annotation.RawRes
import androidx.annotation.StringRes
import androidx.constraintlayout.widget.ConstraintLayout
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.isVisible
import androidx.core.view.updatePadding
import androidx.fragment.app.Fragment
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.databinding.FragmentOnboardingBinding
import com.sosmartlabs.momotabletpadres.onboarding.OnboardingActivity
import com.sosmartlabs.momotabletpadres.utils.Constants

/**
 * Fragment that displays a single page of the onboarding tutorial.
 * Each page contains a Lottie animation, title, and description text.
 */
class OnboardingFragment : Fragment() {

    // region Properties
    
    private var _binding: FragmentOnboardingBinding? = null
    private val binding get() = _binding!!
    
    private val tutorialPage: Int by lazy {
        arguments?.getInt(Constants.EXTRA_TUTORIAL_PAGE, PAGE_WELCOME) ?: PAGE_WELCOME
    }
    
    // endregion
    
    // region Lifecycle
    
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
        
        setupWindowInsets()
        setupPageContent()
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
    
    // endregion
    
    // region Setup Methods
    
    private fun setupWindowInsets() {
        applyInsetsToFinishButton()
        applyInsetsToTextContent()
    }
    
    private fun applyInsetsToFinishButton() {
        ViewCompat.setOnApplyWindowInsetsListener(binding.buttonTutorialFinish) { view, windowInsets ->
            val insets = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars())
            (view.layoutParams as ConstraintLayout.LayoutParams).apply {
                bottomMargin = insets.bottom + BUTTON_BOTTOM_MARGIN
            }
            view.requestLayout()
            windowInsets
        }
    }
    
    private fun applyInsetsToTextContent() {
        val textViews = listOf(binding.tutorialTitle, binding.tutorialText)
        
        textViews.forEach { textView ->
            ViewCompat.setOnApplyWindowInsetsListener(textView) { view, windowInsets ->
                val insets = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars())
                view.updatePadding(
                    left = insets.left + CONTENT_HORIZONTAL_PADDING,
                    right = insets.right + CONTENT_HORIZONTAL_PADDING
                )
                windowInsets
            }
        }
    }
    
    private fun setupPageContent() {
        val pageContent = getPageContent(tutorialPage)
        
        with(binding) {
            tutorialLottieView.setAnimation(pageContent.animationRes)
            tutorialTitle.setText(pageContent.titleRes)
            tutorialText.setText(pageContent.descriptionRes)
            
            // Only show finish button on the last page
            buttonTutorialFinish.isVisible = pageContent.showFinishButton
            if (pageContent.showFinishButton) {
                buttonTutorialFinish.setOnClickListener {
                    (activity as? OnboardingActivity)?.finishTutorial()
                }
            }
        }
    }
    
    // endregion
    
    // region Helper Methods
    
    private fun getPageContent(page: Int): PageContent {
        return when (page) {
            PAGE_WELCOME -> PageContent(
                animationRes = R.raw.onboarding_welcome,
                titleRes = R.string.tutorial_title_1,
                descriptionRes = R.string.tutorial_text_1
            )
            PAGE_DETECTIVE -> PageContent(
                animationRes = R.raw.onboarding_momo_detective,
                titleRes = R.string.tutorial_title_2,
                descriptionRes = R.string.tutorial_text_2
            )
            PAGE_WEBSITE_BLOCK -> PageContent(
                animationRes = R.raw.onboarding_block_website,
                titleRes = R.string.tutorial_title_3,
                descriptionRes = R.string.tutorial_text_3
            )
            PAGE_CLASS_MODE -> PageContent(
                animationRes = R.raw.onboarding_class_mode,
                titleRes = R.string.tutorial_title_4,
                descriptionRes = R.string.tutorial_text_4
            )
            PAGE_SETTINGS -> PageContent(
                animationRes = R.raw.onboarding_last_settings,
                titleRes = R.string.tutorial_title_5,
                descriptionRes = R.string.tutorial_text_5,
                showFinishButton = true
            )
            else -> PageContent(
                animationRes = R.raw.onboarding_welcome,
                titleRes = R.string.tutorial_title_1,
                descriptionRes = R.string.tutorial_text_1
            )
        }
    }
    
    // endregion
    
    // region Data Classes
    
    /**
     * Represents the content for a single onboarding page.
     */
    private data class PageContent(
        @param:RawRes val animationRes: Int,
        @param:StringRes val titleRes: Int,
        @param:StringRes val descriptionRes: Int,
        val showFinishButton: Boolean = false
    )
    
    // endregion
    
    // region Companion Object
    
    companion object {
        // Page indices
        private const val PAGE_WELCOME = 0
        private const val PAGE_DETECTIVE = 1
        private const val PAGE_WEBSITE_BLOCK = 2
        private const val PAGE_CLASS_MODE = 3
        private const val PAGE_SETTINGS = 4
        
        // Layout constants
        private const val BUTTON_BOTTOM_MARGIN = 48
        private const val CONTENT_HORIZONTAL_PADDING = 16
        
        /**
         * Creates a new instance of OnBoardingFragment for the specified page.
         *
         * @param tutorialPage The page index (0-4)
         * @return A new OnBoardingFragment instance
         */
        @JvmStatic
        fun newInstance(tutorialPage: Int): OnboardingFragment {
            return OnboardingFragment().apply {
                arguments = Bundle().apply {
                    putInt(Constants.EXTRA_TUTORIAL_PAGE, tutorialPage)
                }
            }
        }
    }
    
    // endregion
}
