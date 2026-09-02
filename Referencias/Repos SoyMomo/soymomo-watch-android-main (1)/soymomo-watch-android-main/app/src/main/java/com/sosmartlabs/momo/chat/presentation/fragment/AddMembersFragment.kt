package com.sosmartlabs.momo.chat.presentation.fragment

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.appcompat.widget.SearchView
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.chat.presentation.adapter.MemberSelectionAdapter
import com.sosmartlabs.momo.chat.presentation.adapter.MemberSelectionListBuilder
import com.sosmartlabs.momo.chat.presentation.adapter.SelectedMemberChipAdapter
import com.sosmartlabs.momo.chat.presentation.model.MemberAvailabilityState
import com.sosmartlabs.momo.chat.presentation.model.MemberItem
import com.sosmartlabs.momo.chat.presentation.viewmodel.AddMembersViewModel
import com.sosmartlabs.momo.chat.presentation.viewmodel.SharedChatListViewModel
import com.sosmartlabs.momo.databinding.ChatAddMembersFragmentBinding
import com.sosmartlabs.momo.utils.ui.setupFragmentEdgeToEdge
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber

@AndroidEntryPoint
class AddMembersFragment : Fragment() {

    private var _binding: ChatAddMembersFragmentBinding? = null
    private val binding get() = _binding!!
    
    private val sharedViewModel: SharedChatListViewModel by activityViewModels()
    private val viewModel: AddMembersViewModel by viewModels()
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
        Timber.d("AddMembersFragment: onCreateView")
        _binding = ChatAddMembersFragmentBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Timber.d("AddMembersFragment: onViewCreated")
        
        setupFragmentEdgeToEdge(binding.appBarLayout)
        setupToolbar()
        setupRecyclerView()
        setupSearchView()
        setupClickListeners()
        setupObservers()
        updateSelectionUI()
        loadMembers()
    }

    private fun setupToolbar() {
        binding.toolbar.setNavigationOnClickListener {
            Timber.d("AddMembersFragment: Back button clicked")
            findNavController().navigateUp()
        }
    }

    private fun setupRecyclerView() {
        Timber.d("AddMembersFragment: setupRecyclerView")
        adapter = MemberSelectionAdapter { member, isSelected ->
            onMemberToggled(member, isSelected)
        }
        selectedChipAdapter = SelectedMemberChipAdapter(
            onRemoveClick = { member -> onSelectedChipRemoved(member) },
            compact = true
        )
        
        binding.membersRecyclerView.apply {
            layoutManager = LinearLayoutManager(requireContext())
            adapter = this@AddMembersFragment.adapter
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
                Timber.d("AddMembersFragment: Search query changed: $currentQuery")
                filterMembers()
                return true
            }
        })
    }

    private fun setupClickListeners() {
        binding.nextButton.setOnClickListener {
            Timber.d("AddMembersFragment: Next button clicked")
            if (validateSelection()) {
                navigateToCreateGroup()
            }
        }
    }

    private fun onMemberToggled(member: MemberItem, isSelected: Boolean) {
        Timber.d("AddMembersFragment: Member ${member.name} toggled: $isSelected")

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
        Timber.d("AddMembersFragment: Selected chip removed for ${member.name}")
        selectedMembers.remove(member.id)
        allMembers = allMembers.map {
            if (it.id == member.id) it.copy(isSelected = false) else it
        }
        filterMembers()
        updateSelectionUI()
    }

    private fun updateSelectionUI() {
        val count = selectedMembers.size
        val hasWearer = selectedMembers.values.any { it.isWearer }
        val selectedList = selectedMembers.values.toList()
        
        selectedChipAdapter.submitList(selectedList)
        binding.selectedMembersRecyclerView.visibility = if (count > 0) View.VISIBLE else View.GONE
        binding.selectedCountTextView.text = getString(R.string.selected_count, count)
        binding.nextButton.isEnabled = count > 0 && hasWearer
        
        if (count > 0 && !hasWearer) {
            binding.validationMessageTextView.visibility = View.VISIBLE
            binding.validationMessageTextView.text = getString(com.sosmartlabs.momo.R.string.error_at_least_one_wearer)
        } else {
            binding.validationMessageTextView.visibility = View.GONE
        }
    }

    private fun validateSelection(): Boolean {
        val hasWearer = selectedMembers.values.any { it.isWearer }
        if (!hasWearer) {
            Timber.w("AddMembersFragment: No wearer selected")
            return false
        }
        return selectedMembers.isNotEmpty()
    }

    private fun navigateToCreateGroup() {
        val memberIds = selectedMembers.keys.toTypedArray()
        val memberIsWearer = selectedMembers.values.map { it.isWearer }.toBooleanArray()
        
        Timber.d("AddMembersFragment: Navigating to CreateGroup with ${memberIds.size} members")
        findNavController().navigate(
            AddMembersFragmentDirections.actionAddMembersToCreateGroup(
                selectedMemberIds = memberIds,
                selectedMemberIsWearer = memberIsWearer
            )
        )
    }

    private fun setupObservers() {
        // Observe ViewModel members data
        viewModel.members.observe(viewLifecycleOwner) { members ->
            Timber.d("AddMembersFragment: Received ${members.size} members from ViewModel")
            // Preserve selection state when updating members
            allMembers = members.map { member ->
                member.copy(isSelected = selectedMembers[member.id]?.isSelected ?: false)
            }
            filterMembers()
        }

        // Observe loading state
        viewModel.isLoading.observe(viewLifecycleOwner) { isLoading ->
            Timber.d("AddMembersFragment: Loading state: $isLoading")
            updateLoadingState(isLoading)
        }

        viewModel.availabilityState.observe(viewLifecycleOwner) { state ->
            availabilityState = state
            filterMembers()
        }

        // Observe errors
        viewModel.error.observe(viewLifecycleOwner) { error ->
            error?.let {
                Timber.e("AddMembersFragment: Error from ViewModel: $it")
                // You can show an error message to the user here if needed
                viewModel.clearError()
            }
        }
    }

    private fun updateLoadingState(isLoading: Boolean) {
        binding.loadingSpinner.visibility = if (isLoading) View.VISIBLE else View.GONE
        if (isLoading) {
            binding.emptyTextView.visibility = View.GONE
            binding.membersRecyclerView.visibility = View.GONE
        } else {
            filterMembers()
        }
    }

    private fun loadMembers() {
        sharedViewModel.watchUsers.observe(viewLifecycleOwner) { watchUsers ->
            Timber.d("AddMembersFragment: Loading members for ${watchUsers.size} watch users")
            viewModel.loadMembers(watchUsers)
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

    private fun updateEmptyState(filteredMembers: List<MemberItem>) {
        val isEmpty = filteredMembers.isEmpty()
        binding.emptyTextView.text = when {
            currentQuery.isNotBlank() -> getString(R.string.no_members_match, currentQuery)
            availabilityState == MemberAvailabilityState.NO_COMPATIBLE_WATCHES ->
                getString(R.string.group_chat_requires_space4)
            else -> getString(R.string.no_members_available_for_group)
        }
        binding.emptyTextView.visibility = if (isEmpty) View.VISIBLE else View.GONE
        binding.membersRecyclerView.visibility = if (isEmpty) View.GONE else View.VISIBLE
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
