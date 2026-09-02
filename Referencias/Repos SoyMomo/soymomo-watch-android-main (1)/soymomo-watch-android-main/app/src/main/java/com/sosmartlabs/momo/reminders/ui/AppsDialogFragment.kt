package com.sosmartlabs.momo.reminders.ui

import android.app.Dialog
import android.os.Bundle
import android.view.View
import androidx.fragment.app.DialogFragment
import androidx.recyclerview.widget.LinearLayoutManager
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.sosmartlabs.momo.databinding.DialogWatchApplicationsBinding
import com.sosmartlabs.momo.reminders.model.WatchApplication

class AppsDialogFragment(private val listener: Listener) : DialogFragment() {

    private lateinit var binding: DialogWatchApplicationsBinding
    private var isLoading = true
    private lateinit var appsData : List<WatchApplication>
    private var isError = false

    /**
     * Adapter
     */
    private lateinit var watchAppAdapter: WatchApplicationAdapter

    interface Listener {
        fun onAppSelected(app: WatchApplication)
    }

    override fun onCreateDialog(savedInstanceState: Bundle?): Dialog {
        binding = DialogWatchApplicationsBinding.inflate(layoutInflater)
        if (isLoading){
            showLoading()
        }else if (::appsData.isInitialized){
            showData(appsData)
        }else if (isError){
            showError()
        }
        watchAppAdapter = WatchApplicationAdapter {
            listener.onAppSelected(it)
            dismiss()
        }

        with(binding) {
            rvWatchApplications.adapter = watchAppAdapter
            rvWatchApplications.layoutManager = LinearLayoutManager(requireContext())
        }
        return MaterialAlertDialogBuilder(requireContext())
            .setView(binding.root)
            .create()
    }

    fun showLoading(){
        isLoading = true
        if (!::binding.isInitialized) {
            return
        }
        with(binding){
            loading.visibility = View.VISIBLE
            errorLoadingWatchApplications.visibility = View.GONE
            rvWatchApplications.visibility = View.GONE
        }
    }

    fun showData(watchApps: List<WatchApplication>){
        appsData = watchApps
        if (!::binding.isInitialized) {
            return
        }

        if (watchApps.isEmpty()){
            showEmpty()
        } else {
            with(binding) {
                loading.visibility = View.GONE
                errorLoadingWatchApplications.visibility = View.GONE
                rvWatchApplications.visibility = View.VISIBLE
                emptyWatchApplications.visibility = View.GONE
                watchAppAdapter.submitList(watchApps)
            }
        }
    }

    fun showEmpty(){
        with(binding){
            loading.visibility = View.GONE
            errorLoadingWatchApplications.visibility = View.GONE
            emptyWatchApplications.visibility = View.VISIBLE
            rvWatchApplications.visibility = View.GONE
        }
    }

    fun showError(){
        isError = true
        if (!::binding.isInitialized) {
            return
        }
        with(binding){
            loading.visibility = View.GONE
            errorLoadingWatchApplications.visibility = View.VISIBLE
            emptyWatchApplications.visibility = View.GONE
            rvWatchApplications.visibility = View.GONE
        }
    }
}