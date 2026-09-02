package com.sosmartlabs.momo.chat.presentation.fragment

import android.os.Bundle
import android.view.LayoutInflater
import android.view.Menu
import android.view.MenuInflater
import android.view.MenuItem
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.view.MenuProvider
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.flowWithLifecycle
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.findNavController
import androidx.navigation.fragment.navArgs
import androidx.recyclerview.widget.LinearLayoutManager
import com.google.android.material.bottomsheet.BottomSheetDialog
import com.parse.ParseQuery
import com.parse.ParseUser
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.chat.data.local.entity.GroupMemberEntity
import com.sosmartlabs.momo.chat.data.remote.model.ChatGroup
import com.sosmartlabs.momo.chat.data.remote.model.GroupMember
import com.sosmartlabs.momo.chat.presentation.adapter.GroupMemberAdapter
import com.sosmartlabs.momo.chat.presentation.viewmodel.GroupMembersViewModel
import com.sosmartlabs.momo.databinding.ChatGroupMembersFragmentBinding
import com.sosmartlabs.momo.utils.ui.loadImage
import com.sosmartlabs.momo.utils.ui.setupFragmentEdgeToEdge
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch
import timber.log.Timber

@AndroidEntryPoint
class GroupMembersFragment : Fragment() {

    private var _binding: ChatGroupMembersFragmentBinding? = null
    private val binding get() = _binding!!

    private val viewModel: GroupMembersViewModel by viewModels()
    private val args: GroupMembersFragmentArgs by navArgs()
    
    private lateinit var adapter: GroupMemberAdapter
    private var groupId: String = ""
    private var ownerId: String = ""
    private lateinit var currentGroup: ChatGroup
    private var isCurrentUserAdmin: Boolean = false
    private var isCurrentUserActiveMember: Boolean = false
    private var currentUserId: String = ""
    private var menuProvider: MenuProvider? = null

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        Timber.d("GroupMembersFragment: onCreateView")
        _binding = ChatGroupMembersFragmentBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Timber.d("GroupMembersFragment: onViewCreated")
        
        groupId = args.groupId
        currentUserId = ParseUser.getCurrentUser().objectId
        
        setupFragmentEdgeToEdge(binding.appBarLayout)
        setupToolbar()
        setupRecyclerView()
        setupClickListeners()
        setupObservers()
        
        // Load group and members
        lifecycleScope.launch {
            try {
                val group = viewModel.fetchGroup(groupId)
                group?.let {
                    currentGroup = it
                    ownerId = it.owner?.objectId ?: ""
                    
                    // Load and display group info
                    loadGroupInfo(it)
                    
                    // Recreate adapter with correct ownerId
                    adapter = GroupMemberAdapter(
                        currentUserId = currentUserId,
                        ownerId = ownerId,
                        onMemberClick = { member -> onMemberClick(member) }
                    )
                    binding.membersRecyclerView.adapter = adapter
                    
                    // Load members and observe
                    viewModel.loadMembers(it).observe(viewLifecycleOwner) { members ->
                        adapter.submitList(members)
                        updateMemberCount(members.size)
                        checkAdminStatus(members)
                    }
                }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                Timber.e(e, "GroupMembersFragment: Error loading group")
                val reason = e.message ?: getString(R.string.error_loading_group)
                Toast.makeText(
                    requireContext(),
                    getString(R.string.error_loading_group_with_reason, reason),
                    Toast.LENGTH_SHORT
                ).show()
            }
        }
    }
    
    private fun loadGroupInfo(group: ChatGroup) {
        Timber.d("GroupMembersFragment: Loading group info")
        
        // Load group image
        binding.groupAvatarImageView.loadImage(
            group.avatar?.url,
            fallback = R.drawable.ic_group_avatar
        )
        
        // Set group name
        binding.groupNameTextView.text = group.name
        
        // Set group description
        val description = group.groupDescription
        if (!description.isNullOrEmpty()) {
            binding.groupDescriptionTextView.text = description
            binding.groupDescriptionTextView.visibility = View.VISIBLE
        } else {
            binding.groupDescriptionTextView.visibility = View.GONE
        }
    }
    
    private fun checkAdminStatus(members: List<GroupMemberEntity>) {
        Timber.d("GroupMembersFragment: Checking admin status")
        val wasAdmin = isCurrentUserAdmin
        isCurrentUserAdmin = members.any { member ->
            (member.userId == currentUserId || member.wearerId == currentUserId) &&
            (member.role == GroupMemberEntity.ROLE_ADMIN || member.userId == ownerId || member.wearerId == ownerId)
        }
        // An "active non-wearer member" may leave the group. In this app the
        // logged-in user is always a parent, but we still gate on isWearer so
        // we never offer "Leave" to a shared device that was seeded with a
        // wearer membership row.
        isCurrentUserActiveMember = members.any { member ->
            member.userId == currentUserId &&
                member.status == GroupMemberEntity.STATUS_ACTIVE &&
                !member.isWearer
        }

        Timber.d("GroupMembersFragment: Admin status - wasAdmin=$wasAdmin, isCurrentUserAdmin=$isCurrentUserAdmin, isCurrentUserActiveMember=$isCurrentUserActiveMember")

        // Update UI based on admin status
        binding.fabAddMembers.visibility = if (isCurrentUserAdmin) View.VISIBLE else View.GONE

        // Setup or update menu provider when admin status is determined
        setupMenuProvider()
    }

    private fun setupMenuProvider() {
        Timber.d("GroupMembersFragment: setupMenuProvider called, isCurrentUserAdmin=$isCurrentUserAdmin")
        
        // Remove existing menu provider if any
        menuProvider?.let {
            Timber.d("GroupMembersFragment: Removing existing menu provider")
            requireActivity().removeMenuProvider(it)
        }
        
        // Create and add new menu provider. We always inflate the whole menu
        // and toggle items based on role so non-admin parents still see
        // "Leave group" while only admins see edit + delete.
        menuProvider = object : MenuProvider {
            override fun onCreateMenu(menu: Menu, menuInflater: MenuInflater) {
                Timber.d("GroupMembersFragment: onCreateMenu called")
                menuInflater.inflate(R.menu.group_info_menu, menu)
            }

            override fun onPrepareMenu(menu: Menu) {
                menu.findItem(R.id.action_edit_group)?.isVisible = isCurrentUserAdmin
                menu.findItem(R.id.action_delete_group)?.isVisible = isCurrentUserAdmin
                menu.findItem(R.id.action_leave_group)?.isVisible = isCurrentUserActiveMember
            }

            override fun onMenuItemSelected(menuItem: MenuItem): Boolean {
                Timber.d("GroupMembersFragment: onMenuItemSelected called, itemId=${menuItem.itemId}")
                return when (menuItem.itemId) {
                    R.id.action_edit_group -> {
                        Timber.d("GroupMembersFragment: Edit group clicked")
                        navigateToEditGroup()
                        true
                    }
                    R.id.action_leave_group -> {
                        Timber.d("GroupMembersFragment: Leave group clicked")
                        showLeaveGroupConfirmation()
                        true
                    }
                    R.id.action_delete_group -> {
                        Timber.d("GroupMembersFragment: Delete group clicked")
                        showDeleteGroupConfirmation()
                        true
                    }
                    else -> {
                        Timber.d("GroupMembersFragment: Unknown menu item selected")
                        false
                    }
                }
            }
        }

        requireActivity().addMenuProvider(menuProvider!!, viewLifecycleOwner, Lifecycle.State.RESUMED)
        // Menu is always inflated now, but item visibility depends on role —
        // ask the host to re-run onPrepareMenu after status changes.
        requireActivity().invalidateOptionsMenu()
        Timber.d("GroupMembersFragment: Menu provider added to activity")
    }

    private fun setupToolbar() {
        Timber.d("GroupMembersFragment: setupToolbar called")
        with(requireActivity() as AppCompatActivity) {
            setSupportActionBar(binding.toolbar)
            supportActionBar?.apply {
                setDisplayShowTitleEnabled(true)
                setDisplayHomeAsUpEnabled(true)
                setDisplayShowHomeEnabled(true)
            }
            window.statusBarColor = ContextCompat.getColor(requireContext(), R.color.background_sim_step_card_title)
            window.navigationBarColor = ContextCompat.getColor(requireContext(), R.color.white)
        }
        binding.toolbar.setNavigationOnClickListener {
            Timber.d("GroupMembersFragment: Back button clicked")
            findNavController().navigateUp()
        }
        Timber.d("GroupMembersFragment: Toolbar setup completed")
    }
    
    private fun navigateToEditGroup() {
        Timber.d("GroupMembersFragment: Navigating to edit group")
        findNavController().navigate(
            GroupMembersFragmentDirections.actionGroupMembersToEditGroup(groupId)
        )
    }

    private fun setupRecyclerView() {
        Timber.d("GroupMembersFragment: setupRecyclerView")
        
        binding.membersRecyclerView.apply {
            layoutManager = LinearLayoutManager(requireContext())
        }
    }

    private fun setupClickListeners() {
        binding.fabAddMembers.setOnClickListener {
            Timber.d("GroupMembersFragment: Add members FAB clicked")
            if (isCurrentUserAdmin) {
                findNavController().navigate(
                    GroupMembersFragmentDirections.actionGroupMembersToAddGroupMembers(groupId)
                )
            }
        }
    }
    
    private fun onMemberClick(member: GroupMemberEntity) {
        Timber.d("GroupMembersFragment: Member clicked: ${member.name}")
        
        // Only show actions if current user is admin and member is not self/owner
        if (!isCurrentUserAdmin) {
            return
        }
        
        val user = ParseUser.getCurrentUser()
        val isCurrentUser = member.userId == user.objectId || member.wearerId == user.objectId
        val isMemberOwner = member.userId == ownerId || member.wearerId == ownerId
        
        // Don't show actions for self or owner
        if (isCurrentUser || isMemberOwner) {
            return
        }
        
        showMemberActionsBottomSheet(member)
    }

    private fun setupObservers() {
        Timber.d("GroupMembersFragment: setupObservers")
        
        viewModel.isLoading.observe(viewLifecycleOwner) { isLoading ->
            Timber.d("GroupMembersFragment: Loading state = $isLoading")
            binding.loadingProgressBar.visibility = if (isLoading) View.VISIBLE else View.GONE
            binding.membersRecyclerView.visibility = if (isLoading) View.GONE else View.VISIBLE
        }
        
        viewModel.errorMessage.observe(viewLifecycleOwner) { error ->
            error?.let {
                Timber.e("GroupMembersFragment: Error: $it")
                Toast.makeText(requireContext(), it, Toast.LENGTH_SHORT).show()
                viewModel.clearError()
            }
        }

        // One-shot leave/delete success events. Using a Channel means these
        // don't replay on rotation (a LiveData<Boolean> would).
        viewLifecycleOwner.lifecycleScope.launch {
            viewModel.uiEvents
                .flowWithLifecycle(viewLifecycleOwner.lifecycle, Lifecycle.State.STARTED)
                .collect { event ->
                    when (event) {
                        is GroupMembersViewModel.UiEvent.LeftGroup -> onGroupExited(
                            toastRes = R.string.leave_group_success_toast
                        )
                        is GroupMembersViewModel.UiEvent.DeletedGroup -> onGroupExited(
                            toastRes = R.string.delete_group_success_toast
                        )
                    }
                }
        }
    }

    private fun onGroupExited(toastRes: Int) {
        // Pop back to the chat list (which `ChatListActivity` always keeps in
        // the back stack — see openUnifiedChatFromIntent's popUpTo rule).
        Toast.makeText(requireContext(), toastRes, Toast.LENGTH_SHORT).show()
        findNavController().popBackStack(R.id.chatListFragment, false)
    }

    private fun showLeaveGroupConfirmation() {
        val name = if (::currentGroup.isInitialized) currentGroup.name else ""
        val messageRes = if (isCurrentUserAdmin) {
            R.string.leave_group_dialog_message_admin
        } else {
            R.string.leave_group_dialog_message
        }
        AlertDialog.Builder(requireContext())
            .setTitle(getString(R.string.leave_group_dialog_title, name))
            .setMessage(messageRes)
            .setPositiveButton(R.string.leave_group_dialog_confirm) { _, _ ->
                viewModel.leaveGroup(groupId)
            }
            .setNegativeButton(R.string.leave_group_dialog_cancel, null)
            .show()
    }

    private fun showDeleteGroupConfirmation() {
        val name = if (::currentGroup.isInitialized) currentGroup.name else ""
        AlertDialog.Builder(requireContext())
            .setTitle(getString(R.string.delete_group_dialog_title, name))
            .setMessage(R.string.delete_group_dialog_message)
            .setPositiveButton(R.string.delete_group_dialog_confirm) { _, _ ->
                viewModel.deleteGroup(groupId)
            }
            .setNegativeButton(R.string.delete_group_dialog_cancel, null)
            .show()
    }

    private fun showMemberActionsBottomSheet(member: GroupMemberEntity) {
        Timber.d("GroupMembersFragment: Showing bottom sheet for member ${member.name}")

        val bottomSheetView = layoutInflater.inflate(R.layout.bottom_sheet_member_actions, null)
        val bottomSheetDialog = BottomSheetDialog(requireContext())
        bottomSheetDialog.setContentView(bottomSheetView)

        val memberNameTextView = bottomSheetView.findViewById<android.widget.TextView>(R.id.memberNameTextView)
        val makeAdminContainer = bottomSheetView.findViewById<View>(R.id.makeAdminContainer)
        val makeAdminButton = bottomSheetView.findViewById<android.widget.TextView>(R.id.makeAdminButton)
        val removeAdminContainer = bottomSheetView.findViewById<View>(R.id.removeAdminContainer)
        val removeAdminButton = bottomSheetView.findViewById<android.widget.TextView>(R.id.removeAdminButton)
        val removeMemberContainer = bottomSheetView.findViewById<View>(R.id.removeMemberContainer)
        val removeMemberButton = bottomSheetView.findViewById<android.widget.TextView>(R.id.removeMemberButton)
        val makeAdminDivider = bottomSheetView.findViewById<View>(R.id.makeAdminDivider)
        val removeAdminDivider = bottomSheetView.findViewById<View>(R.id.removeAdminDivider)

        memberNameTextView?.text = member.name
        bottomSheetView.findViewById<android.widget.TextView>(R.id.memberDetailTextView)?.text =
            member.detailText()

        // Show/hide admin actions based on current role
        val isAdmin = member.role == GroupMemberEntity.ROLE_ADMIN
        val showMakeAdmin = !isAdmin && !member.isWearer
        val showRemoveAdmin = isAdmin && !member.isWearer
        makeAdminContainer?.visibility = if (showMakeAdmin) View.VISIBLE else View.GONE
        makeAdminDivider?.visibility = if (showMakeAdmin) View.VISIBLE else View.GONE
        removeAdminContainer?.visibility = if (showRemoveAdmin) View.VISIBLE else View.GONE
        removeAdminDivider?.visibility = if (showRemoveAdmin) View.VISIBLE else View.GONE

        // UI gate: pre-check the server invariants so we don't fire doomed
        // requests. Cloud still enforces — this is user-facing feedback only.
        val removalDecision = MemberRemovalPolicy.canRemove(member, adapter.currentList)
        val removalAllowed = removalDecision is MemberRemovalPolicy.Decision.Allowed
        val removalReasonTextView =
            bottomSheetView.findViewById<android.widget.TextView>(R.id.removeMemberReasonTextView)
        val removalReason = (removalDecision as? MemberRemovalPolicy.Decision.Blocked)
            ?.let { getString(it.reasonRes) }
        removalReasonTextView?.text = removalReason
        removalReasonTextView?.visibility = if (removalReason == null) View.GONE else View.VISIBLE
        removeMemberContainer?.alpha = if (removalAllowed) 1f else 0.5f
        removeMemberContainer?.isClickable = removalAllowed
        removeMemberContainer?.isEnabled = removalAllowed
        removeMemberContainer?.contentDescription = if (removalReason == null) {
            getString(R.string.remove_member_action)
        } else {
            getString(
                R.string.member_action_disabled_content_description,
                getString(R.string.remove_member_action),
                removalReason
            )
        }

        makeAdminContainer?.setOnClickListener {
            bottomSheetDialog.dismiss()
            showMakeAdminConfirmation(member)
        }

        removeAdminContainer?.setOnClickListener {
            bottomSheetDialog.dismiss()
            showRemoveAdminConfirmation(member)
        }

        if (removalAllowed) {
            removeMemberContainer?.setOnClickListener {
                bottomSheetDialog.dismiss()
                showRemoveMemberConfirmation(member)
            }
        } else {
            removeMemberContainer?.setOnClickListener(null)
        }

        bottomSheetDialog.show()
    }

    private fun GroupMemberEntity.detailText(): String {
        return if (isWearer) {
            val modelName = wearerModelName
            if (modelName.isNullOrBlank()) {
                getString(R.string.group_member_type_wearer)
            } else {
                getString(R.string.group_member_type_wearer_model, modelName)
            }
        } else {
            getString(R.string.group_member_type_parent)
        }
    }
    
    private fun showMakeAdminConfirmation(member: GroupMemberEntity) {
        AlertDialog.Builder(requireContext())
            .setTitle(R.string.make_admin_title)
            .setMessage(R.string.make_admin_message)
            .setPositiveButton(R.string.button_confirm) { _, _ ->
                toggleAdmin(member, makeAdmin = true)
            }
            .setNegativeButton(android.R.string.cancel, null)
            .show()
    }
    
    private fun showRemoveAdminConfirmation(member: GroupMemberEntity) {
        AlertDialog.Builder(requireContext())
            .setTitle(R.string.remove_admin_title)
            .setMessage(R.string.remove_admin_message)
            .setPositiveButton(R.string.button_confirm) { _, _ ->
                toggleAdmin(member, makeAdmin = false)
                }
            .setNegativeButton(android.R.string.cancel, null)
            .show()
    }

    private fun showRemoveMemberConfirmation(member: GroupMemberEntity) {
        AlertDialog.Builder(requireContext())
            .setTitle(R.string.remove_member_title)
            .setMessage(R.string.remove_member_message)
            .setPositiveButton(R.string.button_remove) { _, _ ->
                removeMember(member)
            }
            .setNegativeButton(android.R.string.cancel, null)
            .show()
    }

    private fun toggleAdmin(member: GroupMemberEntity, makeAdmin: Boolean) {
        Timber.d("GroupMembersFragment: Toggle admin for ${member.name}, makeAdmin=$makeAdmin")
        lifecycleScope.launch {
            try {
                val groupMemberQuery = ParseQuery.getQuery(GroupMember::class.java)
                val groupMember = groupMemberQuery.get(member.id)
                viewModel.toggleAdmin(groupMember, makeAdmin)
                // Reload members to refresh UI
                viewModel.loadMembers(currentGroup).observe(viewLifecycleOwner) { members ->
                    adapter.submitList(members)
                    updateMemberCount(members.size)
                    checkAdminStatus(members)
                }
            } catch (e: Exception) {
                Timber.e(e, "GroupMembersFragment: Error toggling admin")
                Toast.makeText(
                    requireContext(),
                    getString(
                        R.string.chat_error_with_reason,
                        e.message ?: getString(R.string.error_update_admin_role_failed)
                    ),
                    Toast.LENGTH_SHORT
                ).show()
            }
        }
    }

    private fun removeMember(member: GroupMemberEntity) {
        Timber.d("GroupMembersFragment: Remove member ${member.name}")
        lifecycleScope.launch {
            try {
                val groupMemberQuery = ParseQuery.getQuery(GroupMember::class.java)
                val groupMember = groupMemberQuery.get(member.id)
                viewModel.removeMember(groupMember)
                // Reload members to refresh UI
                viewModel.loadMembers(currentGroup).observe(viewLifecycleOwner) { members ->
                    adapter.submitList(members)
                    updateMemberCount(members.size)
                    checkAdminStatus(members)
                }
            } catch (e: Exception) {
                if (e is IllegalStateException) {
                    Toast.makeText(requireContext(), R.string.error_cannot_remove_last_wearer, Toast.LENGTH_SHORT).show()
                } else {
                    Timber.e(e, "GroupMembersFragment: Error removing member")
                    Toast.makeText(
                        requireContext(),
                        getString(
                            R.string.chat_error_with_reason,
                            e.message ?: getString(R.string.error_add_members_failed)
                        ),
                        Toast.LENGTH_SHORT
                    ).show()
                }
            }
        }
    }

    private fun updateMemberCount(count: Int) {
        Timber.d("GroupMembersFragment: Member count = $count")
        val countText = resources.getQuantityString(R.plurals.group_member_count, count, count)
        binding.membersHeaderTextView.text = countText.uppercase()
    }

    override fun onDestroyView() {
        Timber.d("GroupMembersFragment: onDestroyView called")
        menuProvider?.let {
            Timber.d("GroupMembersFragment: Removing menu provider on destroy")
            requireActivity().removeMenuProvider(it)
        }
        menuProvider = null
        super.onDestroyView()
        _binding = null
    }
}
