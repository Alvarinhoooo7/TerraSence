package com.sosmartlabs.momotabletpadres.onboarding

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.widget.ImageView
import androidx.activity.OnBackPressedCallback
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.constraintlayout.widget.ConstraintLayout
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.fragment.app.Fragment
import androidx.fragment.app.FragmentManager
import androidx.fragment.app.FragmentStatePagerAdapter
import androidx.viewpager.widget.ViewPager
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.databinding.ActivityOnboardingNewBinding
import com.sosmartlabs.momotabletpadres.onboarding.ui.OnboardingFragment
import com.sosmartlabs.momotabletpadres.session.SessionActivity
import com.sosmartlabs.momotabletpadres.utils.Constants

/**
 * Activity that displays the onboarding tutorial for new users.
 * Shows a series of pages explaining app features with Lottie animations.
 */
class OnboardingActivity : AppCompatActivity() {

    // region Properties
    
    private lateinit var binding: ActivityOnboardingNewBinding
    
    private val pageSelectors: MutableList<ImageView> = mutableListOf()
    
    // endregion
    
    // region Lifecycle
    
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        
        binding = ActivityOnboardingNewBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        setupEdgeToEdge()
        setupViewPager()
        setupPageSelectors()
        setupClickListeners()
        setupBackNavigation()
    }
    
    // endregion
    
    // region Setup Methods
    
    private fun setupEdgeToEdge() {
        // Use light icons on dark background
        WindowInsetsControllerCompat(window, window.decorView).apply {
            isAppearanceLightStatusBars = false
            isAppearanceLightNavigationBars = false
        }
        
        // Apply insets to views
        applyInsetsToFab()
        applyInsetsToLogo()
        applyInsetsToPageSelector()
    }

    private fun applyInsetsToFab() {
        ViewCompat.setOnApplyWindowInsetsListener(binding.buttonBuyMomo) { view, windowInsets ->
            val insets = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars())
            (view.layoutParams as ConstraintLayout.LayoutParams).apply {
                topMargin = insets.top + EDGE_MARGIN_SMALL
            }
            view.requestLayout()
            WindowInsetsCompat.CONSUMED
        }
    }

    private fun applyInsetsToLogo() {
        ViewCompat.setOnApplyWindowInsetsListener(binding.cornerLogo) { view, windowInsets ->
            val insets = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars())
            (view.layoutParams as ConstraintLayout.LayoutParams).apply {
                topMargin = insets.top + EDGE_MARGIN_LARGE
            }
            view.requestLayout()
            WindowInsetsCompat.CONSUMED
        }
    }
    
    private fun applyInsetsToPageSelector() {
        ViewCompat.setOnApplyWindowInsetsListener(binding.layoutSelector) { view, windowInsets ->
            val insets = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars())
            (view.layoutParams as ConstraintLayout.LayoutParams).apply {
                bottomMargin = insets.bottom + EDGE_MARGIN_SELECTOR
            }
            view.requestLayout()
            WindowInsetsCompat.CONSUMED
        }
    }
    
    private fun setupViewPager() {
        binding.tutorialViewPager.apply {
            adapter = OnBoardingPagerAdapter(supportFragmentManager)
            addOnPageChangeListener(object : ViewPager.SimpleOnPageChangeListener() {
                override fun onPageSelected(position: Int) {
                    updatePageSelector(position)
                }
            })
        }
    }
    
    private fun setupPageSelectors() {
        pageSelectors.apply {
            add(binding.selector1)
            add(binding.selector2)
            add(binding.selector3)
            add(binding.selector4)
            add(binding.selector5)
        }
        updatePageSelector(0)
    }
    
    private fun setupClickListeners() {
        binding.buttonBuyMomo.setOnClickListener {
            openBuyMomoWebsite()
        }
    }
    
    private fun setupBackNavigation() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                val viewPager = binding.tutorialViewPager
                if (viewPager.currentItem > 0) {
                    viewPager.currentItem -= 1
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })
    }
    
    // endregion
    
    // region Public Methods
    
    /**
     * Called when user completes the tutorial.
     * Saves completion status and navigates to the main session.
     */
    fun finishTutorial() {
        getSharedPreferences(Constants.SP_SHAREDPREFERENCES_NAME, MODE_PRIVATE)
            .edit()
            .putBoolean(Constants.FIRST_TIME_OPEN, false)
            .apply()
        
        startActivity(Intent(this, SessionActivity::class.java))
        finish()
    }
    
    // endregion
    
    // region Private Methods
    
    private fun updatePageSelector(selectedPosition: Int) {
        pageSelectors.forEachIndexed { index, imageView ->
            val drawableRes = if (index == selectedPosition) {
                R.drawable.tutorial_selected
            } else {
                R.drawable.tutorial_unselected
            }
            imageView.setImageResource(drawableRes)
        }
    }
    
    private fun openBuyMomoWebsite() {
        val browserIntent = Intent(Intent.ACTION_VIEW, Uri.parse(SOYMOMO_WEBSITE_URL))
        startActivity(browserIntent)
    }
    
    // endregion
    
    // region Inner Classes
    
    @Suppress("DEPRECATION")
    private inner class OnBoardingPagerAdapter(
        fragmentManager: FragmentManager
    ) : FragmentStatePagerAdapter(fragmentManager, BEHAVIOR_RESUME_ONLY_CURRENT_FRAGMENT) {
        
        override fun getItem(position: Int): Fragment {
            return OnboardingFragment.newInstance(position)
        }
        
        override fun getCount(): Int = NUM_PAGES
    }
    
    // endregion
    
    // region Companion Object
    
    companion object {
        private const val NUM_PAGES = 5
        private const val SOYMOMO_WEBSITE_URL = "https://www.soymomo.com/"
        
        // Edge-to-edge margin constants (in dp, converted at runtime)
        private const val EDGE_MARGIN_SMALL = 16
        private const val EDGE_MARGIN_LARGE = 32
        private const val EDGE_MARGIN_SELECTOR = 8
    }
    
    // endregion
}
