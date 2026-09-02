package com.sosmartlabs.momotabletpadres.settings.ui

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.Toolbar
import androidx.fragment.app.Fragment
import com.sosmartlabs.momotabletpadres.BuildConfig
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.databinding.FragmentAppSettingsBinding
import com.sosmartlabs.momotabletpadres.utils.support.ContactSupportLauncher
import com.sosmartlabs.momotabletpadres.utils.support.PrivacyPolicyLauncher
import com.sosmartlabs.momotabletpadres.utils.support.TermsAndConditionsLauncher
import com.sosmartlabs.momotabletpadres.utils.support.WhatsappSupportLauncher
import com.sosmartlabs.momotabletpadres.utils.support.ZendeskSupportLauncher
import com.sosmartlabs.momotabletpadres.utils.WindowInsetsUtils
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.ExperimentalCoroutinesApi
import timber.log.Timber

/**
 * Display a list of available Tablets
 * IMPORTANT: Parse User must not be null!
 */
@ExperimentalCoroutinesApi
@AndroidEntryPoint
class AppSettingsFragment: Fragment(){
    /**
     * Analytics Stuff
     */

    private lateinit var binding: FragmentAppSettingsBinding

    val toolbar: Toolbar get() = binding.toolbar

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        Timber.d("onCreateView: ")
        binding = FragmentAppSettingsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Timber.d("onViewCreated: ")

        // Push the purple header clear of the status bar (status-bar + 8dp, matching
        // MainActivity) and pad the scroll body clear of the navigation bar.
        WindowInsetsUtils.applyEdgeToEdgeInsets(
            root = binding.root,
            topView = binding.appBarLayoutBlocks,
            bottomView = binding.scrollView,
            extraTopPx = resources.getDimensionPixelSize(R.dimen.horizontal_margin_small),
        )
        setupToolbar()
        setupViewModel()
        setListeners()
        getAppVersion()
    }

    override fun onResume() {
        super.onResume()
        Timber.d("onResume: ")
        loadData()
    }

    override fun onPause() {
        super.onPause()
        Timber.d("onPause: ")
    }

    private fun setupViewModel() {
        Timber.d("setupViewModel")
    }

    private fun setupToolbar() {
        Timber.d("setupToolbar")
        with(activity as AppCompatActivity) {
            setSupportActionBar(toolbar)
            supportActionBar?.apply {
                title = null
                setDisplayShowTitleEnabled(true)
                setDisplayHomeAsUpEnabled(true)
                setDisplayShowHomeEnabled(true)
            }
            toolbar.setNavigationOnClickListener { onBackPressed() }
        }
    }

    private fun setListeners() {
        Timber.d("setListeners")
        with(binding) {
            frequentQuestionsCard.setOnClickListener {
                ZendeskSupportLauncher.launchZendeskSupportLauncher(requireContext())
            }

            contactCard.setOnClickListener {
                ContactSupportLauncher.launchContactSupportLauncher(requireContext())
            }

            chatCard.setOnClickListener {
                WhatsappSupportLauncher.launchWhatsappSupportContact(requireContext())
            }

            termsCard.setOnClickListener {
                TermsAndConditionsLauncher.launchTermsAndConditionsLauncher(requireContext())
            }

            policyCard.setOnClickListener {
                PrivacyPolicyLauncher.launchPrivacyPolicyLauncher(requireContext())
            }
        }
    }

    /**
     * Load Tablet List
     */
    private fun loadData(){
        Timber.d("loadData: ")
    }

    private fun getAppVersion() {
        binding.versionTitle.text = getString(R.string.settings_version_title, BuildConfig.VERSION_NAME)
    }
}