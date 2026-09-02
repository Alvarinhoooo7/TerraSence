package com.sosmartlabs.momotabletpadres.contacts

import android.app.Activity
import android.os.Bundle
import android.view.View
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowInsetsControllerCompat
import androidx.core.view.isVisible
import androidx.lifecycle.lifecycleScope
import androidx.paging.LoadState
import androidx.recyclerview.widget.LinearLayoutManager
import com.sosmartlabs.momotabletpadres.contacts.model.ContactDetail
import com.sosmartlabs.momotabletpadres.contacts.ui.ContactToggleListener
import com.sosmartlabs.momotabletpadres.contacts.ui.ContactsViewModel
import com.sosmartlabs.momotabletpadres.contacts.ui.adapter.ContactsPagingAdapter
import com.sosmartlabs.momotabletpadres.databinding.ActivityContactsBinding
import com.sosmartlabs.momotabletpadres.utils.Resource
import com.sosmartlabs.momotabletpadres.utils.WindowInsetsUtils
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import timber.log.Timber

@AndroidEntryPoint
class ContactsActivity : AppCompatActivity(), ContactToggleListener {

    private lateinit var binding: ActivityContactsBinding
    private lateinit var contactsPagingAdapter: ContactsPagingAdapter
    private val contactsViewModel: ContactsViewModel by viewModels()
    private val updatingContactsOriginalState = mutableMapOf<String, Boolean>()
    private var tabletId: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        Timber.d("ContactsActivity: Step 1: onCreate() started")
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)

        Timber.d("ContactsActivity: Step 2: Retrieving tabletId from intent")
        tabletId = intent.getStringExtra("tabletId")
        if (tabletId == null) {
            Timber.e("ContactsActivity: Error: Missing required tabletId parameter in intent")
            CrashlyticsLog.log("ContactsActivity: Missing required tabletId parameter in intent")
            setResult(Activity.RESULT_CANCELED)
            finish()
            return
        }
        Timber.d("ContactsActivity: Step 3: Initializing with tabletId: $tabletId")

        Timber.d("ContactsActivity: Step 4: Inflating ActivityContactsBinding")
        binding = ActivityContactsBinding.inflate(layoutInflater)
        setContentView(binding.root)

        Timber.d("ContactsActivity: Step 5: Setting up toolbar")
        setupToolbar()
        Timber.d("ContactsActivity: Step 6: Setting up RecyclerView")
        setRecyclerView()

        WindowInsetsUtils.applyEdgeToEdgeInsets(
            root = binding.root,
            topView = binding.appBarLayout,
            bottomView = binding.contactsListRecyclerView,
        )

        Timber.d("ContactsActivity: Step 7: Setting up ViewModel observers")
        observeViewModel()

        Timber.d("ContactsActivity: Step 8: Setting tabletId in ViewModel")
        tabletId?.let { contactsViewModel.setTabletId(it) }

        Timber.d("ContactsActivity: Step 9: onCreate() completed")
    }

    private fun setupToolbar() {
        Timber.d("ContactsActivity: Step 1: Setting up toolbar")
        val toolbar = binding.toolbar
        try {
            setSupportActionBar(toolbar)
            supportActionBar?.apply {
                setDisplayHomeAsUpEnabled(true)
                setDisplayShowHomeEnabled(true)
                setDisplayShowTitleEnabled(false)
            }
            Timber.d("ContactsActivity: Step 2: Toolbar action bar configured")
            WindowInsetsControllerCompat(window, window.decorView).isAppearanceLightStatusBars = false
            WindowInsetsControllerCompat(window, window.decorView).isAppearanceLightNavigationBars = true
            toolbar.setNavigationOnClickListener {
                Timber.d("ContactsActivity: Step 3: Navigation back clicked")
                supportFinishAfterTransition()
            }
            Timber.d("ContactsActivity: Step 4: Toolbar setup completed")
        } catch (e: NullPointerException) {
            Timber.e(e, "ContactsActivity: Error: Failed to setup toolbar")
            CrashlyticsLog.recordException(e, "ContactsActivity: Toolbar setup failure")
        }
    }

    private fun setRecyclerView() {
        Timber.d("ContactsActivity: Step 1: Initializing ContactsPagingAdapter")
        contactsPagingAdapter = ContactsPagingAdapter(this, this)

        Timber.d("ContactsActivity: Step 2: Configuring RecyclerView")
        binding.contactsListRecyclerView.apply {
            adapter = contactsPagingAdapter
            layoutManager = LinearLayoutManager(this@ContactsActivity)
        }

        Timber.d("ContactsActivity: Step 3: Observing adapter load state")
        lifecycleScope.launch {
            contactsPagingAdapter.loadStateFlow.collectLatest { loadStates ->
                Timber.d("ContactsActivity: Step 4: Load states - refresh: ${loadStates.refresh}, append: ${loadStates.append}")

                // Show pagination progress bar when loading more items
                binding.paginationProgressBar.isVisible = loadStates.append is LoadState.Loading

                // Handle the main loading states
                when (loadStates.refresh) {
                    is LoadState.Loading -> {
                        Timber.d("ContactsActivity: Step 5: Showing initial loading state")
                        binding.viewFlipper.displayedChild = 0 // Loading
                    }
                    is LoadState.Error -> {
                        val error = (loadStates.refresh as LoadState.Error).error
                        Timber.e("ContactsActivity: Error: Error loading contacts: $error")
                        CrashlyticsLog.recordNonFatalError(error, "ContactsActivity: Error loading contacts in paging adapter")
                        binding.viewFlipper.displayedChild = 1 // Empty/Error
                    }
                    is LoadState.NotLoading -> {
                        if (contactsPagingAdapter.itemCount == 0) {
                            Timber.d("ContactsActivity: Step 6: No contacts found")
                            binding.viewFlipper.displayedChild = 1 // Empty
                        } else {
                            Timber.d("ContactsActivity: Step 7: Showing contacts list with ${contactsPagingAdapter.itemCount} items")
                            binding.viewFlipper.displayedChild = 2 // Content
                        }
                    }
                }
            }
        }

        Timber.d("ContactsActivity: Step 8: RecyclerView setup completed")
    }

    private fun observeViewModel() {
        Timber.d("ContactsActivity: Step 1: Setting up ViewModel observers")

        // Observe paging data
        Timber.d("ContactsActivity: Step 2: Observing contactsPagingData")
        lifecycleScope.launch {
            contactsViewModel.contactsPagingData.collectLatest { pagingData ->
                Timber.d("ContactsActivity: Step 3: Submitting paging data to adapter")
                contactsPagingAdapter.submitData(pagingData)
            }
        }

        // Observe update status
        Timber.d("ContactsActivity: Step 4: Observing updateStatus LiveData")
        contactsViewModel.updateStatus.observe(this) { resource ->
            Timber.d("ContactsActivity: Step 5: Received update status: ${resource.status}")

            when (resource.status) {
                Resource.Status.UPDATING_SUCCESS -> {
                    Timber.d("ContactsActivity: Step 6: Update success")
                    resource.data?.let { updatedContact ->
                        Timber.d("ContactsActivity: Step 7: Contact updated successfully: ${updatedContact.phone}")

                        // Remove from updating set
                        contactsPagingAdapter.updatingContacts.remove(updatedContact.phone)
                        updatingContactsOriginalState.remove(updatedContact.phone)

                        // Notify adapter of the specific item change
                        contactsPagingAdapter.notifyContactChanged(updatedContact.phone)

                        // Refresh the paging data to reflect the change
                        contactsPagingAdapter.refresh()
                        Timber.d("ContactsActivity: Step 8: Paging data refreshed after update")
                    } ?: run {
                        Timber.e("ContactsActivity: Error: updateStatus UPDATING_SUCCESS but data is null")
                        CrashlyticsLog.log("ContactsActivity: updateStatus UPDATING_SUCCESS but data is null")
                    }
                }

                Resource.Status.UPDATING_ERROR -> {
                    Timber.e("ContactsActivity: Error: Failed to update contact, reverting changes")
                    CrashlyticsLog.log("ContactsActivity: Failed to update contact, reverting changes")

                    // Revert all updating contacts
                    updatingContactsOriginalState.forEach { (phone, _) ->
                        Timber.d("ContactsActivity: Step 9: Reverting contact with phone: $phone")
                        contactsPagingAdapter.updatingContacts.remove(phone)
                        contactsPagingAdapter.notifyContactChanged(phone)
                    }
                    updatingContactsOriginalState.clear()

                    // Refresh to revert changes
                    contactsPagingAdapter.refresh()
                    Timber.d("ContactsActivity: Step 10: Paging data refreshed after error revert")
                }

                else -> {
                    Timber.d("ContactsActivity: Step 11: Update status ignored: ${resource.status}")
                }
            }
        }
    }

    override fun onContactAllowedStatusChanged(contact: ContactDetail, isAllowed: Boolean) {
        Timber.d("ContactsActivity: Step 1: Contact permission change requested - Phone: ${contact.phone}, Allow: $isAllowed")

        // Store original state
        Timber.d("ContactsActivity: Step 2: Storing original allowed state for phone: ${contact.phone} (was: ${contact.isAllowed})")
        updatingContactsOriginalState[contact.phone] = contact.isAllowed

        // Mark as updating
        Timber.d("ContactsActivity: Step 3: Marking contact as updating: ${contact.phone}")
        contactsPagingAdapter.updatingContacts.add(contact.phone)

        // Update the specific item
        Timber.d("ContactsActivity: Step 4: Notifying adapter of contact change: ${contact.phone}")
        contactsPagingAdapter.notifyContactChanged(contact.phone)

        tabletId?.let { id ->
            Timber.d("ContactsActivity: Step 5: Updating contact permission in ViewModel for phone: ${contact.phone}, tabletId: $id, isAllowed: $isAllowed")
            contactsViewModel.updateAllowedStatus(contact, id, isAllowed)
        } ?: run {
            Timber.e("ContactsActivity: Error: Cannot update contact - Missing tabletId")
            CrashlyticsLog.log("ContactsActivity: Cannot update contact - Missing tabletId")
        }
    }
}