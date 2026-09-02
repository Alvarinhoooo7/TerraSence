package com.sosmartlabs.momotabletpadres.sim.ui.fragments.forms

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Context
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.util.Patterns
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.inputmethod.InputMethodManager
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.Toolbar
import androidx.core.os.bundleOf
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.findNavController
import com.google.android.libraries.places.api.Places
import com.google.android.libraries.places.api.model.AutocompletePrediction
import com.google.android.libraries.places.api.model.Place
import com.google.android.libraries.places.api.net.PlacesClient
import com.google.android.libraries.places.api.net.kotlin.awaitFetchPlace
import com.google.android.libraries.places.widget.PlaceAutocomplete
import com.google.android.libraries.places.widget.PlaceAutocompleteActivity
import com.google.android.material.datepicker.CalendarConstraints
import com.google.android.material.datepicker.DateValidatorPointBackward
import com.google.android.material.datepicker.MaterialDatePicker
import com.google.android.material.textfield.TextInputLayout
import com.google.firebase.Firebase
import com.google.firebase.crashlytics.crashlytics
import com.parse.ParseUser
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.databinding.SubscriptionNewFormFragmentBinding
import com.sosmartlabs.momotabletpadres.sim.SimActivity
import com.sosmartlabs.momotabletpadres.sim.model.SubscriptionPlan
import com.sosmartlabs.momotabletpadres.sim.model.SubscriptionUserInfoFormStatus
import com.sosmartlabs.momotabletpadres.sim.model.SubscriptionsUserInfo
import com.sosmartlabs.momotabletpadres.sim.ui.NewSubscriptionViewModel
import com.sosmartlabs.momotabletpadres.utils.CountryProvider
import com.sosmartlabs.momotabletpadres.utils.PhoneNumberUtils
import com.sosmartlabs.momotabletpadres.utils.WindowInsetsUtils
import com.sosmartlabs.momotabletpadres.utils.firebase.FirebaseRemoteConfigRepository
import com.sosmartlabs.momotabletpadres.utils.support.PrivacyPolicyLauncher
import com.sosmartlabs.momotabletpadres.utils.support.TermsAndConditionsLauncher
import com.sosmartlabs.momotabletpadres.utils.ui.DefaultErrorDialog
import com.sosmartlabs.momotabletpadres.utils.ui.DefaultIcons
import com.sosmartlabs.momotabletpadres.utils.ui.GradientBackground
import com.sosmartlabs.momotabletpadres.glide.loadImage
import com.sosmartlabs.momotabletpadres.utils.validation.NationalIdValidation
import kotlinx.coroutines.launch
import timber.log.Timber
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.time.LocalDate
import java.time.format.DateTimeParseException
import java.util.*

@SuppressLint("SetTextI18n")
class SubscriptionFormFragment : Fragment() {

    /**
     * Binding
     */
    private lateinit var binding: SubscriptionNewFormFragmentBinding

    val toolbar: Toolbar get() = binding.toolbar

    private val toolbarTitle: String get() = getString(R.string.subscription_form_title)

    /**
     * ViewModel
     */
    private val newSubscriptionViewModel: NewSubscriptionViewModel by activityViewModels()

    /**
     * Parameters
     */
    private lateinit var country: String

    private var requiresPersonalIdValidation = false
    private var requiresAddressValidation = false

    /**
     * Activity intent results
     */
    private val startForResultPlaceAutocomplete = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) {
        when (it.resultCode) {
            PlaceAutocompleteActivity.RESULT_OK -> {
                it.data?.let { data ->
                    val prediction: AutocompletePrediction? = PlaceAutocomplete.getPredictionFromIntent(data)
                    val placeId = prediction?.placeId ?: run {
                        Timber.e("Places autocomplete: missing placeId from result")
                        Toast.makeText(
                            context,
                            R.string.toast_error_searching_address,
                            Toast.LENGTH_LONG
                        ).show()
                        return@let
                    }

                    val placesClient: PlacesClient = Places.createClient(requireActivity())
                    viewLifecycleOwner.lifecycleScope.launch {
                        try {
                            val response = placesClient.awaitFetchPlace(
                                placeId,
                                listOf(Place.Field.FORMATTED_ADDRESS, Place.Field.ADDRESS_COMPONENTS)
                            )
                            val place = response.place
                            Timber.d("Places fetchPlace success: $place")
                            prefillFormWithPlace(place)
                        } catch (e: Exception) {
                            Timber.e(e, "Places fetchPlace failed")
                            Toast.makeText(
                                context,
                                R.string.toast_error_searching_address,
                                Toast.LENGTH_LONG
                            ).show()
                            Firebase.crashlytics.recordException(e)
                        }
                    }
                }
            }
            PlaceAutocompleteActivity.RESULT_ERROR -> {
                it.data?.let { data ->
                    val status = PlaceAutocomplete.getPredictionFromIntent(data)
                    Timber.e("Places autocomplete error: $status")
                    Toast.makeText(
                        context,
                        R.string.toast_error_searching_address,
                        Toast.LENGTH_LONG
                    ).show()
                }
            }
            Activity.RESULT_CANCELED -> {
                Timber.d("Places autocomplete cancelled by user")
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Timber.d("onCreate")
        // Places SDK is already initialized in Application class
        country = if (newSubscriptionViewModel.currentSimCountry.value != null) {
            newSubscriptionViewModel.currentSimCountry.value!!
        } else {
            CountryProvider.getCountry(requireContext())
        }
        Timber.d("Country set to: $country")
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        Timber.d("onCreateView")
        binding = SubscriptionNewFormFragmentBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Timber.d("onViewCreated")
        setupToolbar()
        setFormFieldsByCountry()
        setupListeners()
        observeViewModel()

        WindowInsetsUtils.applyEdgeToEdgeInsets(
            root = binding.root,
            topView = binding.appBarLayout,
            bottomView = binding.contentScrollView,
            includeImeBottom = true,
        )
    }

    private fun setupToolbar() {
        Timber.d("Setting up toolbar")
        with(activity as AppCompatActivity) {
            setSupportActionBar(toolbar)
            supportActionBar?.apply {
                title = toolbarTitle
                if (activity is SimActivity) {
                    setDisplayShowTitleEnabled(true)
                    setDisplayHomeAsUpEnabled(true)
                    setDisplayShowHomeEnabled(true)
                }
            }
        }
    }

    private fun setupListeners() {
        Timber.d("Setting up form field listeners")
        setupNameListener()
        setupLastnameListener()
        setupEmailListener()
        setupBirthdayListener()
        setupPersonalIdListener()
        setupPhoneNumberListener()

        binding.parentLayout.setOnClickListener {
            Timber.d("Parent layout clicked - hiding keyboard")
            it.hideKeyboard()
        }

        binding.buttonNext.setOnClickListener {
            Timber.d("Next button clicked - validating form")
            if (!isFormInfoValid()) {
                Timber.d("Form validation failed")
                return@setOnClickListener
            }
            val params = createUserInfoMap()
            Timber.d("Form validation passed, creating subscription with params: $params")
            newSubscriptionViewModel.createSubscriptionUserInfo(params, country)
        }

        binding.textViewTc.setOnClickListener {
            Timber.d("Terms & Conditions clicked")
            TermsAndConditionsLauncher.launchTermsAndConditionsLauncher(requireContext())
        }

        binding.textViewNp.setOnClickListener {
            Timber.d("Privacy Policy clicked") 
            PrivacyPolicyLauncher.launchPrivacyPolicyLauncher(requireContext())
        }

        binding.editTextAddress.setOnClickListener {
            Timber.d("Address field clicked")
            it.clearFocus()
            openPlacesAutocomplete()
        }

        binding.tilAddress.setEndIconOnClickListener {
            Timber.d("Address end icon clicked")
            it.clearFocus()
            openPlacesAutocomplete()
        }
    }

    private fun observeViewModel() {
        Timber.d("Setting up ViewModel observers")
        newSubscriptionViewModel.currentUser.observe(viewLifecycleOwner) {
            Timber.d("Current user updated: $it")
            try {
                prefillFormWithUser(it)
            } catch (e: Exception) {
                Timber.e(e, "Error prefilling form with user data")
            }
        }

        newSubscriptionViewModel.currentSubscriptionUserInfo.observe(viewLifecycleOwner) { subscriptionsUserInfo ->
            Timber.d("Current subscription user info updated: $subscriptionsUserInfo")
            try {
                prefillFormWithSubscriptionUserInfo(subscriptionsUserInfo)
                newSubscriptionViewModel.getApioUserCards(subscriptionsUserInfo)
            } catch (e: Exception) {
                Timber.e(e, "Error prefilling form with subscription info")
            }
        }

        newSubscriptionViewModel.currentSubscriptionPlan.observe(viewLifecycleOwner) { currentSubscriptionPlan ->
            Timber.d("Current subscription plan updated: $currentSubscriptionPlan")
            setSubscriptionPlanDataView(currentSubscriptionPlan)
        }

        newSubscriptionViewModel.currentSubscriptionUserInfoFormStatus.observe(viewLifecycleOwner) { status ->
            Timber.d("Form status updated: $status")
            when (status) {
                SubscriptionUserInfoFormStatus.DEFAULT -> {
                    hideProgressIndicator()
                }
                SubscriptionUserInfoFormStatus.SUCCESS -> {
                    hideProgressIndicator()
                    val action = when {
                        FirebaseRemoteConfigRepository.simGlobalSkipPayment -> {
                            Timber.d("Payment skip enabled, navigating to skip fragment")
                            when (activity) {
                                is SimActivity -> R.id.action_add_sim_newSubscriptionForm_to_subscriptionPaymentSkipFragment
                                else -> null
                            }
                        }
                        newSubscriptionViewModel.currentSubscriptionPlan.value?.paymentProvider?.name.equals("Apio", ignoreCase = true) -> {
                            Timber.d("Navigating to Apio cards fragment")
                            when (activity) {
                                is SimActivity -> R.id.action_add_sim_newSubscriptionForm_to_apioUserCardsFragment
                                else -> null
                            }
                        }
                        newSubscriptionViewModel.currentSubscriptionPlan.value?.paymentProvider?.name.equals("Stripe", ignoreCase = true) -> {
                            Timber.d("Navigating to Stripe webview fragment")
                            when (activity) {
                                is SimActivity -> R.id.action_add_sim_newSubscriptionForm_to_stripeWebViewFragment
                                else -> null
                            }
                        }
                        else -> {
                            Timber.d("Defaulting to Stripe webview fragment")
                            when (activity) {
                                is SimActivity -> R.id.action_add_sim_newSubscriptionForm_to_stripeWebViewFragment
                                else -> null
                            }
                        }
                    }
                    action?.let { a -> navigateById(a) }
                }
                SubscriptionUserInfoFormStatus.SAVING -> {
                    showProgressIndicator()
                }
                SubscriptionUserInfoFormStatus.ERROR_NAME -> {
                    binding.tilName.showError(R.string.subscription_form_error_personal_info)
                }
                SubscriptionUserInfoFormStatus.ERROR_LAST_NAME -> {
                    binding.tilLastName.showError(R.string.subscription_form_error_personal_info)
                }
                SubscriptionUserInfoFormStatus.ERROR_BIRTHDAY -> {
                    binding.tilBirthday.showError(R.string.subscription_form_error_personal_info)
                }
                SubscriptionUserInfoFormStatus.ERROR_PERSONAL_ID-> {
                    binding.tilPersonalId.showError(R.string.subscription_form_error_personal_info)
                }
                SubscriptionUserInfoFormStatus.ERROR_EMAIL -> {
                    binding.tilEmail.showError(R.string.subscription_form_error_email)
                }
                SubscriptionUserInfoFormStatus.ERROR_PHONE_NUMBER -> {
                    binding.tilUserPhone.showError(R.string.subscription_form_error_phone_number)
                }
                SubscriptionUserInfoFormStatus.ERROR_CHECKBOX -> {
                    showErrorDialog(getString(R.string.subscription_form_error_title), getString(R.string.subscription_form_error_checkbox))
                }
                SubscriptionUserInfoFormStatus.ERROR_ADDRESS -> {
                    binding.tilAddress.showError(R.string.subscription_form_error_address)
                }
                else -> {
                    showErrorDialog(getString(R.string.subscription_form_error_title), status.toString())
                }
            }
        }
    }

    private fun setSubscriptionPlanDataView(subscriptionPlan: SubscriptionPlan) {
        Timber.d("Setting subscription plan view data: $subscriptionPlan")
        with(subscriptionPlan) {
            binding.planInfo.let {planInfo ->
                logo?.let {
                    planInfo.planLogo.loadImage(it.url, fallback = DefaultIcons.SIM_SUBSCRIPTION_PLAN)
                } ?: planInfo.planLogo.setImageResource(DefaultIcons.SIM_SUBSCRIPTION_PLAN)
                planInfo.planTitle.text = title
                planInfo.planPrice.text = formatPrice(price, currencyCode, currency)
                planInfo.planBillingPeriod.text = "/${billingPeriod}"
                val gradient = GradientBackground.createGradient(
                    backgroundImageColors,
                    GradientDrawable.Orientation.RIGHT_LEFT
                )
                planInfo.planCard.background = gradient
            }
        }
    }

    private fun prefillFormWithUser(user: ParseUser) {
        Timber.d("Prefilling form with user data: $user")
        try {
            user.get("firstName")?.let {
                binding.tilName.editText?.setText(it.toString())
            } ?: Timber.w("First name is null or empty")

            user.get("lastName")?.let {
                binding.tilLastName.editText?.setText(it.toString())
            } ?: Timber.w("Last name is null or empty")

            user.get("phone")?.let {
                val phoneNumber = PhoneNumberUtils.parsePhoneCountryCode(it.toString())
                binding.tilUserPhone.editText?.setText(phoneNumber)
            } ?: Timber.w("Phone number is null or empty")

            user.email?.let {
                binding.tilEmail.editText?.setText(it)
            } ?: Timber.w("Email is null or empty")

            user.get("birthday")?.let {
                if (it is Date) {
                    val formattedBirthday = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).apply {
                        timeZone = TimeZone.getTimeZone("UTC")
                    }.format(it)
                    binding.tilBirthday.editText?.setText(formattedBirthday)
                } else {
                    Timber.w("Birthday is not a Date object")
                }
            } ?: Timber.w("Birthday is null or empty")

            binding.checkboxNp.isChecked = true
            binding.checkboxTc.isChecked = true
        } catch (e: Exception) {
            Timber.e(e, "Error prefilling form with user data")
        }
    }

    private fun prefillFormWithSubscriptionUserInfo(subscriptionsUserInfo: SubscriptionsUserInfo) {
        Timber.d("Prefilling form with subscription info: $subscriptionsUserInfo")
        subscriptionsUserInfo.personalId?.apply {
            NationalIdValidation.formatPersonalId(this, country)
        }?.let {
            Timber.d("Setting personal ID: $it")
            binding.tilPersonalId.editText!!.setText(it)
        }

        subscriptionsUserInfo.phone?.let {
            Timber.d("Setting phone: $it")
            binding.tilUserPhone.editText!!.setText(PhoneNumberUtils.parsePhoneCountryCode(it.toString()))
        }

        subscriptionsUserInfo.birthday?.let {
            Timber.d("Setting birthday: $it")
            binding.tilBirthday.editText!!.setText(it)
        }

        subscriptionsUserInfo.address?.let {
            Timber.d("Setting address: $it")
            binding.tilAddress.editText!!.setText(it)
        }

        subscriptionsUserInfo.optionalAddress?.let {
            Timber.d("Setting optional address: $it")
            binding.tilOptionalAddress.editText!!.setText(it)
        }

        subscriptionsUserInfo.city?.let {
            Timber.d("Setting city: $it")
            binding.tilCity.editText!!.setText(it)
        }

        subscriptionsUserInfo.state?.let {
            Timber.d("Setting state: $it")
            binding.tilState.editText!!.setText(it)
        }

        subscriptionsUserInfo.postalCode?.let {
            Timber.d("Setting postal code: $it")
            binding.tilPostalCode.editText!!.setText(it)
        }
    }

    private fun prefillFormWithPlace(place: Place) {
        Timber.d("Prefilling form with place data: $place")
        // Variables
        var route: String? = null
        var streetNumber: String? = null

        // For each country, decide how to parse Place information
        when (country) {
            "CL" -> {
                place.addressComponents?.let { addressComponents ->
                    for (addressComponent in addressComponents.asList()) {
                        if (addressComponent.types.contains("street_number")) {
                            streetNumber = addressComponent.name
                        }
                        if (addressComponent.types.contains("route")) {
                            route = addressComponent.shortName
                        }
                        if (addressComponent.types.contains("administrative_area_level_1")) {
                            binding.tilCity.editText!!.setText(addressComponent.name)
                        }
                        if (addressComponent.types.contains("administrative_area_level_3")) {
                            binding.tilState.editText!!.setText(addressComponent.name)
                        }
                        if (addressComponent.types.contains("postal_code")) {
                            binding.tilPostalCode.editText!!.setText(addressComponent.name)
                        }
                        if (addressComponent.types.contains("locality")) {
                            binding.tilState.editText!!.setText(addressComponent.name)
                        }
                    }
                }
            }
            "ES" -> {
                place.addressComponents?.let { addressComponents ->
                    for (addressComponent in addressComponents.asList()) {
                        if (addressComponent.types.contains("street_number")) {
                            streetNumber = addressComponent.name
                        }
                        if (addressComponent.types.contains("route")) {
                            route = addressComponent.shortName
                        }
                        if (addressComponent.types.contains("administrative_area_level_1")) {
                            binding.tilCity.editText!!.setText(addressComponent.name)
                        }
                        if (addressComponent.types.contains("administrative_area_level_3")) {
                            binding.tilState.editText!!.setText(addressComponent.name)
                        }
                        if (addressComponent.types.contains("postal_code")) {
                            binding.tilPostalCode.editText!!.setText(addressComponent.name)
                        }
                        if (addressComponent.types.contains("locality")) {
                            binding.tilState.editText!!.setText(addressComponent.name)
                        }
                    }
                }
            }
            "DE" -> {
                place.addressComponents?.let { addressComponents ->
                    for (addressComponent in addressComponents.asList()) {
                        if (addressComponent.types.contains("street_number")) {
                            streetNumber = addressComponent.name
                        }
                        if (addressComponent.types.contains("route")) {
                            route = addressComponent.shortName
                        }
                        if (addressComponent.types.contains("administrative_area_level_1")) {
                            binding.tilState.editText!!.setText(addressComponent.name)
                        }
                        if (addressComponent.types.contains("postal_code")) {
                            binding.tilPostalCode.editText!!.setText(addressComponent.name)
                        }
                        if (addressComponent.types.contains("locality")) {
                            binding.tilCity.editText!!.setText(addressComponent.name)
                        }
                    }
                }
            }
            "US" -> {
                place.addressComponents?.let { addressComponents ->
                    for (addressComponent in addressComponents.asList()) {
                        if (addressComponent.types.contains("street_number")) {
                            streetNumber = addressComponent.name
                        }
                        if (addressComponent.types.contains("route")) {
                            route = addressComponent.shortName
                        }
                        if (addressComponent.types.contains("administrative_area_level_1")) {
                            binding.tilState.editText!!.setText(addressComponent.shortName)
                        }
                        if (addressComponent.types.contains("locality")) {
                            binding.tilCity.editText!!.setText(addressComponent.name)
                        }
                        if (addressComponent.types.contains("postal_code")) {
                            binding.tilPostalCode.editText!!.setText(addressComponent.name)
                        }
                    }
                }
            }
            else -> {
                place.addressComponents?.let { addressComponents ->
                    for (addressComponent in addressComponents.asList()) {
                        if (addressComponent.types.contains("street_number")) {
                            streetNumber = addressComponent.name
                        }
                        if (addressComponent.types.contains("route")) {
                            route = addressComponent.shortName
                        }
                        if (addressComponent.types.contains("administrative_area_level_1")) {
                            binding.tilCity.editText!!.setText(addressComponent.name)
                        }
                        if (addressComponent.types.contains("administrative_area_level_3")) {
                            binding.tilState.editText!!.setText(addressComponent.name)
                        }
                        if (addressComponent.types.contains("postal_code")) {
                            binding.tilPostalCode.editText!!.setText(addressComponent.name)
                        }
                        if (addressComponent.types.contains("locality")) {
                            binding.tilState.editText!!.setText(addressComponent.name)
                        }
                    }
                }
            }
        }

        // Construct address string
        val street = "$route $streetNumber"
        binding.tilAddress.editText!!.setText(street)

        // Remove shown errors
        if (binding.tilAddress.isErrorEnabled) binding.tilAddress.isErrorEnabled = false
        if (binding.tilOptionalAddress.isErrorEnabled) binding.tilOptionalAddress.isErrorEnabled = false
        if (binding.tilCity.isErrorEnabled) binding.tilCity.isErrorEnabled = false
        if (binding.tilState.isErrorEnabled) binding.tilState.isErrorEnabled = false
        if (binding.tilPostalCode.isErrorEnabled) binding.tilPostalCode.isErrorEnabled = false
    }

    private fun setFormFieldsByCountry() {
        Timber.d("Setting form fields by country: $country")
        when (country) {
            "CL" -> {
                requiresAddressValidation = false
                requiresPersonalIdValidation = false
                hidePersonalIdField()
                hideAddressFields()
            }
            "US" -> {
                requiresAddressValidation = true
                requiresPersonalIdValidation = false
                hidePersonalIdField()
                showAddressFields()
            }
            "ES" -> {
                requiresAddressValidation = true
                requiresPersonalIdValidation = true
                showAddressFields()
            }
            "DE" -> {
                requiresAddressValidation = true
                requiresPersonalIdValidation = false
                hidePersonalIdField()
                showAddressFields()
            }
            else -> {
                requiresAddressValidation = false
                requiresPersonalIdValidation = false
                hidePersonalIdField()
                hideAddressFields()
            }
        }
    }

    private fun showAddressFields() {
        Timber.d("Showing address fields")
        binding.addressLabel.visibility = View.VISIBLE
        binding.tilAddress.visibility = View.VISIBLE
        binding.tilOptionalAddress.visibility = View.VISIBLE
        binding.tilPostalCode.visibility = View.VISIBLE
        binding.tilCity.visibility = View.VISIBLE
        binding.tilState.visibility = View.VISIBLE
    }

    private fun hideAddressFields() {
        Timber.d("Hiding address fields")
        binding.addressLabel.visibility = View.GONE
        binding.tilAddress.visibility = View.GONE
        binding.tilOptionalAddress.visibility = View.GONE
        binding.tilPostalCode.visibility = View.GONE
        binding.tilCity.visibility = View.GONE
        binding.tilState.visibility = View.GONE
    }

    private fun showPersonalIdField() {
        Timber.d("Showing personal ID field")
        binding.tilPersonalId.visibility = View.VISIBLE
    }

    private fun hidePersonalIdField() {
        Timber.d("Hiding personal ID field")
        binding.tilPersonalId.visibility = View.GONE
    }

    private fun navigateById(navId: Int, bundle: Bundle = bundleOf()) {
        Timber.d("Navigating to destination with id: $navId")
        findNavController().navigate(navId, bundle)
    }

    override fun onDestroyView() {
        super.onDestroyView()
        Timber.d("onDestroyView")
        dispose()
    }

    private fun dispose() {
        Timber.d("Disposing resources")
    }

    private fun showErrorDialog(title: String, description: String?) {
        Timber.d("Showing error dialog - title: $title, description: $description")
        // First, we reset the status of possible errors and hide progress indicator
        newSubscriptionViewModel.resetCurrentSubscriptionUserInfoStatus()
        hideProgressIndicator()
        // Show dialog
        val defaultErrorDialog = DefaultErrorDialog()
        defaultErrorDialog.arguments = bundleOf(
            "icon" to "",
            "title" to title,
            "description" to description,
        )
        defaultErrorDialog.show(childFragmentManager, title)
    }

    private fun TextInputLayout.showError(errorMessageId: Int) {
        isErrorEnabled = true
        this.error = getString(errorMessageId)
    }

    private fun setupNameListener() {
        binding.tilName.editText?.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(charSequence: CharSequence, i: Int, i1: Int, i2: Int) {

            }

            override fun onTextChanged(charSequence: CharSequence, i: Int, i1: Int, i2: Int) {
                if (binding.tilName.isErrorEnabled) binding.tilName.isErrorEnabled = false
            }

            override fun afterTextChanged(editable: Editable) {

            }
        })
    }

    private fun setupLastnameListener() {
        binding.tilLastName.editText?.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(charSequence: CharSequence, i: Int, i1: Int, i2: Int) {

            }

            override fun onTextChanged(charSequence: CharSequence, i: Int, i1: Int, i2: Int) {
                if (binding.tilLastName.isErrorEnabled) binding.tilLastName.isErrorEnabled = false
            }

            override fun afterTextChanged(editable: Editable) {

            }
        })
    }

    private fun setupBirthdayListener() {
        binding.tilBirthday.editText!!.isFocusable = false
        binding.tilBirthday.editText!!.setOnClickListener {
            val constraintsBuilder = CalendarConstraints.Builder()
                .setValidator(DateValidatorPointBackward.now())
                .build()

            val datePicker = MaterialDatePicker.Builder.datePicker()
                .setTitleText(getString(R.string.select_date))
                .setInputMode(MaterialDatePicker.INPUT_MODE_TEXT)
                .setSelection(MaterialDatePicker.todayInUtcMilliseconds())
                .setCalendarConstraints(constraintsBuilder)
                .build()

            datePicker.show(this@SubscriptionFormFragment.requireActivity().supportFragmentManager, "DATE_PICKER")

            datePicker.addOnPositiveButtonClickListener {
                val calendar = Calendar.getInstance()
                calendar.timeInMillis = it
                val format = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).apply {
                    timeZone = TimeZone.getTimeZone("UTC")
                }
                binding.tilBirthday.editText!!.setText(format.format(calendar.time))
            }
        }
        binding.tilBirthday.editText?.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(charSequence: CharSequence, i: Int, i1: Int, i2: Int) {

            }

            override fun onTextChanged(charSequence: CharSequence, i: Int, i1: Int, i2: Int) {
                if (binding.tilBirthday.isErrorEnabled) binding.tilBirthday.isErrorEnabled = false
            }

            override fun afterTextChanged(editable: Editable) {

            }
        })
    }

    private fun setupPersonalIdListener() {
        binding.tilPersonalId.editText?.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(charSequence: CharSequence, i: Int, i1: Int, i2: Int) {

            }

            override fun onTextChanged(charSequence: CharSequence, i: Int, i1: Int, i2: Int) {
                if (binding.tilPersonalId.isErrorEnabled) binding.tilPersonalId.isErrorEnabled = false
            }

            override fun afterTextChanged(editable: Editable) {

            }
        })
    }

    private fun setupPhoneNumberListener() {
        binding.tilUserPhone.editText?.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(charSequence: CharSequence, i: Int, i1: Int, i2: Int) {}
            override fun onTextChanged(charSequence: CharSequence, i: Int, i1: Int, i2: Int) {
                if (binding.tilUserPhone.isErrorEnabled) binding.tilUserPhone.isErrorEnabled = false
            }

            override fun afterTextChanged(editable: Editable) {}
        })
        binding.ccp.registerCarrierNumberEditText(binding.tilUserPhone.editText)
    }

    private fun setupEmailListener() {
        binding.tilEmail.editText?.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(charSequence: CharSequence, i: Int, i1: Int, i2: Int) {

            }

            override fun onTextChanged(charSequence: CharSequence, i: Int, i1: Int, i2: Int) {
                if (binding.tilEmail.isErrorEnabled) binding.tilEmail.isErrorEnabled = false
            }

            override fun afterTextChanged(editable: Editable) {
                var s = editable.toString()
                if (s != s.lowercase(Locale.getDefault())) {
                    s = s.lowercase(Locale.getDefault())
                    binding.tilEmail.editText?.setText(s)
                    binding.tilEmail.editText?.setSelection(binding.tilEmail.editText?.text.toString().length)
                }
            }
        })
    }

    private fun isFormInfoValid(): Boolean {
        var isValid = true
        val accumulatedErrors = mutableListOf<SubscriptionUserInfoFormStatus>()

        if (binding.tilName.editText!!.text.isNullOrBlank()) {
            accumulatedErrors.add(SubscriptionUserInfoFormStatus.ERROR_NAME)
            binding.tilName.error = getString(R.string.subscription_form_error_personal_info)
            isValid = false
        }
        if (binding.tilLastName.editText!!.text.isNullOrBlank()) {
            accumulatedErrors.add(SubscriptionUserInfoFormStatus.ERROR_LAST_NAME)
            binding.tilLastName.error = getString(R.string.subscription_form_error_personal_info)
            isValid = false
        }
        if (binding.tilBirthday.editText!!.text.isNullOrBlank()) {
            accumulatedErrors.add(SubscriptionUserInfoFormStatus.ERROR_BIRTHDAY)
            binding.tilBirthday.error = getString(R.string.edittext_error_birthday)
            isValid = false
        } else {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                try {
                    val date = LocalDate.parse(binding.tilBirthday.editText!!.text)
                    // check if date if before 18 years
                    if (date.isAfter(LocalDate.now().minusYears(18))) {
                        accumulatedErrors.add(SubscriptionUserInfoFormStatus.ERROR_BIRTHDAY)
                        binding.tilBirthday.error = getString(R.string.edittext_error_birthday_18)
                        isValid = false
                    }
                } catch (err: DateTimeParseException) {
                    accumulatedErrors.add(SubscriptionUserInfoFormStatus.ERROR_BIRTHDAY)
                    binding.tilBirthday.error = getString(R.string.edittext_error_birthday)
                    isValid = false
                }
            }
        }
        if (binding.tilEmail.editText!!.text.isNullOrBlank() || !Patterns.EMAIL_ADDRESS.matcher(binding.tilEmail.editText!!.text).matches()) {
            accumulatedErrors.add(SubscriptionUserInfoFormStatus.ERROR_EMAIL)
            binding.tilEmail.editText!!.error = getString(R.string.subscription_form_error_email)
            isValid = false
        }
        if (binding.tilAddress.editText!!.text.isNullOrBlank() && requiresAddressValidation) {
            accumulatedErrors.add(SubscriptionUserInfoFormStatus.ERROR_ADDRESS)
            binding.tilAddress.error = getString(R.string.subscription_form_error_address)
            isValid = false
        }
        if (binding.tilCity.editText!!.text.isNullOrBlank() && requiresAddressValidation) {
            accumulatedErrors.add(SubscriptionUserInfoFormStatus.ERROR_ADDRESS)
            binding.tilCity.error = getString(R.string.subscription_form_error_address)
            isValid = false
        }
        if (!PhoneNumberUtils.isValidPhoneNumber(binding.ccp)) {
            accumulatedErrors.add(SubscriptionUserInfoFormStatus.ERROR_PHONE_NUMBER)
            binding.tilUserPhone.error = getString(R.string.subscription_form_error_phone_number)
            isValid = false
        }
        if (!binding.checkboxTc.isChecked) {
            accumulatedErrors.add(SubscriptionUserInfoFormStatus.ERROR_CHECKBOX)
            isValid = false
        }
        if (!binding.checkboxNp.isChecked) {
            accumulatedErrors.add(SubscriptionUserInfoFormStatus.ERROR_CHECKBOX)
            isValid = false
        }

        when (country) {
            "CL" -> {
                if ((binding.tilPersonalId.editText!!.text.isNullOrBlank() || !NationalIdValidation.validatePersonalId(binding.tilPersonalId.editText!!.text.toString(), country)) && requiresPersonalIdValidation) {
                    accumulatedErrors.add(SubscriptionUserInfoFormStatus.ERROR_PERSONAL_ID)
                    binding.tilPersonalId.error = getString(R.string.subscription_form_error_personal_info)
                    isValid = false
                }
                if (binding.tilState.editText!!.text.isNullOrBlank()  && requiresAddressValidation) {
                    accumulatedErrors.add(SubscriptionUserInfoFormStatus.ERROR_ADDRESS)
                    binding.tilState.error = getString(R.string.subscription_form_error_address)
                    isValid = false
                }
            }
            "ES" -> {
                if ((binding.tilPersonalId.editText!!.text.isNullOrBlank() || !NationalIdValidation.validatePersonalId(binding.tilPersonalId.editText!!.text.toString(), country)) && requiresPersonalIdValidation) {
                    accumulatedErrors.add(SubscriptionUserInfoFormStatus.ERROR_PERSONAL_ID)
                    binding.tilPersonalId.error = getString(R.string.subscription_form_error_personal_info)
                    isValid = false
                }
                if (binding.tilState.editText!!.text.isNullOrBlank() && requiresAddressValidation) {
                    accumulatedErrors.add(SubscriptionUserInfoFormStatus.ERROR_ADDRESS)
                    binding.tilState.error = getString(R.string.subscription_form_error_address)
                    isValid = false
                }
            }
            "DE" -> {
                if (binding.tilPostalCode.editText!!.text.isNullOrBlank() && requiresAddressValidation) {
                    accumulatedErrors.add(SubscriptionUserInfoFormStatus.ERROR_ADDRESS)
                    binding.tilPostalCode.error = getString(R.string.subscription_form_error_address)
                    isValid = false
                }
                if (binding.tilState.editText!!.text.isNullOrBlank() && requiresAddressValidation) {
                    accumulatedErrors.add(SubscriptionUserInfoFormStatus.ERROR_ADDRESS)
                    binding.tilState.error = getString(R.string.subscription_form_error_address)
                    isValid = false
                }
            }
            "US" -> {
                if (binding.tilPostalCode.editText!!.text.isNullOrBlank() && requiresAddressValidation) {
                    accumulatedErrors.add(SubscriptionUserInfoFormStatus.ERROR_ADDRESS)
                    binding.tilPostalCode.error = getString(R.string.subscription_form_error_address)
                    isValid = false
                }
                if (binding.tilState.editText!!.text.isNullOrBlank() && requiresAddressValidation) {
                    accumulatedErrors.add(SubscriptionUserInfoFormStatus.ERROR_ADDRESS)
                    binding.tilState.error = getString(R.string.subscription_form_error_address)
                    isValid = false
                }
            }
            else -> {
                // No-Op
            }
        }

        if (!isValid) {
            newSubscriptionViewModel.setCurrentSubscriptionUserInfoFormStatus(accumulatedErrors.first())
        }

        binding.formErrorMessage.visibility = if (isValid) View.GONE else View.VISIBLE
        return isValid
    }

    private fun createUserInfoMap(): MutableMap<String, Any> {
        val params = mutableMapOf<String, Any>()
        params["email"] = binding.tilEmail.editText!!.text.toString()
        params["name"] = binding.tilName.editText!!.text.toString().replaceFirstChar { it.uppercase() }
        params["lastname"] = binding.tilLastName.editText!!.text.toString().replaceFirstChar { it.uppercase() }
        params["birthday"] = binding.tilBirthday.editText!!.text.toString()
        params["phone"] = "${binding.ccp.selectedCountryCodeWithPlus}${binding.tilUserPhone.editText!!.text}".filterNot { it.isWhitespace() }

        val personalId = binding.tilPersonalId.editText!!.text.toString()
        NationalIdValidation.formatPersonalId(personalId, country)?.let {
            params["personalId"] = it
        }

        params["address"] = binding.tilAddress.editText!!.text.toString().replaceFirstChar { it.uppercase() }
        params["optionalAddress"] = binding.tilOptionalAddress.editText!!.text.toString()
        params["country"] = country
        params["city"] = binding.tilCity.editText!!.text.toString().replaceFirstChar { it.uppercase() }
        params["state"] = binding.tilState.editText!!.text.toString().replaceFirstChar { it.uppercase() }
        params["postalCode"] = binding.tilPostalCode.editText!!.text.toString()
        return params
    }

    private fun openPlacesAutocomplete() {
        try {
            val regionCode = country.ifBlank { CountryProvider.getCountry(requireActivity()) }
            val autocompleteIntent = PlaceAutocomplete.createIntent(requireActivity()) {
                setRegionCode(regionCode)
            }
            startForResultPlaceAutocomplete.launch(autocompleteIntent)
            Timber.d("Starting PlaceAutocomplete")
        } catch (e: Exception) {
            Toast.makeText(requireContext(), R.string.geocoder_error_unavailable, Toast.LENGTH_LONG).show()
            Timber.e(e, "PlaceAutocomplete failed to start")
            Firebase.crashlytics.recordException(e)
        }
    }

    private fun formatPrice(price: Float, currencyCode: String, currencySymbol: String): String {
        return try {
            val currency = Currency.getInstance(currencyCode)
            val numberFormat = NumberFormat.getCurrencyInstance().apply {
                this.currency = currency
                maximumFractionDigits = currency.defaultFractionDigits
            }
            numberFormat.format(price)
        } catch (e: Exception) {
            "$price $currencySymbol"
        }
    }

    private fun View.hideKeyboard() {
        val inputMethodManager = context.getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager
        inputMethodManager.hideSoftInputFromWindow(windowToken, 0)
        clearFocus()
    }

    private fun showProgressIndicator() {
        binding.buttonNext.visibility = View.INVISIBLE
        binding.buttonNext.isClickable = false
        binding.progressIndicator.visibility = View.VISIBLE
    }

    private fun hideProgressIndicator() {
        binding.buttonNext.visibility = View.VISIBLE
        binding.buttonNext.isClickable = true
        binding.progressIndicator.visibility = View.GONE
    }
}