package com.sosmartlabs.momotabletpadres.settings.ui

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.Toolbar
import androidx.core.os.bundleOf
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import com.parse.ParseUser
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.databinding.SettingsAppMainFragmentBinding
import com.sosmartlabs.momotabletpadres.dispatch.DispatchActivity
import com.sosmartlabs.momotabletpadres.geofences.ui.GeofenceViewModel
import com.sosmartlabs.momotabletpadres.link.LinkDeviceActivity
import com.sosmartlabs.momotabletpadres.main.ui.MainViewModel
import com.sosmartlabs.momotabletpadres.models.LoginStatus
import com.sosmartlabs.momotabletpadres.session.dialog.LogoutDialogFragment
import com.sosmartlabs.momotabletpadres.sim.SimActivity
import com.sosmartlabs.momotabletpadres.utils.Constants
import com.sosmartlabs.momotabletpadres.utils.Resource
import com.sosmartlabs.momotabletpadres.utils.support.PrivacyPolicyLauncher
import com.sosmartlabs.momotabletpadres.utils.support.TermsAndConditionsLauncher
import com.sosmartlabs.momotabletpadres.utils.support.WhatsappSupportLauncher
import com.sosmartlabs.momotabletpadres.utils.WindowInsetsUtils
import com.sosmartlabs.momotabletpadres.glide.loadCircularImage
import com.sosmartlabs.momotabletpadres.viewmodels.UserViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import timber.log.Timber

@OptIn(ExperimentalCoroutinesApi::class)
class SettingsAppMainFragment: Fragment() {

    /**
     * Binding
     */
    private lateinit var binding: SettingsAppMainFragmentBinding

    val toolbar: Toolbar get() = binding.toolbar

    /**
     * ViewModel
     */
    private val userViewModel: UserViewModel by activityViewModels()
    private val mainViewModel: MainViewModel by activityViewModels()
    private val geofenceViewModel: GeofenceViewModel by activityViewModels()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        Timber.d("onCreateView")
        binding = SettingsAppMainFragmentBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Timber.d("onViewCreated")
        // Push the purple header (logo + back arrow) clear of the status bar with
        // the same status-bar + 8dp spacing as MainActivity, and apply the bottom
        // navigation-bar inset to the WHITE content sheet (not the purple ScrollView)
        // so the area behind the navigation bar stays white instead of showing the
        // ScrollView's purple background.
        WindowInsetsUtils.applyEdgeToEdgeInsets(
            root = binding.parentLayout,
            topView = binding.headerLayout,
            bottomView = binding.contentLayout,
            extraTopPx = resources.getDimensionPixelSize(R.dimen.horizontal_margin_small),
        )
        setupToolbar()
        setListener()
        observeViewModel()
    }

    override fun onResume() {
        super.onResume()
        ParseUser.getCurrentUser()?.let {
            mainViewModel.getTabletsByUser(it)
        }
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

    private fun setListener() {
        binding.userProfileEdit.setOnClickListener {
            navigateById(R.id.action_settingsAppMainFragment_to_parentProfileFragment)
        }

        binding.linkedTabletsCard.setOnClickListener {
            navigateById(R.id.action_settingsAppMainFragment_to_tabletListFragment)
        }

        binding.soymomoLinkingCard.setOnClickListener {
            startActivity(Intent(requireContext(), LinkDeviceActivity::class.java))
        }

        binding.soymomoSimCard.setOnClickListener {
            startActivity(Intent(requireContext(), SimActivity::class.java))
        }

        binding.geofenceCard.setOnClickListener {
            navigateById(R.id.action_settingsAppMainFragment_to_geofencesFragment)
        }

        binding.storeCard.setOnClickListener {
            val browserIntent = Intent(Intent.ACTION_VIEW, Uri.parse("http://www.soymomo.com/"))
            startActivity(browserIntent)
        }

        binding.supportCard.setOnClickListener {
            WhatsappSupportLauncher.launchWhatsappSupportContact(requireContext())
        }

        binding.appSettingsCard.setOnClickListener {
            navigateById(R.id.action_settingsAppMainFragment_to_appSettingsFragment)
        }

        binding.termsCard.setOnClickListener {
            TermsAndConditionsLauncher.launchTermsAndConditionsLauncher(requireContext())
        }

        binding.privacyCard.setOnClickListener {
            PrivacyPolicyLauncher.launchPrivacyPolicyLauncher(requireContext())
        }

        binding.logOutCard.setOnClickListener {
            showLogoutDialog()
        }
    }

    fun observeViewModel() {
        mainViewModel.tabletList.observe(viewLifecycleOwner) {
            Timber.d("currentWatchUsers $it")
            binding.linkedTabletsChip.visibility = View.VISIBLE
            binding.linkedTabletsChip.text = getString(R.string.settings_app_my_linked_soymomo_chip, it.size)
            binding.soymomoLinkingChip.visibility = View.VISIBLE
            binding.soymomoLinkingChip.text = getString(R.string.settings_app_my_linked_soymomo_chip, it.size)
        }

        mainViewModel.loginStatus.observe(viewLifecycleOwner) {
            if (it == LoginStatus.LOGGED_OUT) {
                // Clear the task on logout so the back stack can't return to
                // stale logged-in screens, matching MainActivity's logout path.
                startActivity(
                    Intent(requireContext(), DispatchActivity::class.java)
                        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
                )
                activity?.finish()
            }
        }

        mainViewModel.subscriptionList.observe(viewLifecycleOwner) {
            Timber.d("subscriptionList $it")
            when (it.status) {
                Resource.Status.LOADING -> {
                    binding.soymomoSimChip.visibility = View.VISIBLE
                    binding.soymomoSimChip.text = ""
                }
                Resource.Status.LOAD_SUCCESS -> {
                    it.data?.let { subscriptions ->
                        binding.soymomoSimChip.visibility = View.VISIBLE
                        binding.soymomoSimChip.text = getString(R.string.settings_app_soymomo_sim_chip, subscriptions.size)
                    }
                }
                Resource.Status.LOAD_ERROR -> {
                    binding.soymomoSimChip.visibility = View.INVISIBLE
                }
                else -> {
                    // No-Op
                }
            }
        }

        geofenceViewModel.geofences.observe(viewLifecycleOwner) {
            when (it.status) {
                Resource.Status.LOADING -> {
                    binding.geofenceChip.visibility = View.VISIBLE
                    binding.geofenceChip.text = ""
                }
                Resource.Status.LOAD_SUCCESS -> {
                    it.data?.let { geofences ->
                        binding.geofenceChip.visibility = View.VISIBLE
                        binding.geofenceChip.text = getString(R.string.settings_app_geofences_chip, geofences.size)
                    }
                }
                Resource.Status.LOAD_ERROR -> {
                    binding.geofenceChip.visibility = View.INVISIBLE
                }
                else -> {
                    // No-Op
                }
            }
        }

        setUserCardView()
    }

    private fun setUserCardView() {
        val imageUrl = userViewModel.getImageUrl()
        binding.userProfilePicture.loadCircularImage(imageUrl, 2f, fallback = Constants.PROFILE_PLACEHOLDER)
        val firstName = userViewModel.getFirstName()
        val lastName = userViewModel.getLastName()
        val email = userViewModel.getEmail()
        binding.userProfileName.text = "$firstName $lastName"
        binding.userProfileEmail.text = email
    }

    private fun showLogoutDialog() {
        activity?.supportFragmentManager?.let { fragmentManager ->
            LogoutDialogFragment.newInstance().apply {
                setOnLogoutListener {
                    mainViewModel.logout()
                }
            }.show(fragmentManager, "Logout")
        }
    }

    private fun navigateById(navId: Int, bundle: Bundle = bundleOf()) {
        findNavController().navigate(navId, bundle)
    }
}