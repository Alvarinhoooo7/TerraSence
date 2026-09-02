package com.sosmartlabs.momo.watchrequests.ui

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.isVisible
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.snackbar.Snackbar
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.FragmentWatchUserListBinding
import com.sosmartlabs.momo.models.WatchUser
import com.sosmartlabs.momo.watchrequests.ui.adapter.AcceptedRequestAdapter
import com.sosmartlabs.momo.watchrequests.ui.adapter.PendingRequestAdapter
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber

@AndroidEntryPoint
class WatchUserListFragment : Fragment() {

    private lateinit var binding: FragmentWatchUserListBinding
    private lateinit var pendingAdapter: PendingRequestAdapter
    private lateinit var acceptedAdapter: AcceptedRequestAdapter

    private val viewModel: WatchRequestViewModel by activityViewModels()

    /** Guards against double-submitting an accept/reject while one is in flight. */
    private var actionInFlight = false

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        binding = FragmentWatchUserListBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupEdgeToEdge()
        setupToolbar()
        initViewAdapter()
        observeViewModel()
        binding.toolbar.setNavigationOnClickListener {
            requireActivity().onBackPressedDispatcher.onBackPressed()
        }
    }

    private fun initViewAdapter() {
        pendingAdapter = PendingRequestAdapter(requireContext()).apply {
            listener = object : PendingRequestAdapter.Listener {
                override fun onAcceptClickListener(user: WatchUser) {
                    showAcceptDialog(user)
                }

                override fun onRejectClickListener(user: WatchUser) {
                    showRejectDialog(user)
                }
            }
        }
        binding.pendingRv.apply {
            layoutManager = LinearLayoutManager(requireContext())
            adapter = pendingAdapter
        }

        acceptedAdapter = AcceptedRequestAdapter(requireContext()).apply {
            listener = object : AcceptedRequestAdapter.Listener {
                override fun onItemClickListener(watchUser: WatchUser) {
                    openPermissionEditor(watchUser)
                }
            }
        }
        binding.acceptedRv.apply {
            layoutManager = LinearLayoutManager(requireContext())
            adapter = acceptedAdapter
        }
    }

    private fun observeViewModel() {
        viewModel.pendingRequests.observe(viewLifecycleOwner) {
            pendingAdapter.submitList(it)
            binding.pendingVs.displayedChild = if (it.isEmpty()) EMPTY_STATE_CHILD else LIST_CHILD
        }

        viewModel.acceptedRequests.observe(viewLifecycleOwner) {
            acceptedAdapter.submitList(it)
            binding.acceptedVs.displayedChild = if (it.isEmpty()) EMPTY_STATE_CHILD else LIST_CHILD
        }

        viewModel.acceptedEvent.observe(viewLifecycleOwner) { watchUser ->
            showAcceptedSnackbar(watchUser)
        }

        viewModel.state.observe(viewLifecycleOwner) { state ->
            state ?: return@observe
            // Any non-loading state means the in-flight accept/reject has resolved.
            if (state != WatchRequestViewModel.RequestState.LOADING) actionInFlight = false
            when (state) {
                WatchRequestViewModel.RequestState.LOADING -> setLoading(true)
                WatchRequestViewModel.RequestState.LOADING_SUCCESS -> setLoading(false)
                WatchRequestViewModel.RequestState.ERROR_DELETE ->
                    showResult(R.string.toast_error_deleting_user)
                WatchRequestViewModel.RequestState.ERROR_ACCEPT ->
                    showResult(R.string.toast_error_accepting_request)
                WatchRequestViewModel.RequestState.ERROR_REJECT ->
                    showResult(R.string.toast_error_rejecting_request)
                WatchRequestViewModel.RequestState.ERROR_GET ->
                    showResult(R.string.toast_error_loading_users)
                WatchRequestViewModel.RequestState.SUCCESS_DELETE ->
                    showResult(R.string.toast_user_deleted)
                WatchRequestViewModel.RequestState.SUCCESS_ACCEPT ->
                    // Confirmation + the discoverable "Edit access" action are shown by the
                    // acceptedEvent observer; here we only clear the loading state.
                    setLoading(false)
                WatchRequestViewModel.RequestState.SUCCESS_REJECT ->
                    showResult(R.string.toast_request_rejected)
                else -> Unit
            }
        }
    }

    private fun setLoading(loading: Boolean) {
        binding.progressBar.isVisible = loading
    }

    private fun showResult(messageRes: Int) {
        setLoading(false)
        Snackbar.make(binding.root, getString(messageRes), Snackbar.LENGTH_SHORT).show()
    }

    private fun showAcceptDialog(user: WatchUser) {
        if (actionInFlight) return
        MaterialAlertDialogBuilder(requireContext())
            .setTitle(R.string.watch_request_accept_title)
            .setMessage(getString(R.string.watch_request_accept_message, displayName(user)))
            .setPositiveButton(R.string.watch_request_accept) { dialog, _ ->
                dialog.dismiss()
                if (!actionInFlight) {
                    actionInFlight = true
                    viewModel.handlePendingRequest(user, true)
                }
            }
            .setNegativeButton(android.R.string.cancel) { dialog, _ -> dialog.dismiss() }
            .show()
    }

    private fun showRejectDialog(user: WatchUser) {
        if (actionInFlight) return
        MaterialAlertDialogBuilder(requireContext())
            .setTitle(R.string.watch_request_reject_title)
            .setMessage(getString(R.string.watch_request_reject_message, displayName(user)))
            .setPositiveButton(R.string.watch_request_reject) { dialog, _ ->
                dialog.dismiss()
                if (!actionInFlight) {
                    actionInFlight = true
                    viewModel.handlePendingRequest(user, false)
                }
            }
            .setNegativeButton(android.R.string.cancel) { dialog, _ -> dialog.dismiss() }
            .show()
    }

    private fun showAcceptedSnackbar(watchUser: WatchUser) {
        setLoading(false)
        Snackbar.make(
            binding.root,
            getString(R.string.watch_request_accepted_full_access, displayName(watchUser)),
            Snackbar.LENGTH_LONG
        )
            .setAction(R.string.watch_request_set_permissions) { openPermissionEditor(watchUser) }
            .show()
    }

    private fun openPermissionEditor(watchUser: WatchUser) {
        viewModel.setCurrentUser(watchUser)
        findNavController().navigate(
            WatchUserListFragmentDirections.actionWatchUserListFragmentToUserPermissionFragment()
        )
    }

    private fun displayName(watchUser: WatchUser): String {
        val user = watchUser.user
        val firstName = if (user?.has("firstName") == true) {
            user.getString("firstName")
        } else {
            getString(R.string.user_no_name)
        }
        val lastName = if (user?.has("lastName") == true) user.getString("lastName") else ""
        return getString(R.string.item_watch_name, firstName, lastName)
    }

    private fun setupEdgeToEdge() {
        Timber.d("WatchUserListFragment: setupEdgeToEdge")

        ViewCompat.setOnApplyWindowInsetsListener(binding.root) { _, windowInsets ->
            val systemBars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars())
            val displayCutout = windowInsets.getInsets(WindowInsetsCompat.Type.displayCutout())

            binding.appBar.setPadding(
                systemBars.left.coerceAtLeast(displayCutout.left),
                systemBars.top.coerceAtLeast(displayCutout.top),
                systemBars.right.coerceAtLeast(displayCutout.right),
                binding.appBar.paddingBottom
            )

            windowInsets
        }
    }

    private fun setupToolbar() {
        (activity as AppCompatActivity).setSupportActionBar(binding.toolbar)
        (activity as AppCompatActivity).supportActionBar?.apply {
            title = getString(R.string.request_and_permission_app_bar_title)
            setDisplayShowTitleEnabled(true)
            setDisplayHomeAsUpEnabled(true)
            setDisplayShowHomeEnabled(true)
        }
        setHasOptionsMenu(true)
    }

    companion object {
        private const val LIST_CHILD = 0
        private const val EMPTY_STATE_CHILD = 1
    }
}
