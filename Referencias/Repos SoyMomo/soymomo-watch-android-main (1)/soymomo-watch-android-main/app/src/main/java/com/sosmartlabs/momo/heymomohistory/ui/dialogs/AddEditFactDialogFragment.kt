package com.sosmartlabs.momo.heymomohistory.ui.dialogs

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import androidx.fragment.app.DialogFragment
import androidx.fragment.app.activityViewModels
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.DialogAddEditFactBinding
import com.sosmartlabs.momo.heymomohistory.data.model.Fact
import com.sosmartlabs.momo.heymomohistory.data.model.FactType
import com.sosmartlabs.momo.heymomohistory.ui.HeyMomoHistoryViewModel
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber

@AndroidEntryPoint
class AddEditFactDialogFragment : DialogFragment() {

    private var _binding: DialogAddEditFactBinding? = null
    private val binding get() = _binding!!
    
    private val heyMomoHistoryViewModel: HeyMomoHistoryViewModel by activityViewModels()
    
    private lateinit var deviceId: String
    private var existingFact: Fact? = null
    private val predefinedFactTypes = FactType.getPredefinedTypes()
    private var isCustomFactType = false

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = DialogAddEditFactBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        deviceId = arguments?.getString(ARG_DEVICE_ID) ?: ""
        existingFact = arguments?.getSerializable(ARG_FACT) as? Fact

        setupDialog()
        setupSpinner()
        setupButtons()
        prefillData()
    }

    private fun setupDialog() {
        // Set title based on whether we're adding or editing
        binding.dialogTitle.text = if (existingFact == null) {
            getString(R.string.title_add_fact)
        } else {
            getString(R.string.title_edit_fact)
        }
    }

    private fun setupSpinner() {
        // Include predefined types + "Custom" option
        val displayNames = predefinedFactTypes.map { it.getDisplayName(requireContext()) } + 
                          listOf(getString(R.string.custom))
        
        val adapter = ArrayAdapter(
            requireContext(),
            android.R.layout.simple_spinner_item,
            displayNames
        )
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        binding.spinnerFactType.adapter = adapter

        // Update predicate label when spinner selection changes
        binding.spinnerFactType.setOnItemSelectedListener(
            object : android.widget.AdapterView.OnItemSelectedListener {
                override fun onItemSelected(
                    parent: android.widget.AdapterView<*>?,
                    view: View?,
                    position: Int,
                    id: Long
                ) {
                    // Check if "Custom" is selected
                    isCustomFactType = position == predefinedFactTypes.size
                    
                    if (isCustomFactType) {
                        // Show custom fact type input field
                        binding.layoutCustomFactType.visibility = View.VISIBLE
                        binding.labelPredicate.visibility = View.GONE
                    } else {
                        // Hide custom fact type input field and show predicate label
                        binding.layoutCustomFactType.visibility = View.GONE
                        binding.labelPredicate.visibility = View.VISIBLE
                        updatePredicateLabel(position)
                    }
                }

                override fun onNothingSelected(parent: android.widget.AdapterView<*>?) {
                    // NO-OP
                }
            }
        )
    }

    private fun setupButtons() {
        binding.buttonCancel.setOnClickListener {
            dismiss()
        }

        binding.buttonSave.setOnClickListener {
            saveFact()
        }
    }

    private fun prefillData() {
        existingFact?.let { fact ->
            // Find the index of the fact type by matching predicate
            val index = predefinedFactTypes.indexOfFirst { 
                it.getBackendPredicate() == fact.predicate 
            }
            
            if (index >= 0) {
                // Predefined fact type
                binding.spinnerFactType.setSelection(index)
            } else {
                // Custom fact type - select "Custom" option and show the custom name
                binding.spinnerFactType.setSelection(predefinedFactTypes.size)
                if (fact.factType is FactType.Custom) {
                    binding.inputCustomFactType.setText(fact.factType.customName)
                }
            }
            
            binding.inputValue.setText(fact.objectValue)
        }
    }

    private fun updatePredicateLabel(position: Int) {
        if (position >= 0 && position < predefinedFactTypes.size) {
            val factType = predefinedFactTypes[position]
            // Display the localized predicate string (e.g., "pet name is", "favorite color is")
            binding.labelPredicate.text = requireContext().getString(factType.getPredicateRes())
        }
    }

    private fun saveFact() {
        val selectedPosition = binding.spinnerFactType.selectedItemPosition
        if (selectedPosition < 0) {
            Timber.w("Invalid fact type selection")
            return
        }

        // Determine if this is a predefined or custom fact type
        val factType = if (selectedPosition < predefinedFactTypes.size) {
            // Predefined fact type
            predefinedFactTypes[selectedPosition]
        } else {
            // Custom fact type
            val customName = binding.inputCustomFactType.text?.toString()?.trim()
            if (customName.isNullOrEmpty()) {
                binding.layoutCustomFactType.error = getString(R.string.error_empty_custom_type)
                return
            }
            // Convert custom name to snake_case predicate
            val customPredicate = customName.lowercase().trim().replace(Regex("\\s+"), "_")
            FactType.Custom(customName, customPredicate)
        }

        val value = binding.inputValue.text?.toString()?.trim()

        if (value.isNullOrEmpty()) {
            binding.inputLayoutValue.error = getString(R.string.error_empty_value)
            return
        }

        val predicate = factType.getBackendPredicate()

        val fact = if (existingFact != null) {
            // Update existing fact
            existingFact!!.copy(
                predicate = predicate,
                objectValue = value,
                factType = factType
            )
        } else {
            // Create new fact
            Fact(
                id = null,
                subject = "child",
                predicate = predicate,
                objectValue = value,
                factType = factType
            )
        }

        Timber.d("Saving fact: $fact")

        if (existingFact != null) {
            heyMomoHistoryViewModel.updateFact(deviceId, "watch", fact)
        } else {
            heyMomoHistoryViewModel.addFact(deviceId, "watch", fact)
        }

        dismiss()
    }

    override fun onStart() {
        super.onStart()
        // Make dialog full width
        dialog?.window?.setLayout(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        )
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }

    companion object {
        private const val ARG_DEVICE_ID = "deviceId"
        private const val ARG_FACT = "fact"

        fun newInstance(deviceId: String, fact: Fact?): AddEditFactDialogFragment {
            return AddEditFactDialogFragment().apply {
                arguments = Bundle().apply {
                    putString(ARG_DEVICE_ID, deviceId)
                    fact?.let { putSerializable(ARG_FACT, it) }
                }
            }
        }
    }
}

