package com.sosmartlabs.momo.settingsapp.ui.fragment

import android.annotation.SuppressLint
import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.Toolbar
import androidx.core.content.ContextCompat
import androidx.core.os.bundleOf
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import com.parse.ParseUser
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.addfirstwatch.AddFirstMomoActivity
import com.sosmartlabs.momo.databinding.SettingsAppMainFragmentBinding
import com.sosmartlabs.momo.dispatch.DispatchActivity
import com.sosmartlabs.momo.geofences.GeofenceActivity
import com.sosmartlabs.momo.main.ui.dialog.LogoutDialogFragment
import com.sosmartlabs.momo.settingsapp.model.SessionStatus
import com.sosmartlabs.momo.settingsapp.ui.SettingsAppViewModel
import com.sosmartlabs.momo.sim.SimActivity
import com.sosmartlabs.momo.sim.model.PaymentStatus
import com.sosmartlabs.momo.userprofile.UserProfileActivity
import com.sosmartlabs.momo.usersettings.UserSettingsActivity
import com.sosmartlabs.momo.utils.Resource
import com.sosmartlabs.momo.utils.support.PrivacyPolicyLauncher
import com.sosmartlabs.momo.utils.support.StoreCommerceLauncher
import com.sosmartlabs.momo.utils.support.TermsAndConditionsLauncher
import com.sosmartlabs.momo.utils.support.WhatsappSupportLauncher
import com.sosmartlabs.momo.utils.support.ZendeskSupportLauncher
import com.sosmartlabs.momo.utils.ui.DefaultIcons
import com.sosmartlabs.momo.utils.ui.loadImage
import com.sosmartlabs.momo.videocallhistory.VideoCallHistoryActivity
import timber.log.Timber

class SettingsAppMainFragment: Fragment() {

    /**
     * Binding
     */
    private lateinit var binding: SettingsAppMainFragmentBinding

    val toolbar: Toolbar get() = binding.toolbar

    /**
     * ViewModel
     */
    private val settingsAppViewModel: SettingsAppViewModel by activityViewModels()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        Timber.d("onCreateView")
        binding = SettingsAppMainFragmentBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Timber.d("onViewCreated")
        setupToolbar()
        setListener()
        observeViewModel()
    }

    override fun onResume() {
        super.onResume()
        settingsAppViewModel.getCurrentUser()
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
            window.statusBarColor = ContextCompat.getColor(requireContext(), R.color.background_sim_step_card_title)
            window.navigationBarColor = ContextCompat.getColor(requireContext(), R.color.white)
            toolbar.setNavigationOnClickListener { onBackPressed() }
        }
    }

    fun setListener() {
        binding.userProfileEdit.setOnClickListener {
            startActivity(Intent(requireContext(), UserProfileActivity::class.java))
        }

        binding.geofenceCard.setOnClickListener {
            startActivity(Intent(requireContext(), GeofenceActivity::class.java))
        }

        binding.addWatchCard.setOnClickListener {
            startActivity(Intent(requireContext(), AddFirstMomoActivity::class.java))
        }

        binding.linkedWatchesCard.setOnClickListener {
            navigateById(R.id.action_settingsAppMainFragment_to_linkedWatchesFragment)
        }

        binding.soymomoSimCard.setOnClickListener {
            startActivity(Intent(requireContext(), SimActivity::class.java))
        }

        binding.storeCard.setOnClickListener {
            StoreCommerceLauncher.launchStoreCommerceLauncher(requireContext())
        }

        binding.supportCard.setOnClickListener {
            WhatsappSupportLauncher.launchWhatsappSupportContact(requireContext())
        }

        binding.appSettingsCard.setOnClickListener {
            startActivity(Intent(requireContext(), UserSettingsActivity::class.java))
        }

        binding.videocallHistoryCard.setOnClickListener {
            startActivity(Intent(requireContext(), VideoCallHistoryActivity::class.java))
        }

        binding.faqCard.setOnClickListener {
            ZendeskSupportLauncher.launchZendeskSupportLauncher(requireContext())
        }

        binding.logOutCard.setOnClickListener {
            showLogoutDialog()
        }

        binding.termsCard.setOnClickListener {
            TermsAndConditionsLauncher.launchTermsAndConditionsLauncher(requireContext())
        }

        binding.privacyCard.setOnClickListener {
            PrivacyPolicyLauncher.launchPrivacyPolicyLauncher(requireContext())
        }
    }

    fun observeViewModel() {
        settingsAppViewModel.currentUser.observe(viewLifecycleOwner) {
            Timber.d("CurrentUser $it")
            when (it.status) {
                Resource.Status.LOADING -> {
                    // No-Op
                }
                Resource.Status.LOAD_SUCCESS -> {
                    it.data?.let { currentUser ->
                        setUserCardView(currentUser)
                        settingsAppViewModel.getUserGeofences(currentUser)
                        settingsAppViewModel.getWatchUsersWithWearer(currentUser)
                    }
                }
                Resource.Status.LOAD_ERROR -> {
                    // No-Op
                }
                else -> {
                    // No-Op
                }
            }
        }

        settingsAppViewModel.geofenceList.observe(viewLifecycleOwner) {
            Timber.d("geofenceList $it")
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

        settingsAppViewModel.currentWatchUsers.observe(viewLifecycleOwner) {
            Timber.d("currentWatchUsers $it")
            when (it.status) {
                Resource.Status.LOADING -> {
                    binding.linkedWatchesChip.visibility = View.VISIBLE
                    binding.linkedWatchesChip.text = ""
                }
                Resource.Status.LOAD_SUCCESS -> {
                    it.data?.let { watchUsers ->
                        binding.linkedWatchesChip.visibility = View.VISIBLE
                        binding.linkedWatchesChip.text = getString(R.string.settings_app_my_linked_soymomo_chip, watchUsers.size)
                    }
                }
                Resource.Status.LOAD_ERROR -> {
                    binding.linkedWatchesChip.visibility = View.INVISIBLE
                }
                else -> {
                    // No-Op
                }
            }
        }

        settingsAppViewModel.subscriptionList.observe(viewLifecycleOwner) {
            Timber.d("subscriptionList $it")
            when (it.status) {
                Resource.Status.LOADING -> {
                    binding.soymomoSimChip.visibility = View.VISIBLE
                    binding.soymomoSimChip.text = ""
                    binding.soymomoSimAlert.visibility = View.GONE
                }
                Resource.Status.LOAD_SUCCESS -> {
                    it.data?.let { subscriptions ->
                        binding.soymomoSimChip.visibility = View.VISIBLE
                        binding.soymomoSimChip.text = getString(R.string.settings_app_soymomo_sim_chip, subscriptions.size)
                        // Check for pending payment and show/hide alert
                        val hasPendingPayment = subscriptions.any { subscription ->
                            subscription.getPaymentStatus() == PaymentStatus.PENDING
                        }
                        binding.soymomoSimAlert.visibility = if (hasPendingPayment) View.VISIBLE else View.GONE
                    }
                }
                Resource.Status.LOAD_ERROR -> {
                    binding.soymomoSimChip.visibility = View.INVISIBLE
                    binding.soymomoSimAlert.visibility = View.GONE
                }
                else -> {
                    // No-Op
                }
            }
        }

        settingsAppViewModel.sessionStatus.observe(viewLifecycleOwner) {
            Timber.d("sessionStatus: $it")
            when (it) {
                SessionStatus.LOGGING_OUT -> {
                    // No-Op
                }
                SessionStatus.LOGGED_OUT -> {
                    startActivity(
                        Intent(requireContext(), DispatchActivity::class.java)
                        .setFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK))
                    activity?.finish()
                }
                SessionStatus.LOGOUT_ERROR -> {
                    Toast.makeText(requireContext(), R.string.unknown_error, Toast.LENGTH_LONG).show()
                }
                else -> {
                    /* Do nothing in any other case */
                }
            }
        }
    }

    @SuppressLint("SetTextI18n")
    private fun setUserCardView(user: ParseUser) {
        with(user) {
            val imageUrl = getParseFile("image")?.url ?: DefaultIcons.PROFILE_PLACEHOLDER
            binding.userProfilePicture.loadImage(imageUrl, fallback = DefaultIcons.PROFILE_PLACEHOLDER)
            val firstName = getString("firstName") ?: ""
            val lastName = getString("lastName") ?: ""
            val email = email ?: ""
            val phone = getString("phone") ?: ""
            binding.userProfileName.text = "$firstName $lastName"
            binding.userProfileEmail.text = email
            binding.userProfilePhone.text = phone
        }
    }

    private fun showLogoutDialog() {
        activity?.supportFragmentManager?.let { fragmentManager ->
            LogoutDialogFragment {
                settingsAppViewModel.logout()
            }.show(fragmentManager, "Logout")
        }
    }

    private fun navigateById(navId: Int, bundle: Bundle = bundleOf()) {
        val navController = findNavController()
        if (navController.currentDestination?.getAction(navId) != null) {
            navController.navigate(navId, bundle)
        } else {
            Timber.w("Skipping stale navigation to $navId from ${navController.currentDestination?.label}")
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        dispose()
    }

    private fun dispose() {

    }

}