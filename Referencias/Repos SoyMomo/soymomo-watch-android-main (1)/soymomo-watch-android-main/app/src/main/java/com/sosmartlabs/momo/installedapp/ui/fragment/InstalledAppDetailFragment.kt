package com.sosmartlabs.momo.installedapp.ui.fragment

import android.app.TimePickerDialog
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.activity.addCallback
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.isVisible
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.InstalledAppFragmentDetailBinding
import com.sosmartlabs.momo.installedapp.model.InstalledAppListItem
import com.sosmartlabs.momo.installedapp.ui.InstalledAppDurationFormatter
import com.sosmartlabs.momo.installedapp.ui.InstalledAppViewModel
import com.sosmartlabs.momo.utils.Resource
import com.sosmartlabs.momo.utils.ui.loadImage
import timber.log.Timber
import kotlin.getValue

class InstalledAppDetailFragment : Fragment() {

    private var _binding: InstalledAppFragmentDetailBinding? = null
    private val binding get() = checkNotNull(_binding)

    private val installedAppViewModel: InstalledAppViewModel by activityViewModels()
    private var originalAllowed: Boolean = false
    private var originalDailyMinutesLimit: Int = 0
    private var selectedDailyMinutesLimit: Int = 0

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = InstalledAppFragmentDetailBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupEdgeToEdge()
        setToolbar()
        setupBackNavigationHandler()
        setupInteractions()
        observeViewModel()

        val currentInstalledApp = installedAppViewModel.currentInstalledApp.value?.data
        if (currentInstalledApp == null) {
            findNavController().navigateUp()
            return
        }
        renderInstalledApp(currentInstalledApp)
    }

    private fun setupEdgeToEdge() {
        Timber.d("InstalledAppDetailFragment: setupEdgeToEdge")

        ViewCompat.setOnApplyWindowInsetsListener(binding.root) { _, windowInsets ->
            val systemBars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars())
            val displayCutout = windowInsets.getInsets(WindowInsetsCompat.Type.displayCutout())

            Timber.d("InstalledAppDetailFragment: systemBars $systemBars")
            Timber.d("InstalledAppDetailFragment: displayCutout $displayCutout")

            // Apply top padding to AppBarLayout to extend colorPrimary background into status bar area
            binding.contentAppBar.setPadding(
                systemBars.left.coerceAtLeast(displayCutout.left),
                systemBars.top.coerceAtLeast(displayCutout.top),
                systemBars.right.coerceAtLeast(displayCutout.right),
                binding.contentAppBar.paddingBottom
            )

            windowInsets
        }
    }

    private fun setupInteractions() {
        binding.installedAppAllowSwitch.setOnCheckedChangeListener { _, isChecked ->
            renderEditableState()
        }

        binding.installedAppDailyLimitSwitch.setOnCheckedChangeListener { _, isChecked ->
            if (isChecked && selectedDailyMinutesLimit <= 0) {
                selectedDailyMinutesLimit = DEFAULT_DAILY_LIMIT
            }
            renderEditableState()
        }

        binding.installedAppLimitValueCard.setOnClickListener {
            if (!binding.installedAppDailyLimitSwitch.isChecked) return@setOnClickListener
            showDailyLimitDialog()
        }

        binding.installedAppSaveButton.setOnClickListener {
            installedAppViewModel.updateInstalledAppPolicy(
                allowed = binding.installedAppAllowSwitch.isChecked,
                dailyMinutesLimit = if (binding.installedAppDailyLimitSwitch.isChecked) {
                    selectedDailyMinutesLimit
                } else {
                    0
                }
            )
        }
    }

    private fun observeViewModel() {
        installedAppViewModel.currentInstalledApp.observe(viewLifecycleOwner) { resource ->
            if (resource == null) {
                findNavController().navigateUp()
                return@observe
            }
            when (resource?.status) {
                Resource.Status.LOAD_SUCCESS -> {
                    resource.data?.let(::renderInstalledApp)
                }

                Resource.Status.UPDATING -> {
                    binding.installedAppSaveButton.isEnabled = false
                    binding.installedAppSaveButton.alpha = DISABLED_BUTTON_ALPHA
                }

                Resource.Status.UPDATING_SUCCESS -> {
                    findNavController().navigateUp()
                }

                Resource.Status.UPDATING_ERROR,
                Resource.Status.UNKNOWN_ERROR -> {
                    updateSaveButtonState()
                    Toast.makeText(
                        requireContext(),
                        getString(R.string.installed_app_detail_update_error),
                        Toast.LENGTH_SHORT
                    ).show()
                }

                else -> Unit
            }
        }
    }

    private fun renderInstalledApp(installedApp: InstalledAppListItem) {
        originalAllowed = installedApp.allowed
        originalDailyMinutesLimit = installedApp.dailyMinutesLimit
        selectedDailyMinutesLimit = installedApp.dailyMinutesLimit
        binding.installedAppDetailAppName.text = installedApp.displayName
        binding.installedAppDetailAppIcon.loadImage(
            installedApp.iconUrl ?: R.drawable.ic_installed_app,
            R.drawable.ic_installed_app
        )
        binding.installedAppAllowSwitch.isChecked = installedApp.allowed
        binding.installedAppDailyLimitSwitch.isChecked = installedApp.hasDailyLimit
        renderEditableState()
    }

    private fun renderEditableState() {
        val isAllowed = binding.installedAppAllowSwitch.isChecked
        renderAllowState(isAllowed)
        renderDailyLimitState(binding.installedAppDailyLimitSwitch.isChecked)
        renderSummaryCard()
        updateSaveButtonState()
    }

    private fun renderSummaryCard() {
        val isAllowed = binding.installedAppAllowSwitch.isChecked
        val effectiveDailyMinutesLimit = if (isAllowed) getCurrentDailyMinutesLimit() else 0

        binding.installedAppDetailSummaryStatus.text = getString(
            if (isAllowed) {
                R.string.installed_app_detail_summary_status_allowed
            } else {
                R.string.installed_app_detail_summary_status_blocked
            }
        )

        binding.installedAppDetailSummaryLimit.text = if (effectiveDailyMinutesLimit > 0) {
            getString(
                R.string.installed_app_detail_summary_limit_format,
                formatDailyLimit(effectiveDailyMinutesLimit)
            )
        } else {
            getString(R.string.installed_app_detail_summary_limit_off)
        }

        binding.installedAppDetailSummaryMessage.text = getString(
            if (isAllowed) {
                R.string.installed_app_detail_summary_message_allowed
            } else {
                R.string.installed_app_detail_summary_message_blocked
            }
        )
    }

    private fun renderAllowState(isAllowed: Boolean) {
        val context = requireContext()
        binding.installedAppDetailStatusChip.text = getString(
            if (isAllowed) R.string.installed_app_status_allowed else R.string.installed_app_status_blocked
        )
        binding.installedAppDetailStatusChip.setChipBackgroundColorResource(
            if (isAllowed) R.color.colorGreen else R.color.white
        )
        binding.installedAppDetailStatusChip.setTextColor(
            ContextCompat.getColor(
                context,
                if (isAllowed) R.color.white else R.color.colorPrimary
            )
        )
        binding.installedAppDetailAppIcon.alpha = if (isAllowed) 1f else 0.65f

        binding.installedAppDailyLimitCard.alpha = if (isAllowed) 1f else 0.55f
        binding.installedAppDailyLimitSwitch.isEnabled = isAllowed
        binding.installedAppLimitValueCard.alpha = if (isAllowed) 1f else 0.55f
        binding.installedAppLimitValueCard.isEnabled = isAllowed
        binding.installedAppLimitValueCard.isClickable = isAllowed
        binding.installedAppLimitValueCard.isFocusable = isAllowed
    }

    private fun renderDailyLimitState(enabled: Boolean) {
        binding.installedAppLimitValueCard.isVisible = enabled
        binding.installedAppLimitValueText.text = if (enabled) {
            formatDailyLimit(selectedDailyMinutesLimit)
        } else {
            getString(R.string.installed_app_detail_limit_off)
        }
    }

    private fun showDailyLimitDialog() {
        val initialMinutes = selectedDailyMinutesLimit.coerceIn(MIN_DAILY_LIMIT_MINUTES, MAX_DAILY_LIMIT_MINUTES)
        val initialHour = initialMinutes / 60
        val initialMinute = initialMinutes % 60

        TimePickerDialog(
            requireContext(),
            { _, hourOfDay, minute ->
                val totalMinutes = hourOfDay * 60 + minute
                selectedDailyMinutesLimit = totalMinutes
                    .coerceIn(MIN_DAILY_LIMIT_MINUTES, MAX_DAILY_LIMIT_MINUTES)
                renderEditableState()
            },
            initialHour,
            initialMinute,
            true
        ).show()
    }

    private fun getCurrentDailyMinutesLimit(): Int {
        return if (binding.installedAppDailyLimitSwitch.isChecked) {
            selectedDailyMinutesLimit
        } else {
            0
        }
    }

    private fun hasUnsavedChanges(): Boolean {
        return binding.installedAppAllowSwitch.isChecked != originalAllowed ||
            getCurrentDailyMinutesLimit() != originalDailyMinutesLimit
    }

    private fun updateSaveButtonState() {
        val isEnabled = hasUnsavedChanges()
        binding.installedAppSaveButton.isEnabled = isEnabled
        binding.installedAppSaveButton.alpha = if (isEnabled) {
            ENABLED_BUTTON_ALPHA
        } else {
            DISABLED_BUTTON_ALPHA
        }
    }

    private fun formatDailyLimit(minutes: Int): String {
        if (minutes <= 0) return getString(R.string.installed_app_detail_limit_off)
        return InstalledAppDurationFormatter.formatDetailDuration(requireContext(), minutes)
    }

    private fun setToolbar() {
        (requireActivity() as AppCompatActivity).setSupportActionBar(binding.toolbar)
        (requireActivity() as AppCompatActivity).supportActionBar?.apply {
            setDisplayShowTitleEnabled(true)
            setDisplayHomeAsUpEnabled(true)
            setDisplayShowHomeEnabled(true)
        }

        binding.toolbar.setNavigationOnClickListener {
            handleCloseRequest()
        }
    }

    private fun setupBackNavigationHandler() {
        requireActivity().onBackPressedDispatcher.addCallback(viewLifecycleOwner) {
            handleCloseRequest()
        }
    }

    private fun handleCloseRequest() {
        if (!hasUnsavedChanges()) {
            findNavController().navigateUp()
            return
        }
        showDiscardChangesDialog()
    }

    private fun showDiscardChangesDialog() {
        MaterialAlertDialogBuilder(requireContext())
            .setTitle(R.string.installed_app_detail_discard_title)
            .setMessage(R.string.installed_app_detail_discard_message)
            .setPositiveButton(R.string.installed_app_detail_discard_confirm) { dialog, _ ->
                dialog.dismiss()
                findNavController().navigateUp()
            }
            .setNegativeButton(R.string.installed_app_detail_discard_cancel) { dialog, _ ->
                dialog.dismiss()
            }
            .show()
    }

    override fun onDestroyView() {
        _binding = null
        super.onDestroyView()
    }

    companion object {
        private const val DEFAULT_DAILY_LIMIT = 60
        private const val MIN_DAILY_LIMIT_MINUTES = 1
        private const val MAX_DAILY_LIMIT_MINUTES = 23 * 60 + 59
        private const val ENABLED_BUTTON_ALPHA = 1f
        private const val DISABLED_BUTTON_ALPHA = 0.5f
    }
}
