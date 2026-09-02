package com.sosmartlabs.momotabletpadres.tabletsettings.times.schoolmode

import android.app.Dialog
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.fragment.app.viewModels
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.snackbar.Snackbar
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.utils.DateUtil
import com.sosmartlabs.momotabletpadres.databinding.DialogTimeSchoolModeBinding
import com.sosmartlabs.momotabletpadres.databinding.TabletFragmentTimeSchoolModeBinding
import com.sosmartlabs.momotabletpadres.tablet.TabletViewModel
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.utils.WindowInsetsUtils
import com.sosmartlabs.momotabletpadres.tabletsettings.times.schoolmode.model.SelectableApp
import com.sosmartlabs.momotabletpadres.tabletsettings.times.schoolmode.ui.ViewStateAction
import com.sosmartlabs.momotabletpadres.tabletsettings.times.schoolmode.ui.applist.adapter.DismissibleAppAdapter
import com.sosmartlabs.momotabletpadres.tabletsettings.times.schoolmode.ui.applist.AppListPickerDialogFragment
import com.sosmartlabs.momotabletpadres.tabletsettings.times.schoolmode.ui.applist.AppListPickerListener
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber
import java.time.LocalTime

@AndroidEntryPoint
class SchoolModeFragment : Fragment(), AppListPickerListener {

    // ───────────────────────── view-binding ─────────────────────────
    private var _binding: TabletFragmentTimeSchoolModeBinding? = null
    private val binding get() = _binding!!

    // ───────────────────────── view-models ──────────────────────────
    private val schoolModeViewModel: SchoolModeViewModel by viewModels()
    private val tabletViewModel: TabletViewModel by activityViewModels()

    // ───────────────────────── runtime state ────────────────────────
    private lateinit var tablet: Tablet
    private lateinit var dismissibleAppAdapter: DismissibleAppAdapter

    // ───────────────────────── lifecycle ────────────────────────────
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        Timber.d("SchoolModeFragment: onCreateView - inflating layout")
        _binding = TabletFragmentTimeSchoolModeBinding.inflate(inflater, container, false)
        setupToolbar()
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        Timber.d("SchoolModeFragment: onViewCreated - initializing UI and observers")
        super.onViewCreated(view, savedInstanceState)
        WindowInsetsUtils.applyEdgeToEdgeInsets(
            root = binding.root,
            topView = binding.appBarLayout,
            bottomView = binding.contentScrollView
        )
        setupRecyclerView()
        setupButtonsAndViews()
        setupObservers()
    }

    override fun onDestroyView() {
        Timber.d("SchoolModeFragment: onDestroyView - cleaning up binding")
        super.onDestroyView()
        _binding = null
    }

    private fun setupToolbar() {
        Timber.d("SchoolModeFragment: setupToolbar - configuring toolbar")
        (activity as AppCompatActivity).apply {
            setSupportActionBar(binding.toolbar)
            supportActionBar?.apply {
                setDisplayShowTitleEnabled(false)
                setDisplayHomeAsUpEnabled(true)
                setDisplayShowHomeEnabled(true)
            }
        }
        setHasOptionsMenu(true)
    }

    // ───────────────────────── setup helpers ────────────────────────
    private fun setupRecyclerView() {
        Timber.d("SchoolModeFragment: setupRecyclerView - setting up allowed apps RecyclerView")
        dismissibleAppAdapter = DismissibleAppAdapter().apply {
            listener = object : DismissibleAppAdapter.Listener {
                override fun onItemSelected(item: SelectableApp) {
                    Timber.d("SchoolModeFragment: App selected: ${item.appName}")
                }
            }
        }
        _binding!!.allowedAppsRecyclerView.apply {
            adapter = dismissibleAppAdapter
            layoutManager = LinearLayoutManager(requireContext(), RecyclerView.VERTICAL, false)
        }
    }

    private fun setupButtonsAndViews() {
        Timber.d("SchoolModeFragment: setupButtonsAndViews - setting up buttons and status")
        with(_binding!!) {
            // initial status text
            statusDescription.text = if (statusSwitch.isChecked) {
                getString(R.string.settings_variable_status_enabled)
            } else {
                getString(R.string.settings_variable_status_disabled)
            }

            // enable/disable switch
            statusSwitch.setOnClickListener {
                Timber.d("SchoolModeFragment: statusSwitch clicked")
                val newState = !(schoolModeViewModel.schoolModeState.value ?: false)
                schoolModeViewModel.updateSchoolModeState(tablet, newState)
                statusDescription.text = if (newState) {
                    showMessage(getString(R.string.school_mode_enabled))
                    getString(R.string.settings_variable_status_enabled)
                } else {
                    getString(R.string.settings_variable_status_disabled)
                }
                Timber.d("SchoolModeFragment: School mode state updated to $newState")
            }

            // add-apps button
            addButton.setOnClickListener {
                Timber.d("SchoolModeFragment: addButton clicked - showing app picker dialog")
                getAppListPickerDialog().show(childFragmentManager, "app_list_picker_dialog")
            }
        }
    }

    private fun setupObservers() {
        Timber.d("SchoolModeFragment: setupObservers - observing LiveData")
        // generic view-state actions (loading / retry …)
        schoolModeViewModel.viewStateHandler.observe(viewLifecycleOwner) { actions ->
            Timber.d("SchoolModeFragment: viewStateHandler actions: $actions")
            actions.forEach(this::applyViewStateAction)
        }

        // on/off switch state
        schoolModeViewModel.schoolModeState.observe(viewLifecycleOwner) { enabled ->
            Timber.d("SchoolModeFragment: schoolModeState changed: $enabled")
            _binding!!.statusSwitch.isChecked = enabled
            _binding!!.progressBar.visibility = View.GONE
            setViews(enabled)
        }

        // school-hours picker text
        schoolModeViewModel.hoursOfOperation.observe(viewLifecycleOwner) { (start, end) ->
            Timber.d("SchoolModeFragment: hoursOfOperation changed: $start to $end")
            val from = DateUtil.convertLocalTimeToDate(start)
            val to   = DateUtil.convertLocalTimeToDate(end)

            _binding!!.fromTimeSet.apply {
                text = from
                setOnClickListener { showTimePickerDialog() }
            }
            _binding!!.toTimeSet.apply {
                text = to
                setOnClickListener { showTimePickerDialog() }
            }
        }

        // allowed apps list
        schoolModeViewModel.allowedAppList.observe(viewLifecycleOwner) { list ->
            Timber.d("SchoolModeFragment: allowedAppList changed: ${list.size} apps")
            updateRecyclerData(list)
        }

        // tablet selection
        tabletViewModel.currentTablet.observe(viewLifecycleOwner) { current ->
            Timber.d("SchoolModeFragment: currentTablet changed: $current")
            tablet = current
            schoolModeViewModel.loadSchoolModeSettings(current)
        }
    }

    // ───────────────────────── adapters / UI updates ────────────────
    private fun updateRecyclerData(list: List<SelectableApp>) {
        Timber.d("SchoolModeFragment: updateRecyclerData - updating adapter with ${list.size} apps")
        dismissibleAppAdapter.submitList(list)
        if (_binding!!.statusSwitch.isChecked) {
            _binding!!.allowedAppsViewFlipper.displayedChild =
                if (list.isEmpty()) 1 else 0
        }
    }

    private fun setViews(enabled: Boolean) {
        Timber.d("SchoolModeFragment: setViews - enabled=$enabled")
        with(_binding!!) {
            statusSwitch.isEnabled = true
            statusDescription.text = getString(
                if (enabled) R.string.settings_variable_status_enabled
                else R.string.settings_variable_status_disabled
            )
            layoutDailySchedule.visibility = if (enabled) View.VISIBLE else View.GONE
            if (enabled) {
                allowedAppsViewFlipper.displayedChild =
                    if (dismissibleAppAdapter.currentList.isEmpty()) 1 else 0
            }
        }
    }

    // ───────────────────────── picker dialog ─────────────────────────
    private fun showTimePickerDialog() {
        Timber.d("SchoolModeFragment: showTimePickerDialog - showing time picker dialog")
        val dialog = Dialog(requireContext())
        val b = DialogTimeSchoolModeBinding.inflate(layoutInflater)
        dialog.setContentView(b.root)

        // 1. Grab the raw times
        val (start, end) = schoolModeViewModel.hoursOfOperation.value
            ?: (LocalTime.MIDNIGHT to LocalTime.NOON)   // sensible fallback

        Timber.d("SchoolModeFragment: showTimePickerDialog - current times: start=$start, end=$end")

        // 2. Populate the pickers – they speak 24 h natively
        b.fromHoursPicker.run {
            minValue = 0;  maxValue = 23;  value = start.hour
        }
        b.fromMinutesPicker.run {
            minValue = 0;  maxValue = 59;  value = start.minute
        }
        b.toHoursPicker.run {
            minValue = 0;  maxValue = 23;  value = end.hour
        }
        b.toMinutesPicker.run {
            minValue = 0;  maxValue = 59;  value = end.minute
        }

        // 3. Save / cancel
        b.buttonCancel.setOnClickListener {
            Timber.d("SchoolModeFragment: showTimePickerDialog - cancel clicked")
            dialog.dismiss()
        }
        b.buttonSave.setOnClickListener {
            val newStart = LocalTime.of(b.fromHoursPicker.value, b.fromMinutesPicker.value)
            val newEnd   = LocalTime.of(b.toHoursPicker.value,   b.toMinutesPicker.value)
            Timber.d("SchoolModeFragment: showTimePickerDialog - save clicked, newStart=$newStart, newEnd=$newEnd")

            if (newStart.isAfter(newEnd)) {
                Timber.w("SchoolModeFragment: showTimePickerDialog - invalid time range: $newStart is after $newEnd")
                Toast.makeText(requireContext(),
                    getString(R.string.card_use_range_error), Toast.LENGTH_SHORT).show()
            } else {
                schoolModeViewModel.updateHoursOfOperation(tablet, newStart, newEnd)
                Timber.d("SchoolModeFragment: showTimePickerDialog - hours of operation updated")
            }
            dialog.dismiss()
        }

        dialog.show()
    }

    // ───────────────────────── view-state actions ───────────────────
    private fun applyViewStateAction(action: ViewStateAction) {
        Timber.d("SchoolModeFragment: applyViewStateAction - $action")
        // currently stubs; extend if you hook loading / retry states
    }

    // ───────────────────────── AppListPickerListener ────────────────
    override fun onNewAllowedAppsSelected(list: List<SelectableApp>) {
        Timber.d("SchoolModeFragment: onNewAllowedAppsSelected - $list")
        schoolModeViewModel.updateAllowedApps(tablet, list)
        showMessage(getString(R.string.allowed_apps_customized, list.size))
        Timber.d("SchoolModeFragment: onNewAllowedAppsSelected - allowed apps updated")
    }

    // ───────────────────────── misc helpers ─────────────────────────
    private fun getAppListPickerDialog() = AppListPickerDialogFragment()

    private fun showMessage(message: String) {
        Timber.d("SchoolModeFragment: showMessage - $message")
        Snackbar.make(binding.root, message, Snackbar.LENGTH_SHORT)
            .setAction(R.string.ef_ok) {}
            .show()
    }
}