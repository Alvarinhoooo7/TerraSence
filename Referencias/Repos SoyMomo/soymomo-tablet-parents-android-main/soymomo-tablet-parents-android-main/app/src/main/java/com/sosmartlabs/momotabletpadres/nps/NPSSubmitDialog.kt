package com.sosmartlabs.momotabletpadres.nps

import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.DialogFragment
import com.sosmartlabs.momotabletpadres.databinding.NpsSubmitDialogFragmentBinding

class NPSSubmitDialog : DialogFragment() {
    lateinit var binding: NpsSubmitDialogFragmentBinding

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View {
        binding = NpsSubmitDialogFragmentBinding.inflate(inflater)
        binding.submit.setOnClickListener {
            dialog?.dismiss()
        }
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        dialog?.window?.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))
    }

}
