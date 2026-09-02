package com.sosmartlabs.momo.myfriends

import android.annotation.SuppressLint
import android.app.Activity
import android.app.ProgressDialog
import android.os.Build
import android.os.Bundle
import android.view.View
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.recyclerview.widget.LinearLayoutManager
import com.google.android.material.snackbar.Snackbar
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.ActivityMyFriendsBinding
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.myfriends.model.WatchWearer
import com.sosmartlabs.momo.myfriends.ui.MyFriendsViewModel
import com.sosmartlabs.momo.myfriends.ui.adapters.AcceptedWatchWearerAdapter
import com.sosmartlabs.momo.myfriends.ui.adapters.PendingWatchWearerAdapter
import com.sosmartlabs.momo.myfriends.ui.dialogs.AddFriendTutorialDialogFragment
import com.sosmartlabs.momo.myfriends.ui.dialogs.ConfirmDeleteFriendDialogFragment
import com.sosmartlabs.momo.myfriends.ui.itemcallbacks.AcceptedWatchWearerItemCallback
import com.sosmartlabs.momo.myfriends.ui.itemcallbacks.PendingWatchWearerItemCallback
import com.sosmartlabs.momo.utils.Constants
import com.sosmartlabs.momo.utils.EdgeToEdgeUtils
import com.sosmartlabs.momo.utils.Resource
import com.sosmartlabs.momo.utils.ui.toolbar.ToolbarConstructor
import com.sosmartlabs.momo.utils.ui.toolbar.ToolbarNavigationType
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber
import javax.inject.Inject

/**
 * Activity for Watch Friends
 */
@AndroidEntryPoint
class MyFriendsActivity : AppCompatActivity() {
    @Inject lateinit var toolbarConstructor: ToolbarConstructor

    /**
     * ViewBinding for this activity
     */
    private lateinit var binding: ActivityMyFriendsBinding

    /**
     * ViewModel for this activity
     */
    private val viewModel: MyFriendsViewModel by viewModels()

    /**
     * Id of the watch
     */
    private var watch: Wearer? = null

    /**
     * Adapter for showing the pending friend request on a RecyclerView
     */
    private lateinit var pendingFriendsAdapter: PendingWatchWearerAdapter

    /**
     * Adapter for showing the accepted friend request on a RecyclerView
     */
    private lateinit var acceptedFriendsAdapter: AcceptedWatchWearerAdapter

    /**
     * ProgressDialog for showing loading status
     */
    private lateinit var progressDialog: ProgressDialog

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)

        watch = intent.getParcelableExtra(Constants.EXTRA_WATCH)
        if (watch == null) {
            setResult(Activity.RESULT_CANCELED)
            finish()
        }

        binding = ActivityMyFriendsBinding.inflate(layoutInflater)
        setContentView(binding.root)

        toolbarConstructor
            .setNavigationOnClick(ToolbarNavigationType.SUPPORT_FINISH_AFTER_TRANSITION)
            .setErrorName("MyFriendsActivity")
            .build()

        binding.howToAddFriendsButton.setOnClickListener {
            AddFriendTutorialDialogFragment().show(supportFragmentManager, "Add friends tutorial")
        }

        setupEdgeToEdge()
        progressDialog = ProgressDialog(this)

        initRecyclerViews()
        observeViewModel()
    }

    /**
     * Init the RecyclerViews logic
     */
    private fun initRecyclerViews() {
        pendingFriendsAdapter = PendingWatchWearerAdapter(watch!!.objectId,
            PendingWatchWearerItemCallback(),
            object: PendingWatchWearerAdapter.PendingRequestsActionListener {
                override fun onAcceptRequest(request: WatchWearer) {
                    Timber.d("Accepting request")
                    viewModel.acceptFriendRequest(request)
                }

                override fun onRejectRequest(request: WatchWearer) {
                    launchConfirmDeleteRequest(request, "Confirm delete pending") {
                        Timber.d("Rejecting request")
                        viewModel.rejectFriendRequest(request)
                    }
                }

            })
        binding.pendingFriendRequests.apply {
            adapter = pendingFriendsAdapter
            layoutManager = LinearLayoutManager(this@MyFriendsActivity)
        }

        acceptedFriendsAdapter = AcceptedWatchWearerAdapter(watch!!.objectId,
            AcceptedWatchWearerItemCallback(),
            object: AcceptedWatchWearerAdapter.AcceptedRequestsActionListener {
                override fun onDeleteRequest(item: WatchWearer) {
                    launchConfirmDeleteRequest(item, "Confirm delete accepted") {
                        progressDialog.apply {
                            setMessage(getString(R.string.loading))
                            show()
                        }
                        Timber.d("Deleting request")
                        viewModel.deleteAcceptedFriend(item)
                    }
                }

            }, viewModel.isAdmin(watch!!))
        binding.acceptedFriendRequests.apply {
            adapter = acceptedFriendsAdapter
            layoutManager = LinearLayoutManager(this@MyFriendsActivity)
        }
    }

    /**
     * Launches a dialog for confirm the deletion of a friend
     * @param request Friend to confirm deletion
     * @param tag Tag for launching dialog fragment
     * @param onDeleteListener Listener for delete confirmation in dialog
     */
    private fun launchConfirmDeleteRequest(request: WatchWearer, tag: String,
                                           onDeleteListener: () -> Unit) {
        val otherWatch = if (request.watch1.objectId != watch!!.objectId)
            request.watch1
        else
            request.watch2

        ConfirmDeleteFriendDialogFragment(otherWatch.name(),
            object: ConfirmDeleteFriendDialogFragment.ConfirmDeleteDialogListener {
                override fun onDelete() {
                    onDeleteListener()
                }

            }).show(supportFragmentManager, tag)
    }

    override fun onResume() {
        super.onResume()
        viewModel.loadFriends(watch!!)
    }

    /**
     * Observes the ViewModel and reacts to changes
     */
    private fun observeViewModel() {
        viewModel.showFriendsList.observe(this) { show ->
            if (show && binding.myFriendsViewSwitcher.nextView == binding.friendsLayout ||
                !show && binding.myFriendsViewSwitcher.nextView == binding.noFriendsLayout) {
                binding.myFriendsViewSwitcher.showNext()
                progressDialog.dismiss()
            }
        }

        viewModel.pendingRequests.observe(this) {
            when(it.status) {
                Resource.Status.LOADING -> {
                    Timber.d("loading")
                    showProgressDialog(R.string.my_friends_loading)
                }
                Resource.Status.LOAD_SUCCESS, Resource.Status.UPDATING_SUCCESS -> {
                    updatePendingRequests(it.data!!)
                }
                Resource.Status.DELETING_SUCCESS -> {
                    updatePendingRequests(it.data!!)
                    showSnackbar(R.string.my_friends_request_rejected)
                }
                Resource.Status.LOAD_ERROR -> {
                    Timber.d("Load error")
                    progressDialog.dismiss()
                    showSnackbar(R.string.my_friends_loading_error)
                }
                else -> {}
            }
        }

        viewModel.acceptedRequests.observe(this) {
            when(it.status) {
                Resource.Status.LOAD_SUCCESS -> {
                    updateAcceptedRequests(it.data!!)
                }
                Resource.Status.UPDATING_SUCCESS-> {
                    updateAcceptedRequests(it.data!!)
                    showSnackbar(R.string.my_friends_request_approved)
                }

                Resource.Status.DELETING_SUCCESS -> {
                    updateAcceptedRequests(it.data!!)
                    showSnackbar(R.string.my_friends_friend_removed)
                }
                else -> {}
            }
        }

        viewModel.currentRequest.observe(this) {
            when(it.status) {
                Resource.Status.UPDATING -> {
                    showProgressDialog(R.string.my_friends_confirm_request)
                    Timber.d("updating")
                }
                Resource.Status.UPDATING_SUCCESS -> {
                    progressDialog.dismiss()
                    showSnackbar(R.string.my_friends_request_approved)
                    pendingFriendsAdapter.notifyItemChanged(pendingFriendsAdapter.currentList.indexOf(it.data))
                }
                Resource.Status.UPDATING_ERROR -> {
                    progressDialog.dismiss()
                    showSnackbar(R.string.my_friends_confirm_error)
                    Timber.d("Updating error")
                }
                Resource.Status.DELETING -> {
                    showProgressDialog(R.string.my_friends_removing_friend)
                    Timber.d("removing")
                }
                Resource.Status.DELETING_ERROR -> {
                    progressDialog.dismiss()
                    showSnackbar(R.string.my_friends_remove_error)
                    Timber.d("deleting error")
                }
                else -> {}
            }
        }
    }

    private fun updatePendingRequests(requests: List<WatchWearer>) {
        progressDialog.dismiss()
        pendingFriendsAdapter.submitList(requests)

        if ((requests.isEmpty() &&
                    binding.pendingFriendRequestsSwitcher.nextView == binding.noPendingFriendRequestCardView) ||
            (requests.isNotEmpty() &&
                    binding.pendingFriendRequestsSwitcher.nextView == binding.pendingFriendRequests)) {
            binding.pendingFriendRequestsSwitcher.showNext()
        }
    }

    private fun updateAcceptedRequests(requests: List<WatchWearer>) {
        progressDialog.dismiss()
        acceptedFriendsAdapter.submitList(requests)

        if ((requests.isEmpty() &&
                    binding.acceptedFriendRequestsSwitcher.nextView == binding.noAcceptedFriendRequestsCardView) ||
            (requests.isNotEmpty() &&
                    binding.acceptedFriendRequestsSwitcher.nextView == binding.acceptedFriendRequests)) {
            binding.acceptedFriendRequestsSwitcher.showNext()
        }
    }

    /**
     * Shows a progress dialog with the given message
     * @param messageRes Resource Id for the message to show with the progress dialog
     */
    private fun showProgressDialog(messageRes: Int) {
        progressDialog.apply {
            setMessage(getString(messageRes))
            show()
        }
    }

    /**
     * Shows a Snackbar to the user.
     * @param messageId String id for the message to show
     */
    private fun showSnackbar(messageId: Int) {
        Snackbar.make(binding.container, messageId, Snackbar.LENGTH_LONG).apply {
            view.setBackgroundColor(ContextCompat.getColor(this@MyFriendsActivity, R.color.colorPrimary))
            show()
        }
    }

    private fun setupEdgeToEdge() {
        Timber.d("MyFriendsActivity: setupEdgeToEdge")

        // Set dark status bar appearance (colorPrimary is dark purple)
        WindowCompat.getInsetsController(window, window.decorView).isAppearanceLightStatusBars = false

        ViewCompat.setOnApplyWindowInsetsListener(binding.container) { view, windowInsets ->
            val systemBars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars())
            val displayCutout = windowInsets.getInsets(WindowInsetsCompat.Type.displayCutout())
            val navigationBars = windowInsets.getInsets(WindowInsetsCompat.Type.navigationBars())

            Timber.d("MyFriendsActivity: systemBars $systemBars")
            Timber.d("MyFriendsActivity: displayCutout $displayCutout")
            Timber.d("MyFriendsActivity: navigationBars $navigationBars")

            // Apply top padding to AppBarLayout to extend colorPrimary background into status bar area
            binding.appBar.setPadding(
                systemBars.left.coerceAtLeast(displayCutout.left),
                systemBars.top.coerceAtLeast(displayCutout.top),
                systemBars.right.coerceAtLeast(displayCutout.right),
                binding.appBar.paddingBottom
            )

            // Apply bottom insets conditionally based on navigation type
            val shouldApplyBottomInsets = EdgeToEdgeUtils.hasButtonNavigation(applicationContext)
            val bottomPadding = if (shouldApplyBottomInsets) {
                navigationBars.bottom.coerceAtLeast(displayCutout.bottom)
            } else {
                0
            }

            Timber.d("MyFriendsActivity: shouldApplyBottomInsets $shouldApplyBottomInsets, bottomPadding $bottomPadding")

            // Apply bottom padding to ViewSwitcher for navigation bar
            binding.myFriendsViewSwitcher.setPadding(
                binding.myFriendsViewSwitcher.paddingLeft,
                binding.myFriendsViewSwitcher.paddingTop,
                binding.myFriendsViewSwitcher.paddingRight,
                bottomPadding
            )

            windowInsets
        }
    }
}