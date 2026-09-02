package com.sosmartlabs.momotabletpadres.tabletsettings.times.schoolmode.ui.applist

import android.app.Dialog
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.Window
import android.widget.Toast
import androidx.fragment.app.DialogFragment
import androidx.fragment.app.activityViewModels
import androidx.fragment.app.viewModels
import androidx.recyclerview.widget.LinearLayoutManager
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.databinding.DialogQuickAllowAppsBinding
import com.sosmartlabs.momotabletpadres.tablet.TabletViewModel
import com.sosmartlabs.momotabletpadres.tabletsettings.times.schoolmode.model.SelectableApp
import com.sosmartlabs.momotabletpadres.tabletsettings.times.schoolmode.ui.ViewStateAction
import com.sosmartlabs.momotabletpadres.tabletsettings.times.schoolmode.ui.applist.adapter.SelectableAppAdapter
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber

@AndroidEntryPoint
class AppListPickerDialogFragment : DialogFragment() {

    // ViewModels
    private val schoolModeAppListPickerViewModel: SchoolModeAppListPickerViewModel by viewModels()
    val tabletViewModel: TabletViewModel by activityViewModels()

    // View binding
    private lateinit var binding: DialogQuickAllowAppsBinding

    // Adapter
    private lateinit var adapter: SelectableAppAdapter

    // Data
    private val selectableApps = arrayListOf<SelectableApp>()

    init {
        Timber.d("AppListPickerDialogFragment: init - Initializing dialog fragment")
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Timber.d("AppListPickerDialogFragment: onCreate")
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        Timber.d("AppListPickerDialogFragment: onCreateView - Inflating layout")
        binding = DialogQuickAllowAppsBinding.inflate(layoutInflater, container, false)
        return binding.root
    }

    override fun onCreateDialog(savedInstanceState: Bundle?): Dialog {
        Timber.d("AppListPickerDialogFragment: onCreateDialog - Creating dialog")
        val dialog = super.onCreateDialog(savedInstanceState)
        dialog.window?.requestFeature(Window.FEATURE_NO_TITLE)
        return dialog
    }

    override fun onStart() {
        super.onStart()
        Timber.d("AppListPickerDialogFragment: onStart - Configuring dialog window")
        dialog?.window?.apply {
            val displayMetrics = resources.displayMetrics
            val horizontalMargin = (16 * displayMetrics.density).toInt()
            val verticalMargin = (16 * displayMetrics.density).toInt()
            val width = displayMetrics.widthPixels - 2 * horizontalMargin
            val height = displayMetrics.heightPixels - 2 * verticalMargin
            setLayout(width, height)
            setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))
            Timber.d("AppListPickerDialogFragment: onStart - Window size set to $width x $height")
        } ?: Timber.w("AppListPickerDialogFragment: onStart - Dialog or window is null")
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Timber.d("AppListPickerDialogFragment: onViewCreated - Initializing components")
        setupHiddenViews()
        setupRecyclerView()
        setupButtons()
        setupViewModel()
    }

    private fun setupHiddenViews() {
        Timber.d("AppListPickerDialogFragment: setupHiddenViews - Hiding loading and retry views")
        hideLoadingView()
        hideRetryView()
    }

    private fun setupRecyclerView() {
        Timber.d("AppListPickerDialogFragment: setupRecyclerView - Setting up RecyclerView and adapter")
        adapter = SelectableAppAdapter().apply {
            listener = object : SelectableAppAdapter.Listener {
                override fun onItemSelected(item: SelectableApp) {
                    Timber.d("AppListPickerDialogFragment: onItemSelected - App selection changed: ${item.appName}")
                    updateSelectedAppsInfo()
                }
            }
        }
        with(binding.recyclerView) {
            this.adapter = this@AppListPickerDialogFragment.adapter
            layoutManager = LinearLayoutManager(requireContext())
        }
    }

    private fun setupButtons() {
        Timber.d("AppListPickerDialogFragment: setupButtons - Setting up button listeners")
        with(binding) {
            buttonCancel.setOnClickListener {
                Timber.d("AppListPickerDialogFragment: buttonCancel - Cancel clicked, dismissing dialog")
                dismiss()
            }
            buttonSave.setOnClickListener {
                Timber.d("AppListPickerDialogFragment: buttonSave - Save clicked, processing selected apps")
                val selectedApps = selectableApps.filter { it.selected }
                if (selectedApps.isEmpty()) {
                    Timber.w("AppListPickerDialogFragment: buttonSave - No apps selected, showing error")
                    showErrorMessage(requireContext().getString(R.string.selected_list_is_empty))
                } else {
                    Timber.d("AppListPickerDialogFragment: buttonSave - ${selectedApps.size} apps selected, notifying listener")
                    try {
                        val listener = requireParentFragment() as AppListPickerListener
                        listener.onNewAllowedAppsSelected(selectedApps)
                        dismiss()
                    } catch (e: Exception) {
                        Timber.e(e, "AppListPickerDialogFragment: buttonSave - Error notifying listener")
                        CrashlyticsLog.recordException(e, "AppListPickerDialogFragment: Error notifying AppListPickerListener")
                        showErrorMessage(requireContext().getString(R.string.generic_error_message))
                    }
                }
            }
        }
    }

    private fun setupViewModel() {
        Timber.d("AppListPickerDialogFragment: setupViewModel - Observing ViewModel LiveData")
        schoolModeAppListPickerViewModel.viewStateHandler.observe(viewLifecycleOwner) { actions ->
            Timber.d("AppListPickerDialogFragment: setupViewModel - Received ${actions.size} view state actions")
            actions.forEach(this::applyViewStateAction)
        }

        schoolModeAppListPickerViewModel.selectableAppList.observe(viewLifecycleOwner) { apps ->
            Timber.d("AppListPickerDialogFragment: setupViewModel - Received app list with ${apps.size} apps")
            setData(apps)
        }

        val tablet = tabletViewModel.tablet.value
        if (tablet != null) {
            Timber.d("AppListPickerDialogFragment: setupViewModel - Loading apps for tablet: $tablet")
            schoolModeAppListPickerViewModel.loadSelectableApps(tablet)
        } else {
            Timber.w("AppListPickerDialogFragment: setupViewModel - Tablet is null, cannot load apps")
            CrashlyticsLog.log("AppListPickerDialogFragment: Tablet is null in setupViewModel")
        }
    }

    private fun applyViewStateAction(viewStateAction: ViewStateAction) {
        Timber.d("AppListPickerDialogFragment: applyViewStateAction - Applying view state: $viewStateAction")
        when (viewStateAction) {
            ViewStateAction.SHOW_RETRY -> showRetryView()
            ViewStateAction.HIDE_RETRY -> hideRetryView()
            ViewStateAction.SHOW_LOADING -> showLoadingView()
            ViewStateAction.HIDE_LOADING -> hideLoadingView()
            ViewStateAction.SHOW_DATA -> showDataView()
            ViewStateAction.HIDE_DATA -> hideDataView()
            ViewStateAction.SHOW_TRY_AGAIN_ERROR_MESSAGE -> {
                Timber.e("AppListPickerDialogFragment: applyViewStateAction - Showing try again error message")
                showErrorMessage(requireContext().getString(R.string.generic_error_message))
            }
        }
    }

    private fun setData(data: List<SelectableApp>) {
        Timber.d("AppListPickerDialogFragment: setData - Updating adapter with ${data.size} apps")
        if (data.isNotEmpty()) {
            selectableApps.clear()
            selectableApps.addAll(data)
            adapter.submitList(data)
        } else {
            Timber.w("AppListPickerDialogFragment: setData - Received empty app list")
        }
    }

    private fun updateSelectedAppsInfo() {
        val selectedCount = selectableApps.count { it.selected }
        Timber.d("AppListPickerDialogFragment: updateSelectedAppsInfo - Selected apps count: $selectedCount")
    }

    private fun showMessage(message: String) {
        Timber.d("AppListPickerDialogFragment: showMessage - Displaying toast: $message")
        Toast.makeText(requireContext(), message, Toast.LENGTH_SHORT).show()
    }

    private fun showLoadingView() {
        Timber.d("AppListPickerDialogFragment: showLoadingView - Showing loading indicator")
        with(binding) {
            viewFlipper.displayedChild = 0
            progressIndicator.isIndeterminate = true
        }
    }

    private fun hideLoadingView() {
        Timber.d("AppListPickerDialogFragment: hideLoadingView - Hiding loading indicator")
        with(binding) {
            viewFlipper.displayedChild = 1
            progressIndicator.isIndeterminate = false
        }
    }

    private fun showRetryView() {
        Timber.d("AppListPickerDialogFragment: showRetryView - Showing retry view")
        // Add retry UI logic if needed
    }

    private fun hideRetryView() {
        Timber.d("AppListPickerDialogFragment: hideRetryView - Hiding retry view")
        // Add hide retry UI logic if needed
    }

    private fun showDataView() {
        Timber.d("AppListPickerDialogFragment: showDataView - Showing data view")
        // Add show data UI logic if needed
    }

    private fun hideDataView() {
        Timber.d("AppListPickerDialogFragment: hideDataView - Hiding data view")
        // Add hide data UI logic if needed
    }

    private fun showErrorMessage(message: String) {
        Timber.e("AppListPickerDialogFragment: showErrorMessage - Error: $message")
        CrashlyticsLog.log("AppListPickerDialogFragment: Error occurred: $message")
        showMessage(message)
    }
}
