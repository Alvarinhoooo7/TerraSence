package com.sosmartlabs.momo.chat.presentation.fragment

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.appcompat.widget.SearchView
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import com.sosmartlabs.momo.models.WatchUser
import androidx.recyclerview.widget.LinearLayoutManager
import com.sosmartlabs.momo.chat.presentation.adapter.ContactSelectionAdapter
import android.net.Uri
import com.google.android.material.snackbar.Snackbar
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.chat.presentation.model.ContactItem
import com.sosmartlabs.momo.chat.presentation.viewmodel.NewChatViewModel
import com.sosmartlabs.momo.chat.presentation.viewmodel.SharedChatListViewModel
import com.sosmartlabs.momo.databinding.ChatNewFragmentBinding
import com.sosmartlabs.momo.utils.ui.setupFragmentEdgeToEdge
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber

@AndroidEntryPoint
class NewChatFragment : Fragment() {

    private var _binding: ChatNewFragmentBinding? = null
    private val binding get() = _binding!!

    private val viewModel: NewChatViewModel by viewModels()
    private val sharedViewModel: SharedChatListViewModel by activityViewModels()
    private lateinit var adapter: ContactSelectionAdapter
    private var allContacts: List<ContactItem> = emptyList()

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        Timber.d("NewChatFragment: onCreateView")
        _binding = ChatNewFragmentBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Timber.d("NewChatFragment: onViewCreated")
        
        setupEdgeToEdge()
        setupToolbar()
        setupRecyclerView()
        setupSearchView()
        setupObservers()
        
        // Load available contacts from shared ViewModel
        sharedViewModel.watchUsers.observe(viewLifecycleOwner) { watchUsers ->
            if (watchUsers.isNotEmpty()) {
                viewModel.loadAvailableContacts(watchUsers)
            }
        }
    }

    private fun setupEdgeToEdge() {
        setupFragmentEdgeToEdge(binding.appBarLayout)
    }

    private fun setupToolbar() {
        binding.toolbar.setNavigationOnClickListener {
            Timber.d("NewChatFragment: Back button clicked")
            findNavController().navigateUp()
        }
    }

    private fun setupRecyclerView() {
        Timber.d("NewChatFragment: setupRecyclerView")
        adapter = ContactSelectionAdapter(
            onNewGroupClick = {
                Timber.d("NewChatFragment: New Group clicked")
                // Check if user has Space 4 watches
                val hasSpace4 = sharedViewModel.watchUsers.value?.let { hasSpace4Watches(it) } ?: false
                if (hasSpace4) {
                    findNavController().navigate(
                        NewChatFragmentDirections.actionNewChatToAddMembers()
                    )
                } else {
                    // Show snackbar explaining the feature is only available for Space 4
                    Snackbar.make(
                        binding.root,
                        R.string.error_group_feature_space4_only,
                        Snackbar.LENGTH_LONG
                    ).setAction(R.string.button_buy_now) {
                        // Open website to buy Space 4
                        val browserIntent = Intent(Intent.ACTION_VIEW, Uri.parse("http://www.soymomo.com/"))
                        startActivity(browserIntent)
                    }.show()
                }
            },
            onContactClick = { contact ->
                Timber.d("NewChatFragment: Contact clicked: ${contact.name}")
                contact.wearer?.let { wearer ->
                    findNavController().navigate(
                        NewChatFragmentDirections.actionNewChatToUnifiedChat(
                            wearer = wearer,
                            groupId = null,
                            groupName = null
                        )
                    )
                }
            }
        )
        
        binding.contactsRecyclerView.apply {
            layoutManager = LinearLayoutManager(requireContext())
            adapter = this@NewChatFragment.adapter
        }
    }

    private fun setupSearchView() {
        binding.searchView.setOnQueryTextListener(object : SearchView.OnQueryTextListener {
            override fun onQueryTextSubmit(query: String?): Boolean {
                return false
            }

            override fun onQueryTextChange(newText: String?): Boolean {
                // SearchView forwards its EditText's TextWatcher here, and the IME
                // commits text through a runnable posted to the main looper, so a
                // change can land after onDestroyView (same race as
                // UnifiedChatFragment's watcher, #277). filterContacts touches no
                // binding, but its getString throws once the pop has detached us.
                if (_binding == null) return true
                Timber.d("NewChatFragment: Search query changed: $newText")
                filterContacts(newText ?: "")
                return true
            }
        })
    }

    private fun setupObservers() {
        Timber.d("NewChatFragment: setupObservers")
        
        viewModel.availableContacts.observe(viewLifecycleOwner) { contacts ->
            Timber.d("NewChatFragment: Received ${contacts.size} contacts")
            allContacts = contacts
            val items = mutableListOf<ContactItem>()
            val newGroupLabel = getString(R.string.chat_list_new_group)
            
            // Check if user has Space 4 watches
            val hasSpace4 = sharedViewModel.watchUsers.value?.let { hasSpace4Watches(it) } ?: false
            
            // Always add the group-header row, but disable it if there are no Space 4 watches
            items.add(ContactItem.Header(newGroupLabel, enabled = hasSpace4))
            items.addAll(contacts)
            adapter.submitList(items)
        }
        
        viewModel.isLoading.observe(viewLifecycleOwner) { isLoading ->
            Timber.d("NewChatFragment: Loading state = $isLoading")
            // Note: No loading indicator in current layout
            // Could add ProgressBar to layout if needed in future
        }
    }

    private fun hasSpace4Watches(watchUsers: List<WatchUser>): Boolean {
        return watchUsers.any { watchUser ->
            watchUser.watch?.model?.hasChatGroups() == true
        }
    }

    private fun filterContacts(query: String) {
        val filtered = if (query.isBlank()) {
            allContacts
        } else {
            allContacts.filter { contact ->
                when (contact) {
                    is ContactItem.Contact -> contact.name.contains(query, ignoreCase = true)
                    is ContactItem.Header -> false
                }
            }
        }
        
        val items = mutableListOf<ContactItem>()
        val hasSpace4 = sharedViewModel.watchUsers.value?.let { hasSpace4Watches(it) } ?: false
        items.add(ContactItem.Header(getString(R.string.chat_list_new_group), enabled = hasSpace4))
        items.addAll(filtered)
        adapter.submitList(items)
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
