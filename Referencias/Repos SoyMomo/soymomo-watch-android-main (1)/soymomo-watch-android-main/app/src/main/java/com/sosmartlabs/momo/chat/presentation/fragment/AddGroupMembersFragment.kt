package com.sosmartlabs.momo.chat.presentation.fragment

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.appcompat.widget.SearchView
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.fragment.app.viewModels
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.findNavController
import androidx.navigation.fragment.navArgs
import androidx.recyclerview.widget.LinearLayoutManager
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.chat.presentation.adapter.MemberSelectionAdapter
import com.sosmartlabs.momo.chat.presentation.adapter.MemberSelectionListBuilder
import com.sosmartlabs.momo.chat.presentation.adapter.SelectedMemberChipAdapter
import com.sosmartlabs.momo.chat.presentation.model.MemberAvailabilityState
import com.sosmartlabs.momo.chat.presentation.model.MemberItem
import com.sosmartlabs.momo.chat.presentation.viewmodel.AddGroupMembersViewModel
import com.sosmartlabs.momo.chat.presentation.viewmodel.SharedChatListViewModel
import com.sosmartlabs.momo.databinding.ChatAddGroupMembersFragmentBinding
import com.sosmartlabs.momo.utils.ui.setupFragmentEdgeToEdge
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import timber.log.Timber

/**
 * Fragment for adding members to an existing group.
 * This is different from AddMembersFragment which is used for creating new groups.
 */
@AndroidEntryPoint
class AddGroupMembersFragment : Fragment() {

    private var _binding: ChatAddGroupMembersFragmentBinding? = null
    private val binding get() = _binding!!
    
    private val sharedViewModel: SharedChatListViewModel by activityViewModels()
    private val viewModel: AddGroupMembersViewModel by viewModels()
    private val args: AddGroupMembersFragmentArgs by navArgs()
    
    private lateinit var adapter: MemberSelectionAdapter
    private lateinit var selectedChipAdapter: SelectedMemberChipAdapter
    private val selectedMembers = mutableMapOf<String, MemberItem>()
    private var allMembers: List<MemberItem> = emptyList()
    private var availabilityState: MemberAvailabilityState = MemberAvailabilityState.AVAILABLE
    private var currentQuery: String = ""

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        Timber.d("AddGroupMembersFragment: onCreateView")
        _binding = ChatAddGroupMembersFragmentBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Timber.d("AddGroupMembersFragment: onViewCreated with groupId=${args.groupId}")
        
        setupFragmentEdgeToEdge(binding.appBarLayout)
        setupToolbar()
        setupRecyclerView()
        setupSearchView()
        setupClickListeners()
        setupObservers()
        updateSelectionUI()
        loadGroup()
    }

    private fun setupToolbar() {
        binding.toolbar.setNavigationOnClickListener {
            Timber.d("AddGroupMembersFragment: Back button clicked")
            findNavController().navigateUp()
        }
    }

    private fun setupRecyclerView() {
        Timber.d("AddGroupMembersFragment: setupRecyclerView")
        adapter = MemberSelectionAdapter { member, isSelected ->
            onMemberToggled(member, isSelected)
        }
        selectedChipAdapter = SelectedMemberChipAdapter(
            onRemoveClick = { member -> onSelectedChipRemoved(member) },
            compact = true
        )
        
        binding.membersRecyclerView.apply {
            layoutManager = LinearLayoutManager(requireContext())
            adapter = this@AddGroupMembersFragment.adapter
        }
        binding.selectedMembersRecyclerView.apply {
            layoutManager = LinearLayoutManager(requireContext(), LinearLayoutManager.HORIZONTAL, false)
            adapter = selectedChipAdapter
        }
    }

    private fun setupSearchView() {
        binding.searchView.setOnQueryTextListener(object : SearchView.OnQueryTextListener {
            override fun onQueryTextSubmit(query: String?): Boolean = false

            override fun onQueryTextChange(newText: String?): Boolean {
                // SearchView forwards its EditText's TextWatcher here, and the IME
                // commits text through a runnable posted to the main looper, so a
                // change can land after onDestroyView has nulled _binding (same
                // race as UnifiedChatFragment's watcher, #277). Guard before the
                // currentQuery write so dead-view input can't leak into it.
                if (_binding == null) return true
                currentQuery = newText.orEmpty()
                Timber.d("AddGroupMembersFragment: Search query changed: $currentQuery")
                filterMembers()
                return true
            }
        })
    }

    private fun setupClickListeners() {
        binding.addButton.setOnClickListener {
            Timber.d("AddGroupMembersFragment: Add button clicked")
            addSelectedMembers()
        }
    }

    private fun onMemberToggled(member: MemberItem, isSelected: Boolean) {
        Timber.d("AddGroupMembersFragment: Member ${member.name} toggled: $isSelected")

        if (isSelected) {
            selectedMembers[member.id] = member.copy(isSelected = true)
        } else {
            selectedMembers.remove(member.id)
        }

        allMembers = allMembers.map {
            if (it.id == member.id) it.copy(isSelected = isSelected) else it
        }

        filterMembers()
        updateSelectionUI()
    }

    private fun onSelectedChipRemoved(member: MemberItem) {
        Timber.d("AddGroupMembersFragment: Selected chip removed for ${member.name}")
        selectedMembers.remove(member.id)
        allMembers = allMembers.map {
            if (it.id == member.id) it.copy(isSelected = false) else it
        }
        filterMembers()
        updateSelectionUI()
    }

    private fun updateSelectionUI() {
        val count = selectedMembers.size
        selectedChipAdapter.submitList(selectedMembers.values.toList())
        binding.selectedMembersRecyclerView.visibility = if (count > 0) View.VISIBLE else View.GONE
        binding.selectedCountTextView.text = getString(R.string.selected_count, count)
        binding.addButton.isEnabled = count > 0
    }

    private fun addSelectedMembers() {
        if (selectedMembers.isEmpty()) {
            Timber.w("AddGroupMembersFragment: No members selected")
            return
        }
        
        val membersToAdd = selectedMembers.values.map { 
            Pair(it.id, it.isWearer)
        }
        
        Timber.d("AddGroupMembersFragment: Adding ${membersToAdd.size} members to group")
        viewModel.addMembersToGroup(membersToAdd)
    }

    private fun setupObservers() {
        // Observe available members
        viewModel.availableMembers.observe(viewLifecycleOwner) { members ->
            Timber.d("AddGroupMembersFragment: Received ${members.size} available members from ViewModel")
            allMembers = members.map { member ->
                member.copy(isSelected = selectedMembers[member.id]?.isSelected ?: false)
            }
            filterMembers()
        }

        // Observe loading state
        viewModel.isLoading.observe(viewLifecycleOwner) { isLoading ->
            Timber.d("AddGroupMembersFragment: Loading state: $isLoading")
            updateLoadingState(isLoading)
        }

        viewModel.availabilityState.observe(viewLifecycleOwner) { state ->
            availabilityState = state
            filterMembers()
        }

        // Observe errors
        viewModel.error.observe(viewLifecycleOwner) { error ->
            error?.let {
                Timber.e("AddGroupMembersFragment: Error from ViewModel: $it")
                Toast.makeText(requireContext(), it, Toast.LENGTH_SHORT).show()
                viewModel.clearError()
            }
        }

        // Observe add members success
        viewModel.addMembersSuccess.observe(viewLifecycleOwner) { success ->
            success?.let {
                if (it) {
                    Timber.d("AddGroupMembersFragment: Members added successfully")
                    Toast.makeText(
                        requireContext(), 
                        R.string.add_members_success, 
                        Toast.LENGTH_SHORT
                    ).show()
                    findNavController().navigateUp()
                }
                viewModel.clearAddMembersSuccess()
            }
        }
    }

    private fun updateLoadingState(isLoading: Boolean) {
        binding.loadingSpinner.visibility = if (isLoading && allMembers.isEmpty()) View.VISIBLE else View.GONE
        binding.loadingOverlay.visibility = if (isLoading && allMembers.isNotEmpty()) View.VISIBLE else View.GONE
        if (isLoading && allMembers.isEmpty()) {
            binding.emptyTextView.visibility = View.GONE
            binding.membersRecyclerView.visibility = View.GONE
        } else if (!isLoading) {
            filterMembers()
        }
    }

    private fun updateEmptyState(filteredMembers: List<MemberItem>) {
        val isEmpty = filteredMembers.isEmpty()
        binding.emptyTextView.text = when {
            currentQuery.isNotBlank() -> getString(R.string.no_members_match, currentQuery)
            availabilityState == MemberAvailabilityState.NO_COMPATIBLE_WATCHES ->
                getString(R.string.group_chat_requires_space4)
            else -> getString(R.string.no_members_available)
        }
        binding.emptyTextView.visibility = if (isEmpty) View.VISIBLE else View.GONE
        binding.membersRecyclerView.visibility = if (isEmpty) View.GONE else View.VISIBLE
    }

    private fun loadGroup() {
        Timber.d("AddGroupMembersFragment: Loading group ${args.groupId}")
        
        lifecycleScope.launch {
            val group = viewModel.loadGroup(args.groupId)
            if (group != null) {
                // Now load available members
                sharedViewModel.watchUsers.observe(viewLifecycleOwner) { watchUsers ->
                    Timber.d("AddGroupMembersFragment: Loading members for ${watchUsers.size} watch users")
                    viewModel.loadAvailableMembers(watchUsers)
                }
            } else {
                Timber.e("AddGroupMembersFragment: Failed to load group")
                Toast.makeText(
                    requireContext(),
                    R.string.error_loading_group,
                    Toast.LENGTH_SHORT
                ).show()
                findNavController().navigateUp()
            }
        }
    }

    private fun filterMembers() {
        val watchLabel = getString(R.string.group_member_type_wearer)
        val parentLabel = getString(R.string.group_member_type_parent)
        val filtered = MemberSelectionListBuilder.filterMembers(
            members = allMembers,
            query = currentQuery,
            watchLabel = watchLabel,
            parentLabel = parentLabel,
        )
        val rows = MemberSelectionListBuilder.build(
            members = allMembers,
            query = currentQuery,
            watchLabel = watchLabel,
            parentLabel = parentLabel,
            watchesTitle = getString(R.string.member_section_watches),
            parentsTitle = getString(R.string.member_section_parents),
        )
        adapter.submitList(rows)
        updateEmptyState(filtered)
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
