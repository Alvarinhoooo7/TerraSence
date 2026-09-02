package com.sosmartlabs.momotabletpadres.settings.ui

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.Toolbar
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import com.parse.ParseUser
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.databinding.FragmentParentProfileBinding
import com.sosmartlabs.momotabletpadres.dispatch.DispatchActivity
import com.sosmartlabs.momotabletpadres.main.ui.MainViewModel
import com.sosmartlabs.momotabletpadres.models.LoginStatus
import com.sosmartlabs.momotabletpadres.session.dialog.LogoutDialogFragment
import com.sosmartlabs.momotabletpadres.utils.Constants
import com.sosmartlabs.momotabletpadres.utils.WindowInsetsUtils
import com.sosmartlabs.momotabletpadres.glide.loadCircularImage
import com.sosmartlabs.momotabletpadres.viewmodels.UserViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import timber.log.Timber

@OptIn(ExperimentalCoroutinesApi::class)
class ParentProfileFragment: Fragment() {

    /**
     * Binding
     */
    private lateinit var binding: FragmentParentProfileBinding

    val toolbar: Toolbar get() = binding.toolbar

    /**
     * ViewModel
     */
    private val userViewModel: UserViewModel by activityViewModels()
    private val mainViewModel: MainViewModel by activityViewModels()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        Timber.d("onCreateView")
        binding = FragmentParentProfileBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Timber.d("onViewCreated")
        // Push the purple header clear of the status bar (status-bar + 8dp, matching
        // MainActivity) and pad the scroll body clear of the navigation bar.
        WindowInsetsUtils.applyEdgeToEdgeInsets(
            root = binding.root,
            topView = binding.appBarLayoutBlocks,
            bottomView = binding.scrollView,
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
        binding.tutorLogoutCard.setOnClickListener {
            showLogoutDialog()
        }

        binding.backArrow.setOnClickListener {
            activity?.onBackPressed()
        }
    }

    fun observeViewModel() {
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

        setUserCardView()
    }

    private fun setUserCardView() {
        val imageUrl = userViewModel.getImageUrl()
        binding.variableImage.loadCircularImage(imageUrl, 2f, fallback = Constants.PROFILE_PLACEHOLDER)

        val firstName = userViewModel.getFirstName()
        val lastName = userViewModel.getLastName()
        val email = userViewModel.getEmail()
        binding.tutorName.text = "$firstName $lastName"
        binding.tutorEmail.text = email

        binding.tutorEditProfileCard.setOnClickListener {
            findNavController().navigate(R.id.action_parentProfileFragment_to_parentProfileEditFragment)
        }
        binding.tutorChangeEmailCard.setOnClickListener {
            findNavController().navigate(R.id.action_parentProfileFragment_to_emailUserProfileFragment)
        }
        binding.tutorChangePasswordCard.setOnClickListener {
            findNavController().navigate(R.id.action_parentProfileFragment_to_passwordUserProfileFragment)
        }
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
}