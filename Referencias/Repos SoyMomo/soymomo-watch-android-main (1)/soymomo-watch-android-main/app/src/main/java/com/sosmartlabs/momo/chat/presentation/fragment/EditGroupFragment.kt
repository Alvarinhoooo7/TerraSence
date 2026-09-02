package com.sosmartlabs.momo.chat.presentation.fragment

import android.app.AlertDialog
import android.net.Uri
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.viewModels
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.findNavController
import androidx.navigation.fragment.navArgs
import com.bumptech.glide.Glide
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.chat.data.remote.model.ChatGroup
import com.sosmartlabs.momo.chat.presentation.viewmodel.GroupMembersViewModel
import com.sosmartlabs.momo.databinding.ChatEditGroupFragmentBinding
import com.sosmartlabs.momo.takepicture.TakePictureFragment
import com.sosmartlabs.momo.utils.ui.loadImage
import com.sosmartlabs.momo.utils.ui.setupFragmentEdgeToEdge
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch
import timber.log.Timber
import java.io.File

@AndroidEntryPoint
class EditGroupFragment : TakePictureFragment() {

    private var _binding: ChatEditGroupFragmentBinding? = null
    private val binding get() = _binding!!

    private val viewModel: GroupMembersViewModel by viewModels()
    private val args: EditGroupFragmentArgs by navArgs()
    
    private var avatarImagePath: String? = null
    private lateinit var currentGroup: ChatGroup

    override val objectId: String?
        get() = "group_avatar_${args.groupId}"

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        Timber.d("EditGroupFragment: onCreateView")
        _binding = ChatEditGroupFragmentBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Timber.d("EditGroupFragment: onViewCreated")
        
        setupFragmentEdgeToEdge(binding.appBarLayout)
        setupToolbar()
        setupClickListeners()
        loadGroupData()
    }

    private fun setupToolbar() {
        binding.toolbar.setNavigationOnClickListener {
            Timber.d("EditGroupFragment: Back button clicked")
            findNavController().navigateUp()
        }
    }

    private fun setupClickListeners() {
        binding.fabSaveGroup.setOnClickListener {
            Timber.d("EditGroupFragment: Save button clicked")
            saveGroup()
        }
        
        binding.avatarContainer.setOnClickListener {
            Timber.d("EditGroupFragment: Avatar clicked")
            showImageSelectionDialog()
        }
    }

    private fun loadGroupData() {
        Timber.d("EditGroupFragment: Loading group data for groupId=${args.groupId}")
        
        lifecycleScope.launch {
            try {
                val group = viewModel.fetchGroup(args.groupId)
                if (group == null) {
                    Timber.e("EditGroupFragment: Group not found")
                    Toast.makeText(requireContext(), R.string.error_group_not_found, Toast.LENGTH_SHORT).show()
                    findNavController().navigateUp()
                    return@launch
                }

                currentGroup = group

                // Load group image
                binding.groupAvatarImageView.loadImage(
                    group.avatar?.url,
                    fallback = R.drawable.ic_group_avatar
                )

                // Set editable values, clearing description when absent.
                binding.groupNameEditText.setText(group.name)
                binding.groupDescriptionEditText.setText(group.groupDescription.orEmpty())
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                Timber.e(e, "EditGroupFragment: Error loading group")
                val reason = e.message ?: getString(R.string.error_loading_group)
                Toast.makeText(
                    requireContext(),
                    getString(R.string.error_loading_group_with_reason, reason),
                    Toast.LENGTH_SHORT
                ).show()
                findNavController().navigateUp()
            }
        }
    }

    private fun saveGroup() {
        val groupName = binding.groupNameEditText.text.toString().trim()
        
        if (groupName.isEmpty()) {
            Toast.makeText(requireContext(), R.string.error_group_name_required, Toast.LENGTH_SHORT).show()
            return
        }
        
        val description = binding.groupDescriptionEditText.text.toString().trim()
            .ifEmpty { null }
        
        Timber.d("EditGroupFragment: Saving group: $groupName")
        
        lifecycleScope.launch {
            try {
                val avatarBytes = avatarImagePath?.let {
                    File(it).readBytes()
                }
                
                val success = viewModel.updateGroup(currentGroup, groupName, description, avatarBytes)
                
                if (success) {
                    Timber.d("EditGroupFragment: Group updated successfully")
                    Toast.makeText(requireContext(), R.string.group_update_success, Toast.LENGTH_SHORT).show()
                    findNavController().navigateUp()
                } else {
                    Timber.e("EditGroupFragment: Failed to update group")
                    Toast.makeText(requireContext(), R.string.error_group_update_failed, Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Timber.e(e, "EditGroupFragment: Error updating group")
                Toast.makeText(
                    requireContext(),
                    getString(
                        R.string.chat_error_with_reason,
                        e.message ?: getString(R.string.error_group_update_failed)
                    ),
                    Toast.LENGTH_SHORT
                ).show()
            }
        }
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
