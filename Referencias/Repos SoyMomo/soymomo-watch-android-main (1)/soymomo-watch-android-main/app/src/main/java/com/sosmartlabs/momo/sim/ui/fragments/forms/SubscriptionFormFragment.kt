package com.sosmartlabs.momo.sim.ui.fragments.forms

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Context
import android.content.res.ColorStateList
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.text.Editable
import android.text.SpannableString
import android.text.Spanned
import android.text.TextWatcher
import android.text.method.LinkMovementMethod
import android.text.style.ClickableSpan
import android.util.Patterns
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.inputmethod.InputMethodManager
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.Toolbar
import androidx.core.content.ContextCompat
import androidx.core.os.bundleOf
import androidx.core.view.doOnLayout
import androidx.core.view.updatePadding
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import com.google.android.gms.common.GooglePlayServicesNotAvailableException
import com.google.android.gms.common.GooglePlayServicesRepairableException
import com.google.android.libraries.places.api.Places
import com.google.android.libraries.places.api.model.Place
import com.google.android.libraries.places.widget.PlaceAutocomplete
import com.google.android.libraries.places.widget.PlaceAutocompleteActivity
import com.google.android.material.textfield.TextInputLayout
import com.google.firebase.crashlytics.crashlytics
import com.google.firebase.Firebase
import com.parse.ParseUser
import com.sosmartlabs.momo.BuildConfig
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.addfirstwatch.AddFirstMomoActivity
import com.sosmartlabs.momo.databinding.SubscriptionNewFormFragmentBinding
import com.sosmartlabs.momo.firebase.FirebaseRemoteConfigRepository
import com.sosmartlabs.momo.linkwatch.LinkWatchActivity
import com.sosmartlabs.momo.sim.SimActivity
import com.sosmartlabs.momo.sim.analytics.SimAnalytics
import com.sosmartlabs.momo.sim.model.SubscriptionPlan
import com.sosmartlabs.momo.sim.model.SubscriptionUserInfoFormStatus
import com.sosmartlabs.momo.sim.model.SubscriptionsUserInfo
import com.sosmartlabs.momo.sim.ui.NewSubscriptionViewModel
import com.sosmartlabs.momo.utils.CountryProvider
import com.sosmartlabs.momo.utils.PhoneNumberUtils
import com.sosmartlabs.momo.utils.support.PrivacyPolicyLauncher
import com.sosmartlabs.momo.utils.support.TermsAndConditionsLauncher
import com.sosmartlabs.momo.utils.ui.DefaultErrorDialog
import com.sosmartlabs.momo.utils.ui.DefaultIcons
import com.sosmartlabs.momo.utils.ui.GradientBackground
import com.sosmartlabs.momo.utils.ui.googleplaces.PlacesAutocompleteUtils
import com.sosmartlabs.momo.utils.ui.loadImage
import com.sosmartlabs.momo.testlab.TestLab
import timber.log.Timber
import java.text.NumberFormat
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

    private var requiresAddressValidation = false

    /** Account email, used to warn when the typed one drifts away from it. */
    private var accountEmail = ""

    /** Sticky once the user opens the inputs, so a re-delivered observer can't close them again. */
    private var editingRequested = false

    /**
     * Activity intent results
     */
    private val startForResultPlaceAutocomplete = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) {
        when (it.resultCode) {
            Activity.RESULT_OK -> {
                it.data?.let { data ->
                    val prediction = PlaceAutocomplete.getPredictionFromIntent(data)
                    if (prediction == null) {
                        Timber.e("SubscriptionFormFragment: Places autocomplete returned null prediction")
                        return@let
                    }
                    val sessionToken = PlaceAutocomplete.getSessionTokenFromIntent(data)
                    val fields = listOf(Place.Field.FORMATTED_ADDRESS, Place.Field.ADDRESS_COMPONENTS)
                    PlacesAutocompleteUtils.fetchPlace(
                        fragment = this,
                        placeId = prediction.placeId,
                        placeFields = fields,
                        sessionToken = sessionToken,
                        callback = { place ->
                            Timber.d("SubscriptionFormFragment: Places autocomplete success")
                            prefillFormWithPlace(place)
                        }
                    )
                }
            }
            PlaceAutocompleteActivity.RESULT_ERROR -> {
                it.data?.let { data ->
                    val status = PlaceAutocomplete.getResultStatusFromIntent(data)
                    Timber.e("SubscriptionFormFragment: Places autocomplete error: ${status?.statusCode ?: "unknown status"}")
                    Toast.makeText(
                        context,
                        R.string.toast_error_searching_address,
                        Toast.LENGTH_LONG
                    ).show()
                }
            }
            Activity.RESULT_CANCELED -> {
                Timber.d("SubscriptionFormFragment: Places autocomplete cancelled by user")
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Timber.d("SubscriptionFormFragment: onCreate")
        if (!Places.isInitialized()) {
            Places.initializeWithNewPlacesApiEnabled(
                requireContext().applicationContext,
                BuildConfig.googlePlacesApiKey
            )
        }
        country = if (newSubscriptionViewModel.currentSimCountry.value != null) {
            newSubscriptionViewModel.currentSimCountry.value!!
        } else {
            CountryProvider.getCountry(requireContext())
        }
        Timber.d("SubscriptionFormFragment: Country set to: $country")
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        Timber.d("SubscriptionFormFragment: onCreateView")
        binding = SubscriptionNewFormFragmentBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Timber.d("SubscriptionFormFragment: onViewCreated")
        setupToolbar()
        // The action bar is pinned over the content, so reserve exactly its measured height —
        // a wrapped cancel note in any locale would otherwise hide the end of the form.
        binding.actionBar.doOnLayout { bar ->
            binding.contentScroll.updatePadding(bottom = bar.height)
        }
        setFormFieldsByCountry()
        setupListeners()
        observeViewModel()
    }

    private fun setupToolbar() {
        Timber.d("SubscriptionFormFragment: Setting up toolbar")
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
            window.statusBarColor = ContextCompat.getColor(requireContext(), R.color.background_sim_step_card_title)
            window.navigationBarColor = ContextCompat.getColor(requireContext(), R.color.white)
        }
    }

    private fun setupListeners() {
        Timber.d("SubscriptionFormFragment: Setting up form field listeners")
        setupNameListener()
        setupLastnameListener()
        setupEmailListener()
        setupPhoneNumberListener()

        binding.parentLayout.setOnClickListener {
            Timber.d("SubscriptionFormFragment: Parent layout clicked - hiding keyboard")
            it.hideKeyboard()
        }

        binding.buttonNext.setOnClickListener {
            Timber.d("SubscriptionFormFragment: Next button clicked - validating form")
            if (!isFormInfoValid()) {
                Timber.d("SubscriptionFormFragment: Form validation failed")
                return@setOnClickListener
            }
            val params = createUserInfoMap()
            Timber.d("SubscriptionFormFragment: Form validation passed, creating subscription user info")
            newSubscriptionViewModel.createSubscriptionUserInfo(params, country)
        }

        binding.buttonEdit.setOnClickListener {
            Timber.d("SubscriptionFormFragment: Edit account details clicked")
            editingRequested = true
            setEditing(true)
        }

        setupTermsNotice()

        binding.editTextAddress.setOnClickListener {
            Timber.d("SubscriptionFormFragment: Address field clicked")
            it.clearFocus()
            openPlacesAutocomplete()
        }

        binding.tilAddress.setEndIconOnClickListener {
            Timber.d("SubscriptionFormFragment: Address end icon clicked")
            it.clearFocus()
            openPlacesAutocomplete()
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
    }

    private fun observeViewModel() {
        Timber.d("SubscriptionFormFragment: Setting up ViewModel observers")
        newSubscriptionViewModel.currentUser.observe(viewLifecycleOwner) {
            Timber.d("SubscriptionFormFragment: Current user updated")
            try {
                prefillFormWithUser(it)
            } catch (e: Exception) {
                Timber.e(e, "SubscriptionFormFragment: Error prefilling form with user data")
            }
        }

        newSubscriptionViewModel.currentSubscriptionUserInfo.observe(viewLifecycleOwner) { subscriptionsUserInfo ->
            Timber.d("SubscriptionFormFragment: Current subscription user info updated")
            try {
                prefillFormWithSubscriptionUserInfo(subscriptionsUserInfo)
                newSubscriptionViewModel.getApioUserCards(subscriptionsUserInfo)
            } catch (e: Exception) {
                Timber.e(e, "SubscriptionFormFragment: Error prefilling form with subscription info")
            }
        }

        newSubscriptionViewModel.currentSubscriptionPlan.observe(viewLifecycleOwner) { currentSubscriptionPlan ->
            Timber.d("SubscriptionFormFragment: Current subscription plan updated")
            setSubscriptionPlanDataView(currentSubscriptionPlan)
        }

        newSubscriptionViewModel.currentSubscriptionUserInfoFormStatus.observe(viewLifecycleOwner) { status ->
            Timber.d("SubscriptionFormFragment: Form status updated: $status")
            when (status) {
                SubscriptionUserInfoFormStatus.DEFAULT -> {
                    hideProgressIndicator()
                }
                SubscriptionUserInfoFormStatus.SUCCESS -> {
                    hideProgressIndicator()
                    val action = when {
                        TestLab.shouldSkipPayment(newSubscriptionViewModel.currentSim.value?.iccId) ||
                            FirebaseRemoteConfigRepository.simGlobalSkipPayment -> {
                            Timber.d("SubscriptionFormFragment: Payment skip enabled, navigating to skip fragment")
                            newSubscriptionViewModel.trackSimPaymentPathSelected(SimAnalytics.PaymentPath.SKIP)
                            when (activity) {
                                is SimActivity -> R.id.action_add_sim_newSubscriptionForm_to_subscriptionPaymentSkipFragment
                                is AddFirstMomoActivity -> R.id.action_add_momo_newSubscriptionForm_to_subscriptionPaymentSkipFragment
                                is LinkWatchActivity -> R.id.action_add_sim_newSubscriptionForm_to_subscriptionPaymentSkipFragment
                                else -> null
                            }
                        }
                        newSubscriptionViewModel.currentSubscriptionPlan.value?.paymentProvider?.name.equals("Apio", ignoreCase = true) -> {
                            Timber.d("SubscriptionFormFragment: Navigating to Apio cards fragment")
                            newSubscriptionViewModel.trackSimPaymentPathSelected(SimAnalytics.PaymentPath.APIO)
                            when (activity) {
                                is SimActivity -> R.id.action_add_sim_newSubscriptionForm_to_apioUserCardsFragment
                                is AddFirstMomoActivity -> R.id.action_add_momo_newSubscriptionForm_to_apioUserCardsFragment
                                is LinkWatchActivity -> R.id.action_add_sim_newSubscriptionForm_to_apioUserCardsFragment
                                else -> null
                            }
                        }
                        newSubscriptionViewModel.currentSubscriptionPlan.value?.paymentProvider?.name.equals("Stripe", ignoreCase = true) -> {
                            Timber.d("SubscriptionFormFragment: Navigating to Stripe webview fragment")
                            newSubscriptionViewModel.trackSimPaymentPathSelected(SimAnalytics.PaymentPath.STRIPE)
                            when (activity) {
                                is SimActivity -> R.id.action_add_sim_newSubscriptionForm_to_stripeWebViewFragment
                                is AddFirstMomoActivity -> R.id.action_add_momo_newSubscriptionForm_to_stripeWebViewFragment
                                is LinkWatchActivity -> R.id.action_add_sim_newSubscriptionForm_to_stripeWebViewFragment
                                else -> null
                            }
                        }
                        else -> {
                            Timber.d("SubscriptionFormFragment: Defaulting to Stripe webview fragment")
                            newSubscriptionViewModel.trackSimPaymentPathSelected(SimAnalytics.PaymentPath.STRIPE)
                            when (activity) {
                                is SimActivity -> R.id.action_add_sim_newSubscriptionForm_to_stripeWebViewFragment
                                is AddFirstMomoActivity -> R.id.action_add_momo_newSubscriptionForm_to_stripeWebViewFragment
                                is LinkWatchActivity -> R.id.action_add_sim_newSubscriptionForm_to_stripeWebViewFragment
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
                SubscriptionUserInfoFormStatus.ERROR_EMAIL -> {
                    binding.tilEmail.showError(R.string.subscription_form_error_email)
                }
                SubscriptionUserInfoFormStatus.ERROR_PHONE_NUMBER -> {
                    binding.tilUserPhone.showError(R.string.subscription_form_error_phone_number)
                }
                SubscriptionUserInfoFormStatus.ERROR_ADDRESS -> {
                    binding.tilAddress.showError(R.string.subscription_form_error_address)
                }
                SubscriptionUserInfoFormStatus.ERROR_SAVE -> {
                    showErrorDialog(
                        getString(R.string.subscription_form_error_title),
                        getString(R.string.request_sim_form_submitted_error)
                    )
                }
                else -> {
                    showErrorDialog(getString(R.string.subscription_form_error_title), status.toString())
                }
            }
        }
    }

    private fun setSubscriptionPlanDataView(subscriptionPlan: SubscriptionPlan) {
        Timber.d("SubscriptionFormFragment: Setting subscription plan view data")
        with(subscriptionPlan) {
            binding.planInfo.let {planInfo ->
                logo?.let {
                    planInfo.planLogo.loadImage(it.url, fallback = DefaultIcons.SIM_SUBSCRIPTION_PLAN)
                } ?: planInfo.planLogo.setImageResource(DefaultIcons.SIM_SUBSCRIPTION_PLAN)
                planInfo.planTitle.text = title
                val displayPrice = if (newSubscriptionViewModel.hasSimDiscount.value == true) {
                    newSubscriptionViewModel.discountedPrice(price)
                } else {
                    price
                }
                planInfo.planPrice.text = formatPrice(displayPrice, currencyCode, currency)
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
        Timber.d("SubscriptionFormFragment: Prefilling form with user data")
        try {
            user.get("firstName")?.let {
                binding.tilName.editText?.setText(it.toString())
            } ?: Timber.w("SubscriptionFormFragment: First name is null or empty")

            user.get("lastName")?.let {
                binding.tilLastName.editText?.setText(it.toString())
            } ?: Timber.w("SubscriptionFormFragment: Last name is null or empty")

            user.get("phone")?.let {
                val phone = it.toString()
                if (phone.contains("+")) {
                    // Let the CountryCodePicker parse and split country code + local number
                    binding.ccp.fullNumber = phone
                } else {
                    binding.tilUserPhone.editText?.setText(PhoneNumberUtils.parsePhoneCountryCode(phone))
                }
            } ?: Timber.w("SubscriptionFormFragment: Phone number is null or empty")

            user.email?.let {
                accountEmail = it
                binding.tilEmail.editText?.setText(it)
            } ?: Timber.w("SubscriptionFormFragment: Email is null or empty")

            renderAccountSummary()

        } catch (e: Exception) {
            Timber.e(e, "SubscriptionFormFragment: Error prefilling form with user data")
        }
    }

    private fun prefillFormWithSubscriptionUserInfo(subscriptionsUserInfo: SubscriptionsUserInfo) {
        Timber.d("SubscriptionFormFragment: Prefilling form with subscription info")
        subscriptionsUserInfo.phone.let {
            Timber.d("SubscriptionFormFragment: Setting phone")
            if (it.contains("+")) {
                // Let the CountryCodePicker parse and split country code + local number
                binding.ccp.fullNumber = it
            } else {
                binding.tilUserPhone.editText!!.setText(PhoneNumberUtils.parsePhoneCountryCode(it))
            }
        }

        subscriptionsUserInfo.address.let {
            Timber.d("SubscriptionFormFragment: Setting address")
            binding.tilAddress.editText!!.setText(it)
        }

        subscriptionsUserInfo.optionalAddress?.let {
            Timber.d("SubscriptionFormFragment: Setting optional address")
            binding.tilOptionalAddress.editText!!.setText(it)
        }

        subscriptionsUserInfo.city.let {
            Timber.d("SubscriptionFormFragment: Setting city")
            binding.tilCity.editText!!.setText(it)
        }

        subscriptionsUserInfo.state.let {
            Timber.d("SubscriptionFormFragment: Setting state")
            binding.tilState.editText!!.setText(it)
        }

        subscriptionsUserInfo.postalCode?.let {
            Timber.d("SubscriptionFormFragment: Setting postal code")
            binding.tilPostalCode.editText!!.setText(it)
        }

        renderAccountSummary()
    }

    private fun prefillFormWithPlace(place: Place) {
        Timber.d("SubscriptionFormFragment: Prefilling form with place data")
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

    /**
     * The account already holds name, last name, phone and email, so they are shown as a summary
     * and only fall back to inputs for whatever is genuinely missing.
     */
    private fun renderAccountSummary() {
        val name = binding.tilName.editText?.text?.toString()?.trim().orEmpty()
        val lastname = binding.tilLastName.editText?.text?.toString()?.trim().orEmpty()
        val phone = binding.tilUserPhone.editText?.text?.toString()?.trim().orEmpty()
        val email = binding.tilEmail.editText?.text?.toString()?.trim().orEmpty()

        binding.summaryName.text = listOf(name, lastname).filter { it.isNotBlank() }.joinToString(" ")
        binding.summaryEmail.text = email
        binding.summaryPhone.text =
            if (phone.isBlank()) "" else "${binding.ccp.selectedCountryCodeWithPlus} $phone"

        val isComplete = listOf(name, lastname, phone, email).none { it.isBlank() }
        Timber.d("SubscriptionFormFragment: Account data complete: $isComplete")
        setEditing(!isComplete || editingRequested)
    }

    private fun setEditing(editing: Boolean) {
        binding.groupPersonalFields.visibility = if (editing) View.VISIBLE else View.GONE
        binding.summaryCard.visibility = if (editing) View.GONE else View.VISIBLE
    }

    /** Terms are accepted by continuing; only the two labels are tappable. */
    private fun setupTermsNotice() {
        val terms = getString(R.string.subscription_form_terms_link_tc)
        val privacy = getString(R.string.subscription_form_terms_link_pc)
        val notice = getString(R.string.subscription_form_terms_notice, terms, privacy)
        val spannable = SpannableString(notice)

        fun link(label: String, action: () -> Unit) {
            val start = notice.indexOf(label)
            if (start < 0) {
                Timber.w("SubscriptionFormFragment: Terms notice is missing the link label")
                return
            }
            spannable.setSpan(
                object : ClickableSpan() {
                    override fun onClick(widget: View) = action()
                },
                start,
                start + label.length,
                Spanned.SPAN_EXCLUSIVE_EXCLUSIVE
            )
        }

        link(terms) { TermsAndConditionsLauncher.launchTermsAndConditionsLauncher(requireContext()) }
        link(privacy) { PrivacyPolicyLauncher.launchPrivacyPolicyLauncher(requireContext()) }

        binding.termsNotice.apply {
            text = spannable
            movementMethod = LinkMovementMethod.getInstance()
            setLinkTextColor(ContextCompat.getColor(requireContext(), R.color.colorPrimaryDark))
        }
    }

    private fun setFormFieldsByCountry() {
        Timber.d("SubscriptionFormFragment: Setting form fields by country: $country")
        // Address is only collected where the MVNO activation payload carries one (US).
        requiresAddressValidation = country == "US"
        if (requiresAddressValidation) showAddressFields() else hideAddressFields()
    }

    private fun showAddressFields() {
        Timber.d("SubscriptionFormFragment: Showing address fields")
        binding.addressLabel.visibility = View.VISIBLE
        binding.tilAddress.visibility = View.VISIBLE
        binding.tilOptionalAddress.visibility = View.VISIBLE
        binding.tilPostalCode.visibility = View.VISIBLE
        binding.tilCity.visibility = View.VISIBLE
        binding.tilState.visibility = View.VISIBLE
    }

    private fun hideAddressFields() {
        Timber.d("SubscriptionFormFragment: Hiding address fields")
        binding.addressLabel.visibility = View.GONE
        binding.tilAddress.visibility = View.GONE
        binding.tilOptionalAddress.visibility = View.GONE
        binding.tilPostalCode.visibility = View.GONE
        binding.tilCity.visibility = View.GONE
        binding.tilState.visibility = View.GONE
    }

    private fun navigateById(navId: Int, bundle: Bundle = bundleOf()) {
        Timber.d("SubscriptionFormFragment: Navigating to destination with id: $navId")
        val navController = findNavController()
        if (navController.currentDestination?.getAction(navId) != null) {
            navController.navigate(navId, bundle)
        } else {
            Timber.w("Skipping stale navigation to $navId from ${navController.currentDestination?.label}")
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        Timber.d("SubscriptionFormFragment: onDestroyView")
        dispose()
    }

    private fun dispose() {
        Timber.d("SubscriptionFormFragment: Disposing resources")
        // The SUCCESS status is only ever consumed here. Left set, coming back from the payment
        // webview re-delivers it to the new view and bounces the user straight out again.
        newSubscriptionViewModel.resetCurrentSubscriptionUserInfoStatus()
    }

    private fun showErrorDialog(title: String, description: String?) {
        Timber.d("SubscriptionFormFragment: Showing error dialog - title: $title, description: $description")
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
        binding.tilEmail.setHelperTextColor(
            ColorStateList.valueOf(ContextCompat.getColor(requireContext(), R.color.form_error_text))
        )
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
                // Invoices are matched on this address; warn as soon as it drifts from the account.
                binding.tilEmail.helperText = if (
                    accountEmail.isNotBlank() && s.isNotBlank() && !s.equals(accountEmail, ignoreCase = true)
                ) {
                    getString(R.string.subscription_form_email_warning)
                } else {
                    null
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

        if (requiresAddressValidation) {
            if (binding.tilState.editText!!.text.isNullOrBlank()) {
                accumulatedErrors.add(SubscriptionUserInfoFormStatus.ERROR_ADDRESS)
                binding.tilState.error = getString(R.string.subscription_form_error_address)
                isValid = false
            }
            if (binding.tilPostalCode.editText!!.text.isNullOrBlank()) {
                accumulatedErrors.add(SubscriptionUserInfoFormStatus.ERROR_ADDRESS)
                binding.tilPostalCode.error = getString(R.string.subscription_form_error_address)
                isValid = false
            }
        }

        if (!isValid) {
            // Errors are set on the account inputs, so they have to be on screen to be seen.
            editingRequested = true
            setEditing(true)
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
        params["phone"] = "${binding.ccp.selectedCountryCodeWithPlus}${binding.tilUserPhone.editText!!.text}".filterNot { it.isWhitespace() }

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
            val intent = PlaceAutocomplete.IntentBuilder()
                .setCountries(listOf(country))
                .build(requireContext())
            startForResultPlaceAutocomplete.launch(intent)
            Timber.d("SubscriptionFormFragment: Should startForResultPlaceAutocomplete")
        } catch (e: GooglePlayServicesRepairableException) {
            Toast.makeText(requireContext(), R.string.geocoder_error_unavailable, Toast.LENGTH_LONG)
                .show()
            Timber.e(e)
            with(Firebase.crashlytics) {
                log("SubscriptionFormFragment: Error on SubscriptionFormFragment")
                recordException(e)
            }
        } catch (e: GooglePlayServicesNotAvailableException) {
            Toast.makeText(requireContext(), R.string.geocoder_error_unavailable, Toast.LENGTH_LONG)
                .show()
            Timber.e(e)
            with(Firebase.crashlytics) {
                log("SubscriptionFormFragment: Error on SubscriptionFormFragment")
                recordException(e)
            }
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
        } catch (_: Exception) {
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
