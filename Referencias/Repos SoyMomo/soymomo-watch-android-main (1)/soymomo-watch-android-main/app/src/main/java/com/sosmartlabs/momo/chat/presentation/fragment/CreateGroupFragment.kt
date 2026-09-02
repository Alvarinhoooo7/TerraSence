package com.sosmartlabs.momo.chat.presentation.fragment

import android.app.AlertDialog
import android.net.Uri
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import androidx.navigation.fragment.navArgs
import androidx.recyclerview.widget.LinearLayoutManager
import com.bumptech.glide.Glide
import com.parse.ParseUser
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.chat.presentation.adapter.SelectedMemberChipAdapter
import com.sosmartlabs.momo.chat.presentation.model.MemberItem
import com.sosmartlabs.momo.chat.presentation.viewmodel.NewChatViewModel
import com.sosmartlabs.momo.databinding.ChatCreateGroupFragmentBinding
import com.sosmartlabs.momo.takepicture.TakePictureFragment
import com.sosmartlabs.momo.utils.ui.setupFragmentEdgeToEdge
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber
import java.io.File

@AndroidEntryPoint
class CreateGroupFragment : TakePictureFragment() {

    private var _binding: ChatCreateGroupFragmentBinding? = null
    private val binding get() = _binding!!

    private val viewModel: NewChatViewModel by viewModels()
    private val args: CreateGroupFragmentArgs by navArgs()
    
    private lateinit var chipAdapter: SelectedMemberChipAdapter
    private val selectedMembers = mutableListOf<MemberItem>()
    private var avatarImagePath: String? = null

    override val objectId: String?
        get() = "group_avatar"

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        Timber.d("CreateGroupFragment: onCreateView")
        _binding = ChatCreateGroupFragmentBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Timber.d("CreateGroupFragment: onViewCreated")
        
        setupFragmentEdgeToEdge(binding.appBarLayout)
        setupToolbar()
        setupRecyclerView()
        setupClickListeners()
        setupObservers()
        loadSelectedMembers()
    }

    private fun setupToolbar() {
        binding.toolbar.setNavigationOnClickListener {
            Timber.d("CreateGroupFragment: Back button clicked")
            findNavController().navigateUp()
        }
    }

    private fun setupRecyclerView() {
        Timber.d("CreateGroupFragment: setupRecyclerView")
        chipAdapter = SelectedMemberChipAdapter(
            onRemoveClick = { member -> onRemoveMember(member) }
        )
        
        binding.selectedMembersRecyclerView.apply {
            layoutManager = LinearLayoutManager(requireContext(), LinearLayoutManager.HORIZONTAL, false)
            adapter = chipAdapter
        }
    }

    private fun setupClickListeners() {
        binding.fabCreateGroup.setOnClickListener {
            Timber.d("CreateGroupFragment: Create button clicked")
            createGroup()
        }
        
        binding.avatarContainer.setOnClickListener {
            Timber.d("CreateGroupFragment: Avatar clicked")
            showImageSelectionDialog()
        }
    }

    private fun setupObservers() {
        // Observe selected members from ViewModel
        viewModel.selectedMembers.observe(viewLifecycleOwner) { members ->
            Timber.d("CreateGroupFragment: Received ${members.size} member details from ViewModel")
            selectedMembers.clear()
            selectedMembers.addAll(members)
            chipAdapter.submitList(selectedMembers.toList())
            updateMembersHeader()
        }

        // Observe loading state
        viewModel.isLoading.observe(viewLifecycleOwner) { isLoading ->
            Timber.d("CreateGroupFragment: Loading state: $isLoading")
            updateLoadingState(isLoading)
        }

        // Observe errors
        viewModel.error.observe(viewLifecycleOwner) { error ->
            error?.let {
                Timber.e("CreateGroupFragment: Error from ViewModel: $it")
                Toast.makeText(
                    requireContext(),
                    getString(R.string.chat_error_with_reason, it),
                    Toast.LENGTH_SHORT
                ).show()
                viewModel.clearError()
            }
        }

        // Observe group creation result
        viewModel.createdGroup.observe(viewLifecycleOwner) { group ->
            group?.let {
                Timber.d("CreateGroupFragment: Group created successfully: ${it.objectId}")
                val groupName = binding.groupNameEditText.text.toString().trim()
                findNavController().navigate(
                    CreateGroupFragmentDirections.actionCreateGroupToUnifiedChat(
                        wearer = null,
                        groupId = it.objectId ?: "",
                        groupName = groupName
                    )
                )
                viewModel.clearCreatedGroup()
            }
        }
    }

    private fun loadSelectedMembers() {
        Timber.d("CreateGroupFragment: Loading ${args.selectedMemberIds.size} selected members")
        viewModel.loadSelectedMembers(args.selectedMemberIds, args.selectedMemberIsWearer)
    }

    private fun updateLoadingState(isLoading: Boolean) {
        binding.fabCreateGroup.isEnabled = !isLoading
        binding.loadingOverlay.visibility = if (isLoading) View.VISIBLE else View.GONE
    }

    private fun onRemoveMember(member: MemberItem) {
        Timber.d("CreateGroupFragment: Attempt to remove member ${member.name}")
        
        // Check if trying to remove yourself (current user)
        val currentUserId = ParseUser.getCurrentUser().objectId
        if (member.id == currentUserId) {
            Timber.w("CreateGroupFragment: Cannot remove yourself from the group")
            Toast.makeText(
                requireContext(),
                R.string.error_cannot_remove_yourself,
                Toast.LENGTH_SHORT
            ).show()
            return
        }
        
        // Check if trying to remove the last wearer
        if (member.isWearer) {
            val wearerCount = selectedMembers.count { it.isWearer }
            if (wearerCount <= 1) {
                Timber.w("CreateGroupFragment: Cannot remove the last wearer from the group")
                Toast.makeText(
                    requireContext(),
                    R.string.error_at_least_one_wearer,
                    Toast.LENGTH_SHORT
                ).show()
                return
            }
        }
        
        // All validations passed, remove the member
        Timber.d("CreateGroupFragment: Removing member ${member.name}")
        selectedMembers.remove(member)
        chipAdapter.submitList(selectedMembers.toList())
        updateMembersHeader()
    }

    private fun updateMembersHeader() {
        binding.membersHeaderTextView.text = getString(
            R.string.group_members_selected_header,
            selectedMembers.size
        )
    }

    private fun createGroup() {
        val groupName = binding.groupNameEditText.text.toString().trim()
        
        if (groupName.isEmpty()) {
            Toast.makeText(requireContext(), R.string.error_group_name_required, Toast.LENGTH_SHORT).show()
            return
        }
        
        val description = binding.groupDescriptionEditText.text.toString().trim()
            .ifEmpty { null }
        
        Timber.d("CreateGroupFragment: Creating group: $groupName")
        
        val user = ParseUser.getCurrentUser()
        
        // Map selected members
        val selectedMembersList = selectedMembers.map { 
            Pair(it.id, it.isWearer)
        }
        
        // Always add the current user (owner) as a member if not already included
        val currentUserId = user.objectId
        val isOwnerAlreadyMember = selectedMembersList.any { it.first == currentUserId }
        
        val members = if (isOwnerAlreadyMember) {
            selectedMembersList
        } else {
            // Add current user as a user member (not a wearer)
            selectedMembersList + Pair(currentUserId, false)
        }
        
        Timber.d("CreateGroupFragment: Creating group with ${members.size} members (owner included)")
        
        val avatarBytes = avatarImagePath?.let {
            File(it).readBytes()
        }
        
        viewModel.createGroup(groupName, description, avatarBytes, user, members)
    }

    override fun onImageLoaded(path: String?) {
        path?.let {
            avatarImagePath = it
            Glide.with(requireContext())
                .load(Uri.fromFile(File(it)))
                .circleCrop()
                .into(binding.groupAvatarImageView)
        }
    }

    private fun showImageSelectionDialog() {
        val items = arrayOf<CharSequence>(
            getString(R.string.photo_take_new),
            getString(R.string.photo_select_from_gallery)
        )
        AlertDialog.Builder(requireContext())
            .setTitle(getString(R.string.change_photo))
            .setItems(items) { _, item ->
                when (item) {
                    0 -> {
                        if (hasCameraPermission) {
                            launchTakePicture()
                        } else {
                            requestCameraPermissionLauncher.launch(android.Manifest.permission.CAMERA)
                        }
                    }
                    1 -> {
                        launchSelectPictureFromGallery()
                    }
                }
            }
            .setNegativeButton(R.string.button_cancel) { dialog, _ ->
                dialog.dismiss()
            }
            .show()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
