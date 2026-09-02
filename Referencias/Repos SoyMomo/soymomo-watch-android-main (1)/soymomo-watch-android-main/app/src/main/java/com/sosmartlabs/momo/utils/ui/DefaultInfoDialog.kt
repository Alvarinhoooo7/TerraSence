package com.sosmartlabs.momo.utils.ui

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.DialogFragment
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.DialogDefaultInfoBinding

class DefaultInfoDialog: DialogFragment(R.layout.dialog_default_info) {

    /**
     * Binding
     */
    private lateinit var binding: DialogDefaultInfoBinding

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        binding = DialogDefaultInfoBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val title = requireArguments().getString("title")
        val description = requireArguments().getString("description")
        setTitle(title)
        setDescription(description)
        setListener()
    }

    private fun setTitle(title: String?) {
        title?.let {
            binding.dialogTitle.text = it
        }
    }

    private fun setDescription(description: String?) {
        description?.let {
            binding.dialogDescription.text = it
        }
    }

    private fun setListener() {
        binding.dialogButtonClose.setOnClickListener {
            dismiss()
        }
    }
}