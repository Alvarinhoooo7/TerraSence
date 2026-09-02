package com.sosmartlabs.momo.watchprofile.dialogs

import android.content.Context
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.core.widget.doOnTextChanged
import androidx.fragment.app.DialogFragment
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.FragmentHeightDialogBinding
import com.sosmartlabs.momo.utils.ValidationToUserProfile


class HeightDialogFragment : DialogFragment() {
    interface EditTextDialogListener {
        fun onTextEditHeightChanged(editFeetDialog: String, editInchesDialog: String)
    }

    private lateinit var listener: EditTextDialogListener

    private lateinit var binding: FragmentHeightDialogBinding
    private lateinit var currentFeet: String
    private lateinit var currentInches: String

    companion object {
        const val CURRENT_FEET = "CURRENT_FEET"
        const val CURRENT_INCHES = "CURRENT_INCHES"
        const val TITLE_TEXT = "TITLE_TEXT"
        const val MIN_FEET = 2
        const val MAX_FEET = 6
        const val MIN_INCHES = 0
        const val MAX_INCHES = 11

        fun newInstance(feet: String?, inches: String?, title: String): HeightDialogFragment {
            val fragment = HeightDialogFragment()
            val bundle = Bundle()
            bundle.putString(CURRENT_FEET, if (feet != "null") feet else "")
            bundle.putString(CURRENT_INCHES, if (inches != "null") inches else "")
            bundle.putString(TITLE_TEXT, title)
            fragment.arguments = bundle
            return fragment
        }
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        binding = FragmentHeightDialogBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val title = requireArguments().getString(TITLE_TEXT)!!
        binding.tvDialogEditTextTitle.text = title

        currentFeet = requireArguments().getString(CURRENT_FEET)!!
        currentInches = requireArguments().getString(CURRENT_INCHES)!!

        with(binding.etFeet) {
            setTextColor(resources.getColor(R.color.black))
            setText(currentFeet, TextView.BufferType.EDITABLE)
            doOnTextChanged { editFeetDialog, start, count, after ->
                currentFeet = "$editFeetDialog"
            }
        }

        with(binding.etInch) {
            setTextColor(resources.getColor(R.color.black))
            setText(currentInches, TextView.BufferType.EDITABLE)
            doOnTextChanged { editInchesDialog, start, count, after ->
                currentInches = "$editInchesDialog"
            }
        }

        binding.btDialogEditTextCancel.setOnClickListener {
            ValidationToUserProfile.hideKeyboard(requireView(), requireContext())
            dismiss()
        }
        binding.btDialogEditTextOk.setOnClickListener {

            if (currentFeet.isBlank() || currentFeet.isEmpty() || currentFeet.toInt() < MIN_FEET || currentFeet.toInt() > MAX_FEET) {
                binding.etFeet.error = requireContext().getString(R.string.error_value)
            } else {
                if (currentInches.isBlank() || currentInches.isEmpty() || currentInches.toInt() < MIN_INCHES || currentInches.toInt() > MAX_INCHES) {
                    binding.etInch.error = requireContext().getString(R.string.error_value)
                } else {
                    listener.onTextEditHeightChanged(currentFeet, currentInches)
                    ValidationToUserProfile.hideKeyboard(requireView(), requireContext())
                    dismiss()
                }
            }
        }
    }

    override fun onAttach(context: Context) {
        super.onAttach(context)
        try {
            // Instantiate the EditTextDialogListener so we can send events to the host
            listener = context as EditTextDialogListener
        } catch (e: ClassCastException) {
            // The activity doesn't implement the interface, throw exception
            throw ClassCastException(
                (context.toString() +
                        " must implement EditTextDialogListener")
            )
        }
    }
}