package com.sosmartlabs.momo.userprofile.ui.fragment

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
import com.sosmartlabs.momo.databinding.UserProfileMainFragmentBinding
import com.sosmartlabs.momo.dispatch.DispatchActivity
import com.sosmartlabs.momo.main.ui.dialog.LogoutDialogFragment
import com.sosmartlabs.momo.settingsapp.model.SessionStatus
import com.sosmartlabs.momo.userprofile.ui.UserProfileViewModel
import com.sosmartlabs.momo.utils.Resource
import com.sosmartlabs.momo.utils.ui.DefaultIcons
import com.sosmartlabs.momo.utils.ui.loadImage
import timber.log.Timber

class UserProfileMainFragment: Fragment() {

    /**
     * Binding
     */
    private lateinit var binding: UserProfileMainFragmentBinding

    val toolbar: Toolbar get() = binding.toolbar

    /**
     * ViewModel
     */
    private val userProfileViewModel: UserProfileViewModel by activityViewModels()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        binding = UserProfileMainFragmentBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupToolbar()
        setListeners()
        observeViewModel()

        //To-Do: hiding menus without implementation
        binding.socialMediaCard.visibility = View.GONE
        binding.eraseAccountCard.visibility = View.GONE
    }

    override fun onResume() {
        super.onResume()
        userProfileViewModel.getCurrentUser()
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

    private fun setListeners() {
        binding.editProfileCard.setOnClickListener {
            navigateById(R.id.action_userProfileMainFragment_to_editUserProfileFragment)
        }

        binding.changeEmailCard.setOnClickListener {
            navigateById(R.id.action_userProfileMainFragment_to_emailUserProfileFragment)
        }

        binding.changePasswordCard.setOnClickListener {
            navigateById(R.id.action_userProfileMainFragment_to_passwordUserProfileFragment)
        }

        binding.logOutCard.setOnClickListener {
            showLogoutDialog()
        }
    }

    private fun observeViewModel() {
        userProfileViewModel.currentUser.observe(viewLifecycleOwner) {
            Timber.d("currentUser $it")
            when (it.status) {
                Resource.Status.LOADING -> {
                    // No-Op
                }
                Resource.Status.LOAD_SUCCESS -> {
                    it.data?.let { currentUser ->
                        setUserView(currentUser)
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

        userProfileViewModel.sessionStatus.observe(viewLifecycleOwner) {
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

    private fun setUserView(user: ParseUser) {
        with(user) {
            val imageUrl = getParseFile("image")?.url ?: DefaultIcons.PROFILE_PLACEHOLDER
            binding.userProfilePicture.loadImage(imageUrl, fallback = DefaultIcons.PROFILE_PLACEHOLDER)
            val firstName = getString("firstName") ?: ""
            val lastName = getString("lastName") ?: ""
            val email = getString("email") ?: ""
            binding.userProfileName.text = "$firstName $lastName"
            binding.userProfileEmail.text = email
        }
    }

    private fun showLogoutDialog() {
        activity?.supportFragmentManager?.let { fragmentManager ->
            LogoutDialogFragment {
                userProfileViewModel.logout()
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