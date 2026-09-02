package com.sosmartlabs.momo.onboarding

import android.annotation.SuppressLint
import android.content.Intent
import android.os.Build
import android.os.Bundle
import androidx.activity.OnBackPressedCallback
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.edit
import androidx.core.net.toUri
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.updatePadding
import androidx.viewpager2.widget.ViewPager2
import android.widget.ImageView
import androidx.core.view.WindowCompat
import com.sosmartlabs.momo.databinding.ActivityOnboardingBinding
import com.sosmartlabs.momo.onboarding.adapter.OnBoardingAdapter
import com.sosmartlabs.momo.onboarding.model.OnBoardingPage
import com.sosmartlabs.momo.session.SessionActivity
import com.sosmartlabs.momo.utils.Constants
import com.sosmartlabs.momo.utils.EdgeToEdgeUtils
import timber.log.Timber

/**
 * Activity that displays the onboarding tutorial flow.
 * Uses ViewPager2 for modern paging behavior and ViewBinding for safe view access.
 * Supports edge-to-edge display with proper insets handling.
 */
class OnBoardingActivity : AppCompatActivity() {

    private lateinit var binding: ActivityOnboardingBinding
    private lateinit var adapter: OnBoardingAdapter
    private val pages = OnBoardingPage.getPages()
    private var isFirstTime = false
    private var fabOriginalTopMargin = 0
    private var indicatorOriginalBottomPadding = 0
    private val indicators = mutableListOf<ImageView>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        binding = ActivityOnboardingBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setupEdgeToEdge()

        isFirstTime = intent.getBooleanExtra(Constants.EXTRA_FIRST_TIME, true)

        setupViewPager()
        setupBuyButton()
        setupBackNavigation()
    }

    private fun setupEdgeToEdge() {
        // Store original values before applying insets
        val fabParams = binding.buttonBuyMomo.layoutParams as androidx.constraintlayout.widget.ConstraintLayout.LayoutParams
        fabOriginalTopMargin = fabParams.topMargin
        indicatorOriginalBottomPadding = binding.pageIndicator.paddingBottom

        WindowCompat.getInsetsController(window, window.decorView).isAppearanceLightStatusBars = false

        ViewCompat.setOnApplyWindowInsetsListener(binding.root) { view, windowInsets ->
            val systemBars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars())
            val displayCutout = windowInsets.getInsets(WindowInsetsCompat.Type.displayCutout())
            val navigationBars = windowInsets.getInsets(WindowInsetsCompat.Type.navigationBars())

            Timber.d("OnBoardingActivity: systemBars $systemBars")
            Timber.d("OnBoardingActivity: displayCutout $displayCutout")
            Timber.d("OnBoardingActivity: navigationBars $navigationBars")

            // Apply top margin to the buy button for status bar
            fabParams.topMargin = fabOriginalTopMargin + systemBars.top.coerceAtLeast(displayCutout.top)
            binding.buttonBuyMomo.layoutParams = fabParams

            // Apply bottom insets conditionally based on navigation type
            val shouldApplyBottomInsets = EdgeToEdgeUtils.hasButtonNavigation(applicationContext)
            val bottomPadding = if (shouldApplyBottomInsets) {
                navigationBars.bottom.coerceAtLeast(displayCutout.bottom)
            } else {
                0
            }

            Timber.d("OnBoardingActivity: shouldApplyBottomInsets $shouldApplyBottomInsets, bottomPadding $bottomPadding")

            // Apply bottom padding to page indicator for navigation bar
            binding.pageIndicator.updatePadding(
                bottom = indicatorOriginalBottomPadding + bottomPadding
            )

            windowInsets
        }
    }

    private fun setupViewPager() {
        adapter = OnBoardingAdapter(this, pages)
        binding.tutorialViewPager.adapter = adapter

        // Setup page indicators
        setupPageIndicators()

        // Listen for page changes
        binding.tutorialViewPager.registerOnPageChangeCallback(object : ViewPager2.OnPageChangeCallback() {
            override fun onPageSelected(position: Int) {
                super.onPageSelected(position)
                updatePageIndicators(position)
            }
        })
    }

    private fun setupPageIndicators() {
        indicators.apply {
            add(binding.indicator0)
            add(binding.indicator1)
            add(binding.indicator2)
            add(binding.indicator3)
            add(binding.indicator4)
            add(binding.indicator5)
        }
        updatePageIndicators(0) // Set initial state
    }

    private fun updatePageIndicators(selectedPosition: Int) {
        indicators.forEachIndexed { index, indicator ->
            val drawableRes = if (index == selectedPosition) {
                com.sosmartlabs.momo.R.drawable.tutorial_selected
            } else {
                com.sosmartlabs.momo.R.drawable.tutorial_unselected
            }
            indicator.setImageResource(drawableRes)
        }
    }

    private fun setupBuyButton() {
        binding.buttonBuyMomo.setOnClickListener {
            openWebsite(SOYMOMO_WEBSITE)
        }
    }

    private fun setupBackNavigation() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                val currentItem = binding.tutorialViewPager.currentItem
                if (currentItem == 0) {
                    // On first page, allow default back behavior
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                } else {
                    // Navigate to previous page
                    binding.tutorialViewPager.currentItem = currentItem - 1
                }
            }
        })
    }

    /**
     * Called by the last onboarding fragment to complete the tutorial.
     */
    fun finishTutorial() {
        if (isFirstTime) {
            markTutorialAsCompleted()
        }
        navigateToSession()
    }

    private fun markTutorialAsCompleted() {
        getSharedPreferences(Constants.TUTORIAL_PREFS, MODE_PRIVATE).edit {
            putBoolean(Constants.FIRST_TIME_OPEN, false)
        }
    }

    private fun navigateToSession() {
        startActivity(Intent(this, SessionActivity::class.java))
        finish()
    }

    private fun openWebsite(url: String) {
        val intent = Intent(Intent.ACTION_VIEW, url.toUri())
        startActivity(intent)
    }

    companion object {
        private const val SOYMOMO_WEBSITE = "https://www.soymomo.com/"
    }
}
