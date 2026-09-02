package com.sosmartlabs.momo.sim.ui.fragments.forms

import android.app.Activity
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.util.Patterns
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.graphics.Color
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.graphics.drawable.toDrawable
import androidx.fragment.app.DialogFragment
import androidx.fragment.app.activityViewModels
import com.google.android.libraries.places.api.Places
import com.google.android.libraries.places.api.model.Place
import com.google.android.libraries.places.widget.PlaceAutocomplete
import com.google.android.libraries.places.widget.PlaceAutocompleteActivity
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.parse.ParseUser
import com.sosmartlabs.momo.BuildConfig
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.RequestSimFormFragmentBinding
import com.sosmartlabs.momo.sim.ui.RequestSimUiEvent
import com.sosmartlabs.momo.sim.ui.RequestSimViewModel
import com.sosmartlabs.momo.utils.ui.googleplaces.PlacesAutocompleteUtils
import com.sosmartlabs.momo.utils.PhoneNumberUtils
import com.sosmartlabs.momo.utils.validation.NationalIdValidation
import com.sosmartlabs.momo.utils.validation.chile.RutInputFormatter
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber
import java.util.Locale

@AndroidEntryPoint
class RequestSimFormFragment : DialogFragment(R.layout.request_sim_form_fragment) {

    private lateinit var binding: RequestSimFormFragmentBinding
    private val requestSimViewModel: RequestSimViewModel by activityViewModels()

    private val placesAutocompleteLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK && result.data != null) {
            val prediction = PlaceAutocomplete.getPredictionFromIntent(result.data!!)
            if (prediction == null) {
                Timber.e("Places Error: null prediction")
                return@registerForActivityResult
            }
            val sessionToken = PlaceAutocomplete.getSessionTokenFromIntent(result.data!!)
            PlacesAutocompleteUtils.fetchPlace(
                fragment = this,
                placeId = prediction.placeId,
                placeFields = listOf(
                    Place.Field.ID,
                    Place.Field.DISPLAY_NAME,
                    Place.Field.FORMATTED_ADDRESS,
                    Place.Field.ADDRESS_COMPONENTS,
                    Place.Field.LOCATION
                ),
                sessionToken = sessionToken,
                callback = { place ->
                fillAddressData(place)
                }
            )
        } else if (result.resultCode == PlaceAutocompleteActivity.RESULT_ERROR && result.data != null) {
            val status = PlaceAutocomplete.getResultStatusFromIntent(result.data!!)
            Timber.e("Places Error: ${status?.statusMessage ?: "unknown status"}")
        }
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        binding = RequestSimFormFragmentBinding.inflate(inflater, container, false)
        dialog?.window?.setBackgroundDrawable(Color.TRANSPARENT.toDrawable())
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        if (!Places.isInitialized()) {
            Places.initializeWithNewPlacesApiEnabled(
                requireContext().applicationContext,
                BuildConfig.googlePlacesApiKey
            )
        }

        setupToolbar()
        // For now campaigns are Chilean, guide the user with the RUT format
        binding.tilPersonalId.hint = getString(R.string.request_sim_form_label_personal_id_rut)
        setupListeners()
        prefillFromCurrentUser()
        observeViewModel()
    }

    override fun onStart() {
        super.onStart()
        dialog?.window?.setLayout(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        )
    }

    private fun setupToolbar() {
        binding.toolbar.title = getString(R.string.request_sim_form_title)
        binding.toolbar.setNavigationIcon(androidx.appcompat.R.drawable.abc_ic_ab_back_material)
        binding.toolbar.setNavigationOnClickListener { dismiss() }
    }

    private fun prefillFromCurrentUser() {
        val user = ParseUser.getCurrentUser() ?: return

        if (binding.editTextName.text.isNullOrBlank()) {
            val firstName = user.getString("firstName").orEmpty()
            if (firstName.isNotBlank()) {
                binding.editTextName.setText(firstName)
            }
        }

        if (binding.editTextLastName.text.isNullOrBlank()) {
            val lastName = user.getString("lastName").orEmpty()
            if (lastName.isNotBlank()) {
                binding.editTextLastName.setText(lastName)
            }
        }

        if (binding.editTextEmail.text.isNullOrBlank()) {
            user.email?.takeIf { it.isNotBlank() }?.let { email ->
                binding.editTextEmail.setText(email)
            }
        }

        if (binding.editTextPhone.text.isNullOrBlank()) {
            val phone = user.getString("phone").orEmpty().trim()
            if (phone.isNotBlank()) {
                if (phone.contains("+")) {
                    // Let the CountryCodePicker parse and split country code + local number
                    binding.ccp.fullNumber = phone
                } else {
                    binding.editTextPhone.setText(phone)
                }
            }
        }
    }

    private fun setupListeners() {
        binding.editTextAddress.apply {
            isFocusable = false
            isClickable = true
            setOnClickListener { openAddressAutocomplete() }
        }

        // Disable user input on fields that are populated by maps autocomplete.
        // Forces the user to pick a real address via Places and avoids manual-entry mistakes.
        // Dim the whole TextInputLayout so the read-only state is visually obvious.
        listOf(
            binding.tilCity,
            binding.tilState,
            binding.tilPostalCode,
        ).forEach { til ->
            til.alpha = 0.55f
            til.editText?.apply {
                isFocusable = false
                isFocusableInTouchMode = false
                isClickable = false
                isLongClickable = false
                keyListener = null
            }
        }

        // Live RUT formatter: keep the verification dash before the last character as the user types.
        binding.editTextPersonalId.addTextChangedListener(object : TextWatcher {
            private var isFormatting = false

            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) = Unit
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) = Unit

            override fun afterTextChanged(s: Editable?) {
                if (s == null || isFormatting) return
                val current = s.toString()
                val formatted = RutInputFormatter.format(current)
                if (formatted == current) return
                isFormatting = true
                s.replace(0, s.length, formatted)
                binding.editTextPersonalId.setSelection(formatted.length)
                isFormatting = false
            }
        })

        binding.buttonSubmit.setOnClickListener {
            binding.formErrorMessage.visibility = View.GONE
            clearErrors()

            val payload = readPayloadOrNull()
            if (payload == null) {
                binding.formErrorMessage.visibility = View.VISIBLE
                return@setOnClickListener
            }

            requestSimViewModel.submitSimOrderFromForm(
                fullName = payload.fullName,
                userPersonalId = payload.personalId,
                email = payload.email,
                phone = payload.phone,
                address = payload.address,
                optionalAddress = payload.optionalAddress,
                state = payload.state,
                city = payload.city,
                postalCode = payload.postalCode,
                source = "appForm"
            )
        }

        // Link the CountryCodePicker with the phone input so it can build/validate the full number
        binding.ccp.registerCarrierNumberEditText(binding.editTextPhone)
    }

    private data class Payload(
        val fullName: String,
        val personalId: String,
        val email: String,
        val phone: String,
        val address: String,
        val optionalAddress: String?,
        val state: String,
        val city: String,
        val postalCode: String
    )

    private fun readPayloadOrNull(): Payload? {
        val name = binding.editTextName.text?.toString()?.trim().orEmpty()
        val lastName = binding.editTextLastName.text?.toString()?.trim().orEmpty()
        val localPhone = binding.editTextPhone.text?.toString()?.trim().orEmpty()
        val phone = "${binding.ccp.selectedCountryCodeWithPlus}$localPhone"
            .filterNot { it.isWhitespace() }
        val email = binding.editTextEmail.text?.toString()?.trim()?.lowercase(Locale.getDefault()).orEmpty()
        val personalId = binding.editTextPersonalId.text?.toString()?.trim().orEmpty()
        val address = binding.editTextAddress.text?.toString()?.trim().orEmpty()
        val optionalAddress = binding.editTextOptionalAddress.text?.toString()?.trim().takeIf { !it.isNullOrBlank() }
        val city = binding.editTextCity.text?.toString()?.trim().orEmpty()
        val state = binding.editTextState.text?.toString()?.trim().orEmpty()
        val postalCode = binding.editTextPostalCode.text?.toString()?.trim().orEmpty()

        var valid = true

        if (name.isBlank()) {
            binding.tilName.error = getString(R.string.subscription_form_error_field_required)
            valid = false
        }
        if (lastName.isBlank()) {
            binding.tilLastName.error = getString(R.string.subscription_form_error_field_required)
            valid = false
        }
        if (localPhone.isBlank()) {
            binding.tilPhone.error = getString(R.string.subscription_form_error_field_required)
            valid = false
        } else if (!PhoneNumberUtils.isValidPhoneNumber(binding.ccp)) {
            binding.tilPhone.error = getString(R.string.subscription_form_error_phone_number)
            valid = false
        }
        if (email.isBlank() || !Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
            binding.tilEmail.error = getString(R.string.subscription_form_error_invalid_email)
            valid = false
        }
        if (personalId.isBlank() || !NationalIdValidation.validatePersonalId(personalId)) {
            binding.tilPersonalId.error = getString(R.string.subscription_form_error_invalid_personal_id)
            valid = false
        }
        if (address.isBlank()) {
            binding.tilAddress.error = getString(R.string.subscription_form_error_field_required)
            valid = false
        }
        if (city.isBlank()) {
            binding.tilCity.error = getString(R.string.subscription_form_error_field_required)
            valid = false
        }
        if (state.isBlank()) {
            binding.tilState.error = getString(R.string.subscription_form_error_field_required)
            valid = false
        }
        if (postalCode.isBlank()) {
            binding.tilPostalCode.error = getString(R.string.subscription_form_error_field_required)
            valid = false
        }

        if (!valid) {
            Timber.d("RequestSimFormFragment: Validation failed")
            return null
        }

        val fullName = "$name $lastName".trim()

        return Payload(
            fullName = fullName,
            personalId = personalId,
            email = email,
            phone = phone,
            address = address,
            optionalAddress = optionalAddress,
            state = state,
            city = city,
            postalCode = postalCode
        )
    }

    private fun clearErrors() {
        binding.tilName.error = null
        binding.tilLastName.error = null
        binding.tilPhone.error = null
        binding.tilEmail.error = null
        binding.tilPersonalId.error = null
        binding.tilAddress.error = null
        binding.tilCity.error = null
        binding.tilState.error = null
        binding.tilPostalCode.error = null
    }

    private fun observeViewModel() {
        requestSimViewModel.activeCampaign.observe(viewLifecycleOwner) { campaign ->
            campaign ?: return@observe
            val discountPercentage = campaign.discountPercentage.toInt()
            val discountPeriodMonths = campaign.discountPeriodMonths
            binding.tvDescription.text = getString(
                R.string.request_sim_form_description,
                discountPercentage,
                discountPeriodMonths
            )
        }

        requestSimViewModel.isSubmittingOrder.observe(viewLifecycleOwner) { isSubmitting ->
            binding.buttonSubmit.isEnabled = !isSubmitting
            binding.buttonSubmit.text = if (isSubmitting) getString(R.string.loading) else getString(R.string.button_ready)
        }

        requestSimViewModel.uiEvent.observe(viewLifecycleOwner) { event ->
            event ?: return@observe
            when (event) {
                is RequestSimUiEvent.ShowRetryDialog -> {
                    requestSimViewModel.onUiEventConsumed()
                    showRetryDialog()
                }
                is RequestSimUiEvent.ShowSuccessDialog -> {
                    requestSimViewModel.onUiEventConsumed()
                    showSuccessDialog()
                }
            }
        }
    }

    private fun showRetryDialog() {
        MaterialAlertDialogBuilder(requireContext())
            .setTitle(getString(R.string.connection_error))
            .setMessage(getString(R.string.request_sim_form_submitted_error))
            .setNegativeButton(R.string.button_cancel) { dialog, _ -> dialog.dismiss() }
            .setPositiveButton(R.string.button_retry) { dialog, _ ->
                dialog.dismiss()
                binding.buttonSubmit.performClick()
            }
            .show()
    }

    private fun showSuccessDialog() {
        MaterialAlertDialogBuilder(requireContext())
            .setMessage(getString(R.string.request_sim_form_submitted_successfully))
            .setPositiveButton(R.string.button_ok) { dialog, _ ->
                dialog.dismiss()
                requestSimViewModel.dismissSuccessAndClosePopup()
                dismiss()
            }
            .show()
    }

    private fun openAddressAutocomplete() {
        val intent = PlaceAutocomplete.IntentBuilder()
            .build(requireContext())
        placesAutocompleteLauncher.launch(intent)
    }

    private fun fillAddressData(place: Place) {
        var streetName = ""
        var streetNumber = ""
        var city = ""
        var state = ""
        var postalCode = ""
        val country = Locale.getDefault().country.uppercase(Locale.ROOT)

        place.addressComponents?.asList()?.forEach { component ->
            val types = component.types

            if (types.contains("route")) {
                streetName = component.name
            }
            if (types.contains("street_number")) {
                streetNumber = component.name
            }

            when (country) {
                "US" -> {
                    if (types.contains("administrative_area_level_1")) {
                        state = component.shortName ?: component.name
                    }
                    if (types.contains("locality")) {
                        city = component.name
                    }
                    if (types.contains("postal_code")) {
                        postalCode = component.name
                    }
                }

                "DE" -> {
                    if (types.contains("postal_code")) {
                        postalCode = component.name
                    }
                    if (types.contains("locality")) {
                        city = component.name
                    }
                }

                "ES" -> {
                    if (types.contains("administrative_area_level_1")) {
                        state = component.name
                    }
                    if (types.contains("postal_code")) {
                        postalCode = component.name
                    }
                    if (types.contains("locality")) {
                        city = component.name
                    }
                }

                else -> {
                    if (types.contains("administrative_area_level_1")) {
                        state = component.name
                    }
                    if (types.contains("postal_code")) {
                        postalCode = component.name
                    }
                    if (types.contains("locality")) {
                        city = component.name
                    }
                }
            }
        }

        val fullAddress = if (streetName.isNotEmpty() && streetNumber.isNotEmpty()) {
            "$streetName $streetNumber"
        } else {
            place.displayName ?: place.formattedAddress ?: ""
        }

        binding.editTextAddress.setText(fullAddress)
        binding.editTextCity.setText(city)
        binding.editTextState.setText(state)
        binding.editTextPostalCode.setText(postalCode)
    }
}
