package com.sosmartlabs.momo.watchrequests.ui

import android.os.Bundle
import android.view.LayoutInflater
import android.view.Menu
import android.view.MenuInflater
import android.view.MenuItem
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.activity.addCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.isVisible
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
import com.bumptech.glide.Glide
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.FragmentUserPermissionBinding
import com.sosmartlabs.momo.models.UserPermissionFeature
import com.sosmartlabs.momo.models.WatchUser
import com.sosmartlabs.momo.watchrequests.model.UserPermission
import com.sosmartlabs.momo.watchrequests.ui.adapter.UserPermissionAdapter
import timber.log.Timber

class UserPermissionFragment : Fragment() {
    private lateinit var binding: FragmentUserPermissionBinding
    private lateinit var adapter: UserPermissionAdapter
    private val viewModel: WatchRequestViewModel by activityViewModels()

    /** Permission state when the editor opened, keyed by feature title res. */
    private var originalStates: Map<Int, Boolean> = emptyMap()

    /** Live permission state as edited in the UI, keyed by feature title res. */
    private val currentStates: MutableMap<Int, Boolean> = mutableMapOf()

    private var isSaving = false

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        binding = FragmentUserPermissionBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        // After process death (or "Don't keep activities") the activity-scoped ViewModel is
        // recreated empty, so this editor has no user to edit and can't restore. Bail back to the
        // list (which reloads from the server) instead of stranding the user on a blank editor
        // that would still prompt to discard edits that no longer exist.
        if (savedInstanceState != null && viewModel.currentUser.value?.userPermission == null) {
            findNavController().navigateUp()
            return
        }
        setupEdgeToEdge()
        setupToolbar()
        setupBackNavigationHandler()
        initViewAdapter()
        restoreEditState(savedInstanceState)
        setupButtons()
        observeViewModel()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        // The editor's baseline and in-progress edits are plain fields, but the hosting
        // ViewModel is activity-scoped and survives an activity recreate (font scale, locale,
        // dark mode, "Don't keep activities"). Persist them so a mid-edit recreate keeps the
        // saved baseline, the toggle positions, and the dirty state instead of re-capturing a
        // stale baseline (which left the shared Parse object dirty while Save looked clean).
        outState.putPermissionStates(KEY_ORIGINAL_STATES, originalStates)
        outState.putPermissionStates(KEY_CURRENT_STATES, currentStates)
    }

    private fun restoreEditState(savedInstanceState: Bundle?) {
        savedInstanceState ?: return
        savedInstanceState.getPermissionStates(KEY_ORIGINAL_STATES)?.let { originalStates = it }
        savedInstanceState.getPermissionStates(KEY_CURRENT_STATES)?.let {
            currentStates.clear()
            currentStates.putAll(it)
        }
    }

    private fun initViewAdapter() {
        adapter = UserPermissionAdapter(requireContext()).apply {
            listener = object : UserPermissionAdapter.Listener {
                override fun onItemEnabledChanged(
                    userPermission: UserPermissionFeature,
                    enabled: Boolean
                ) {
                    currentStates[userPermission.title] = enabled
                    viewModel.updateCurrentUserPermissionState(userPermission, enabled)
                    updateSaveButtonState()
                }
            }
        }
        binding.userPermissionRecyclerView.apply {
            layoutManager = LinearLayoutManager(requireContext(), LinearLayoutManager.VERTICAL, false)
            adapter = this@UserPermissionFragment.adapter
        }
    }

    private fun setupButtons() {
        binding.buttonSave.setOnClickListener {
            val permission: UserPermission? = viewModel.currentUser.value?.userPermission
            if (permission != null) viewModel.saveUserPermissionChanges(permission)
        }
        updateSaveButtonState()
    }

    override fun onCreateOptionsMenu(menu: Menu, inflater: MenuInflater) {
        inflater.inflate(R.menu.menu_user_permission, menu)
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        return when (item.itemId) {
            R.id.action_remove_access -> {
                showRemoveAccessDialog()
                true
            }
            else -> super.onOptionsItemSelected(item)
        }
    }

    private fun showRemoveAccessDialog() {
        if (isSaving) return
        val current = viewModel.currentUser.value ?: return
        MaterialAlertDialogBuilder(requireContext())
            .setTitle(R.string.watch_request_remove_access_title)
            .setMessage(getString(R.string.watch_request_remove_access_message, displayName(current)))
            .setPositiveButton(R.string.watch_request_remove_access_confirm) { dialog, _ ->
                dialog.dismiss()
                // Drop any unsaved permission toggles — we're removing the member entirely.
                viewModel.discardPermissionChanges()
                viewModel.removeRequest(current)
            }
            .setNegativeButton(R.string.watch_request_remove_access_cancel) { dialog, _ ->
                dialog.dismiss()
            }
            .show()
    }

    private fun observeViewModel() {
        viewModel.permissionFeature.observe(viewLifecycleOwner) { features ->
            if (features.isEmpty()) {
                adapter.submitList(emptyList())
                return@observe
            }
            // Capture the saved baseline the first time a real feature list arrives. If it was
            // restored across a config-change recreate, originalStates is already set and we keep it.
            if (originalStates.isEmpty()) {
                originalStates = features.associate { it.title to it.switchStatePermission }
                currentStates.clear()
                currentStates.putAll(originalStates)
            }
            // Render switch positions from the in-progress edit state rather than the freshly
            // loaded snapshot, so pending (unsaved) toggles survive an activity recreate.
            adapter.submitList(features.map { feature ->
                val edited = currentStates[feature.title] ?: feature.switchStatePermission
                if (edited == feature.switchStatePermission) feature
                else feature.copy(switchStatePermission = edited)
            })
            updateSaveButtonState()
        }

        viewModel.currentUser.observe(viewLifecycleOwner) { watchUser ->
            bindUser(watchUser)
            viewModel.loadPermissions(watchUser)
        }

        viewModel.state.observe(viewLifecycleOwner) { state ->
            state ?: return@observe
            when (state) {
                WatchRequestViewModel.RequestState.LOADING -> {
                    isSaving = true
                    binding.progressBar.isVisible = true
                    updateSaveButtonState()
                }
                WatchRequestViewModel.RequestState.LOADING_SUCCESS -> {
                    // A permission load finished — but don't clear the saving UI if a save is still
                    // in flight (a recreate mid-save re-runs loadPermissions). saveInProgress is the
                    // source of truth for the save spinner, independent of observer registration order.
                    isSaving = viewModel.saveInProgress.value == true
                    binding.progressBar.isVisible = isSaving
                    updateSaveButtonState()
                }
                WatchRequestViewModel.RequestState.SUCCESS_UPDATE -> {
                    isSaving = false
                    binding.progressBar.isVisible = false
                    showResultAndClose(R.string.toast_success_update_permission)
                }
                WatchRequestViewModel.RequestState.SUCCESS_DELETE -> {
                    isSaving = false
                    binding.progressBar.isVisible = false
                    showResultAndClose(R.string.toast_user_deleted)
                }
                WatchRequestViewModel.RequestState.ERROR_UPDATE -> {
                    isSaving = false
                    binding.progressBar.isVisible = false
                    updateSaveButtonState()
                    Toast.makeText(requireContext(), R.string.error_update_permissions, Toast.LENGTH_SHORT).show()
                }
                else -> Unit
            }
        }

        // Drive the saving UI off the ViewModel-owned flag so it stays correct (spinner shown,
        // Save disabled) if the activity is recreated while a save is in flight — the one-shot
        // LOADING state event would not replay to the new fragment instance.
        viewModel.saveInProgress.observe(viewLifecycleOwner) { saving ->
            isSaving = saving
            binding.progressBar.isVisible = saving
            updateSaveButtonState()
        }
    }

    private fun hasUnsavedChanges(): Boolean =
        originalStates.isNotEmpty() && currentStates != originalStates

    private fun updateSaveButtonState() {
        // Require a live user/permission too: after process death the activity-scoped ViewModel is
        // gone (currentUser is null) even though the restored edit state is not, so Save must not
        // appear actionable when there is nothing to save it onto.
        val canSave = viewModel.currentUser.value?.userPermission != null
        val enabled = canSave && hasUnsavedChanges() && !isSaving
        binding.buttonSave.isEnabled = enabled
        binding.buttonSave.alpha = if (enabled) 1f else 0.5f
    }

    private fun bindUser(watchUser: WatchUser) {
        binding.watchUserName.text = displayName(watchUser)
        Glide.with(requireContext())
            .load(watchUser.user?.getParseFile("image")?.url)
            .placeholder(R.drawable.ic_default_avatar)
            .error(R.drawable.ic_default_avatar)
            .into(binding.imageProfile)
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

    private fun setupBackNavigationHandler() {
        requireActivity().onBackPressedDispatcher.addCallback(viewLifecycleOwner) {
            handleCloseRequest()
        }
    }

    private fun handleCloseRequest() {
        // Ignore back / up while a save is running: leaving mid-save could revert() the Parse
        // object on another thread while save() is serializing it, and would otherwise prompt to
        // discard changes that are actively being persisted. The save finishes and navigates away
        // on its own (success) or re-enables the UI (error).
        if (isSaving) return
        if (!hasUnsavedChanges()) {
            // No net change to save — but a toggle then un-toggle still leaves value-equal "dirty"
            // keys on the shared Parse object (each toggle re-puts all fields). Revert on the way
            // out so the reused object stays clean and a later save can't push a no-op write.
            viewModel.discardPermissionChanges()
            findNavController().navigateUp()
            return
        }
        MaterialAlertDialogBuilder(requireContext())
            .setTitle(R.string.watch_request_discard_title)
            .setMessage(R.string.watch_request_discard_message)
            .setPositiveButton(R.string.watch_request_discard_confirm) { dialog, _ ->
                dialog.dismiss()
                viewModel.discardPermissionChanges()
                findNavController().navigateUp()
            }
            .setNegativeButton(R.string.watch_request_discard_cancel) { dialog, _ ->
                dialog.dismiss()
            }
            .show()
    }

    private fun showResultAndClose(messageRes: Int) {
        Toast.makeText(requireContext(), messageRes, Toast.LENGTH_SHORT).show()
        findNavController().navigateUp()
    }

    private fun setupEdgeToEdge() {
        Timber.d("UserPermissionFragment: setupEdgeToEdge")

        val baseButtonBarBottom = (BUTTON_BAR_BASE_BOTTOM_DP * resources.displayMetrics.density).toInt()

        ViewCompat.setOnApplyWindowInsetsListener(binding.root) { _, windowInsets ->
            val systemBars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars())
            val displayCutout = windowInsets.getInsets(WindowInsetsCompat.Type.displayCutout())
            val navigationBars = windowInsets.getInsets(WindowInsetsCompat.Type.navigationBars())
            val ime = windowInsets.getInsets(WindowInsetsCompat.Type.ime())

            binding.appbar.setPadding(
                systemBars.left.coerceAtLeast(displayCutout.left),
                systemBars.top.coerceAtLeast(displayCutout.top),
                systemBars.right.coerceAtLeast(displayCutout.right),
                binding.appbar.paddingBottom
            )

            // Keep the pinned Save / Remove buttons clear of the system navigation bar (or the
            // gesture pill), so "Remove access" isn't jammed against the bottom edge.
            binding.buttonBar.setPadding(
                binding.buttonBar.paddingLeft,
                binding.buttonBar.paddingTop,
                binding.buttonBar.paddingRight,
                baseButtonBarBottom + navigationBars.bottom.coerceAtLeast(ime.bottom)
            )

            windowInsets
        }
    }

    private fun setupToolbar() {
        (activity as AppCompatActivity).setSupportActionBar(binding.toolbar)
        (activity as AppCompatActivity).supportActionBar?.apply {
            title = getString(R.string.permission_app_bar_title)
            setDisplayShowTitleEnabled(true)
            setDisplayHomeAsUpEnabled(true)
            setDisplayShowHomeEnabled(true)
        }
        setHasOptionsMenu(true)
        binding.toolbar.setNavigationOnClickListener { handleCloseRequest() }
    }

    companion object {
        private const val BUTTON_BAR_BASE_BOTTOM_DP = 12
        private const val KEY_ORIGINAL_STATES = "user_permission_original_states"
        private const val KEY_CURRENT_STATES = "user_permission_current_states"
    }
}

/** Stores a feature-title -> enabled map as parallel arrays so it survives a config-change recreate. */
private fun Bundle.putPermissionStates(prefix: String, states: Map<Int, Boolean>) {
    putIntArray("${prefix}_keys", states.keys.toIntArray())
    putBooleanArray("${prefix}_values", states.keys.map { states.getValue(it) }.toBooleanArray())
}

private fun Bundle.getPermissionStates(prefix: String): Map<Int, Boolean>? {
    val keys = getIntArray("${prefix}_keys") ?: return null
    val values = getBooleanArray("${prefix}_values") ?: return null
    if (keys.size != values.size) return null
    return keys.mapIndexed { index, key -> key to values[index] }.toMap()
}
