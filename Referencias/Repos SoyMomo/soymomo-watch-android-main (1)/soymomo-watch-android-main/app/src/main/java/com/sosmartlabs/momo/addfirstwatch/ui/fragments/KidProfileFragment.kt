package com.sosmartlabs.momo.addfirstwatch.ui.fragments

import android.app.DatePickerDialog
import android.content.ActivityNotFoundException
import android.content.ContentValues
import android.content.DialogInterface
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.provider.ContactsContract
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.core.graphics.drawable.toBitmap
import androidx.core.os.bundleOf
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import com.google.android.material.bottomsheet.BottomSheetDialog
import com.sosmartlabs.momo.BuildConfig
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.addfirstwatch.analytics.AddWatchAnalytics
import com.sosmartlabs.momo.addfirstwatch.model.KidProfileStatus
import com.sosmartlabs.momo.addfirstwatch.ui.AddFirstMomoViewModel
import com.sosmartlabs.momo.databinding.AddWatchKidProfileFragmentBinding
import com.sosmartlabs.momo.databinding.DialogAddWatchSaveContactBinding
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.sim.model.Subscription
import com.sosmartlabs.momo.sim.model.SubscriptionActivationStatus
import com.sosmartlabs.momo.sim.ui.NewSubscriptionViewModel
import com.sosmartlabs.momo.takepicture.TakePictureFragment
import com.sosmartlabs.momo.utils.PhoneExceptionRegistry
import com.sosmartlabs.momo.utils.PhoneNumberUtils
import com.sosmartlabs.momo.utils.hideKeyboard
import com.sosmartlabs.momo.utils.ui.DefaultErrorDialog
import com.sosmartlabs.momo.utils.ui.loadCircularImage
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber
import java.io.ByteArrayOutputStream
import java.io.File
import java.text.SimpleDateFormat
import java.time.LocalDate
import java.time.format.DateTimeParseException
import java.util.*

@AndroidEntryPoint
class KidProfileFragment : TakePictureFragment() {

    private lateinit var binding: AddWatchKidProfileFragmentBinding

    private val addFirstMomoViewModel: AddFirstMomoViewModel by activityViewModels()
    private val newSubscriptionViewModel: NewSubscriptionViewModel by activityViewModels()

    private val simpleDateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
    private var birthday: Date? = null
    private var hasHandledKidDetailsSuccess = false
    private var currentKidProfileImagePath: String? = null
    private var pendingContactPhoneSource: String? = null
    private var pendingContactHasPhoto = false

    private val addContactLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) {
        Timber.d("KidProfileFragment: Add contact flow returned")
        addFirstMomoViewModel.trackContactPromptResult(
            result = AddWatchAnalytics.Result.RETURNED,
            phoneSource = pendingContactPhoneSource,
            hasPhoto = pendingContactHasPhoto,
        )
        navigateToFinish()
    }

    override val objectId: String?
        get() = addFirstMomoViewModel.firstContactStatus.value?.name

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        hasHandledKidDetailsSuccess = savedInstanceState?.getBoolean(KEY_HANDLED_KID_DETAILS_SUCCESS) ?: false
        currentKidProfileImagePath = savedInstanceState?.getString(KEY_KID_PROFILE_IMAGE_PATH)
        pendingContactPhoneSource = savedInstanceState?.getString(KEY_PENDING_CONTACT_PHONE_SOURCE)
        pendingContactHasPhoto = savedInstanceState?.getBoolean(KEY_PENDING_CONTACT_HAS_PHOTO) ?: false
    }

    override fun onSaveInstanceState(outState: Bundle) {
        outState.putBoolean(KEY_HANDLED_KID_DETAILS_SUCCESS, hasHandledKidDetailsSuccess)
        outState.putString(KEY_KID_PROFILE_IMAGE_PATH, currentKidProfileImagePath)
        outState.putString(KEY_PENDING_CONTACT_PHONE_SOURCE, pendingContactPhoneSource)
        outState.putBoolean(KEY_PENDING_CONTACT_HAS_PHOTO, pendingContactHasPhoto)
        super.onSaveInstanceState(outState)
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        Timber.d("KidProfileFragment: onCreateView called")
        binding = AddWatchKidProfileFragmentBinding.inflate(inflater, container, false)
        addFirstMomoViewModel.setProgressStep(4)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        Timber.d("KidProfileFragment: onViewCreated called")
        super.onViewCreated(view, savedInstanceState)
        setupListeners()
        observeViewModel()
        prefillForm()
        restoreKidProfileImage()
    }

    private fun observeViewModel() {
        Timber.d("KidProfileFragment: observeViewModel called")
        addFirstMomoViewModel.kidProfileStatus.observe(viewLifecycleOwner) {
            Timber.d("KidProfileFragment: kidProfileStatus changed: $it")
            when (it) {
                KidProfileStatus.KID_DETAILS_SAVING -> {
                    Timber.i("KidProfileFragment: Saving kid details")
                    showProgressIndicator()
                }
                KidProfileStatus.KID_DETAILS_SUCCESS -> {
                    Timber.i("KidProfileFragment: Kid details saved successfully")
                    hideProgressIndicator()
                    handleKidDetailsSuccess()
                }
                KidProfileStatus.ERROR_LOADING -> {
                    Timber.e("KidProfileFragment: Error loading kid profile")
                    CrashlyticsLog.log("KidProfileFragment: Error loading kid profile")
                    hideProgressIndicator()
                    showErrorDialog(
                        getString(R.string.add_watch_kid_profile_dialog_error_title),
                        getString(R.string.add_watch_kid_profile_dialog_error_description)
                    )
                }
                else -> {
                    Timber.e("KidProfileFragment: Unknown error: $it")
                    CrashlyticsLog.log("KidProfileFragment: Unknown error: $it")
                    hideProgressIndicator()
                    showErrorDialog(
                        getString(R.string.add_watch_kid_profile_dialog_error_title),
                        it.toString()
                    )
                }
            }
        }

        newSubscriptionViewModel.newCreatedSubscription.observe(viewLifecycleOwner) {
            Timber.d("KidProfileFragment: newCreatedSubscription updated")
            prefillWatchNumber(it)
        }

        newSubscriptionViewModel.newCreatedSubscriptionActivationStatus.observe(viewLifecycleOwner) {
            Timber.d("KidProfileFragment: newCreatedSubscriptionActivationStatus: $it")
            when (it) {
                SubscriptionActivationStatus.DEFAULT,
                SubscriptionActivationStatus.SUBSCRIPTION_SUCCESS -> {
                    Timber.d("KidProfileFragment: Subscription status: $it, showing phone fields")
                    binding.kidProfileDescription.text = getString(R.string.add_watch_kid_profile_description)
                    binding.phoneNumberLabel.visibility = View.VISIBLE
                    binding.layoutAddPhone.visibility = View.VISIBLE
                }
                SubscriptionActivationStatus.SUBSCRIPTION_SUCCESS_NO_PHONE -> {
                    Timber.d("KidProfileFragment: Subscription success but no phone, hiding phone fields")
                    binding.kidProfileDescription.text = getString(R.string.add_watch_kid_profile_subscription_no_phone_description)

                    binding.phoneNumberLabel.visibility = View.INVISIBLE
                    val phoneNumberLabelMargins = binding.phoneNumberLabel.layoutParams as ViewGroup.MarginLayoutParams
                    phoneNumberLabelMargins.setMargins(0, 0, 0, 0)
                    binding.phoneNumberLabel.layoutParams = phoneNumberLabelMargins

                    binding.layoutAddPhone.visibility = View.INVISIBLE
                    val layoutAddPhoneMargins = binding.layoutAddPhone.layoutParams as ViewGroup.MarginLayoutParams
                    layoutAddPhoneMargins.setMargins(0, 0, 0, 0)
                    binding.layoutAddPhone.layoutParams = layoutAddPhoneMargins
                }
                else -> {
                    Timber.d("KidProfileFragment: Subscription status: $it, no action")
                }
            }
        }
    }

    private fun prefillForm() {
        Timber.d("KidProfileFragment: prefillForm called")
        if (BuildConfig.DEBUG) {
            // binding.tilUserPhone.editText!!.setText(PhoneNumberUtils.parsePhoneCountryCode("+56989589426"))
            binding.tilName.editText!!.setText("Luco")
            binding.tilLastName.editText!!.setText("Dog")
            binding.tilBirthday.editText!!.setText("2021-03-03")
            Timber.d("KidProfileFragment: Form prefilled for debug")
        }
    }

    private fun prefillWatchNumber(subscription: Subscription) {
        Timber.d("KidProfileFragment: prefillWatchNumber called")
        val msisdn = subscription.msisdn
        if (msisdn.isNullOrEmpty()) {
            binding.tilUserPhone.editText!!.setText("")
            Timber.d("KidProfileFragment: Subscription has no phone number to prefill")
            return
        }

        val exceptionRule = PhoneExceptionRegistry.match(msisdn)
        if (exceptionRule != null) {
            // IoT/M2M MSISDN: libphonenumber can't parse it, so set the country flag and national
            // part straight from the registry instead of letting the parser reject it.
            binding.ccp.setCountryForPhoneCode(exceptionRule.countryCallingCode.toInt())
            binding.tilUserPhone.editText!!.setText(PhoneExceptionRegistry.nationalNumber(msisdn))
            Timber.d("KidProfileFragment: Watch number prefilled as IoT/M2M (${exceptionRule.isoCountryCode}) number")
        } else {
            binding.tilUserPhone.editText!!.setText(PhoneNumberUtils.parsePhoneCountryCode(msisdn))
            Timber.d("KidProfileFragment: Watch number prefilled from subscription")
        }
    }

    private fun showProgressIndicator() {
        Timber.d("KidProfileFragment: showProgressIndicator called")
        binding.buttonNext.visibility = View.INVISIBLE
        binding.buttonNext.isClickable = false
        binding.progressIndicator.visibility = View.VISIBLE
    }

    private fun hideProgressIndicator() {
        Timber.d("KidProfileFragment: hideProgressIndicator called")
        binding.buttonNext.visibility = View.VISIBLE
        binding.buttonNext.isClickable = true
        binding.progressIndicator.visibility = View.GONE
    }

    private fun showErrorDialog(title: String, description: String?) {
        Timber.e("KidProfileFragment: showErrorDialog called with title: $title, description: $description")
        CrashlyticsLog.log("KidProfileFragment: showErrorDialog called with title: $title, description: $description")
        val defaultErrorDialog = DefaultErrorDialog()
        defaultErrorDialog.arguments = bundleOf(
            "icon" to "",
            "title" to title,
            "description" to description,
        )
        defaultErrorDialog.show(childFragmentManager, title)
    }

    private fun handleKidDetailsSuccess() {
        if (hasHandledKidDetailsSuccess) {
            Timber.d("KidProfileFragment: Kid details success already handled")
            if (pendingContactPhoneSource != null) {
                Timber.d("KidProfileFragment: Waiting for contact insert result")
                return
            }
            navigateToFinish()
            return
        }
        hasHandledKidDetailsSuccess = true

        val contactName = getKidContactName()
        if (contactName.isBlank()) {
            Timber.d("KidProfileFragment: Skipping contact prompt because name is blank")
            addFirstMomoViewModel.trackContactPromptResult(
                result = AddWatchAnalytics.Result.NOT_SHOWN,
                notShownReason = CONTACT_NOT_SHOWN_BLANK_NAME,
                hasPhoto = hasCustomKidProfileImage(),
            )
            navigateToFinish()
            return
        }

        val contactPhone = getKidContactPhone()
        if (contactPhone.number.isNullOrBlank() || contactPhone.source.isNullOrBlank()) {
            Timber.d("KidProfileFragment: Skipping contact prompt because phone is unavailable")
            addFirstMomoViewModel.trackContactPromptResult(
                result = AddWatchAnalytics.Result.NOT_SHOWN,
                notShownReason = contactPhone.notShownReason,
                hasPhoto = hasCustomKidProfileImage(),
            )
            navigateToFinish()
            return
        }

        val hasPhoto = hasCustomKidProfileImage()
        addFirstMomoViewModel.trackContactPromptShown(
            phoneSource = contactPhone.source,
            hasPhoto = hasPhoto
        )
        showAddKidToContactsDialog(contactName, contactPhone.number, contactPhone.source, hasPhoto)
    }

    private fun getKidContactName(): String {
        val firstName = binding.tilName.editText?.text?.toString().orEmpty().trim()
        val lastName = binding.tilLastName.editText?.text?.toString().orEmpty().trim()
        return listOf(firstName, lastName)
            .filter { it.isNotBlank() }
            .joinToString(" ")
    }

    private fun getKidContactPhone(): KidContactPhone {
        if (newSubscriptionViewModel.newCreatedSubscriptionActivationStatus.value == SubscriptionActivationStatus.SUBSCRIPTION_SUCCESS_NO_PHONE) {
            Timber.d("KidProfileFragment: Skipping contact phone because subscription has no phone")
            return KidContactPhone(notShownReason = CONTACT_NOT_SHOWN_SUBSCRIPTION_NO_PHONE)
        }
        if (binding.layoutAddPhone.visibility != View.VISIBLE) {
            Timber.d("KidProfileFragment: Skipping contact phone because phone field is hidden")
            return KidContactPhone(notShownReason = CONTACT_NOT_SHOWN_HIDDEN_PHONE_FIELD)
        }
        if (PhoneNumberUtils.isValidPhoneNumber(binding.ccp)) {
            val phoneNumber = binding.ccp.fullNumberWithPlus.takeIf { it.isNotBlank() }
            val subscriptionMsisdn = newSubscriptionViewModel.newCreatedSubscription.value?.msisdn
                ?.takeIf { it.isNotBlank() }
            val phoneMatchesMsisdn = phoneNumber != null &&
                subscriptionMsisdn != null &&
                phoneNumber.filter(Char::isDigit) == subscriptionMsisdn.filter(Char::isDigit)
            return KidContactPhone(
                number = phoneNumber,
                source = if (phoneMatchesMsisdn) {
                    CONTACT_PHONE_SOURCE_MSISDN
                } else {
                    CONTACT_PHONE_SOURCE_TYPED
                },
            )
        }
        newSubscriptionViewModel.newCreatedSubscription.value?.msisdn
            ?.takeIf { it.isNotBlank() }
            ?.let {
                return KidContactPhone(number = it, source = CONTACT_PHONE_SOURCE_MSISDN)
            }

        val typedPhone = binding.tilUserPhone.editText?.text?.toString().orEmpty()
        val reason = if (typedPhone.isBlank()) {
            CONTACT_NOT_SHOWN_NO_PHONE
        } else {
            CONTACT_NOT_SHOWN_INVALID_PHONE
        }
        Timber.d("KidProfileFragment: Skipping contact phone because phone is unavailable")
        return KidContactPhone(notShownReason = reason)
    }

    private fun showAddKidToContactsDialog(
        contactName: String,
        contactPhone: String,
        phoneSource: String,
        hasPhoto: Boolean,
    ) {
        val sheetBinding = DialogAddWatchSaveContactBinding.inflate(layoutInflater)
        val contactPromptName = getContactPromptName(contactName)
        val bottomSheetDialog = BottomSheetDialog(requireContext())

        sheetBinding.saveContactTitle.text = getString(
            R.string.add_watch_save_kid_contact_title,
            contactPromptName
        )
        sheetBinding.saveContactDescription.text = getString(
            R.string.add_watch_save_kid_contact_description,
            contactPromptName
        )
        sheetBinding.saveContactButton.setOnClickListener {
            bottomSheetDialog.dismiss()
            addFirstMomoViewModel.trackContactPromptResult(
                result = AddWatchAnalytics.Result.SAVE_TAPPED,
                phoneSource = phoneSource,
                hasPhoto = hasPhoto,
            )
            launchAddKidToContacts(contactName, contactPhone, phoneSource, hasPhoto)
        }
        sheetBinding.skipContactButton.setOnClickListener {
            bottomSheetDialog.dismiss()
            addFirstMomoViewModel.trackContactPromptResult(
                result = AddWatchAnalytics.Result.SKIP_TAPPED,
                phoneSource = phoneSource,
                hasPhoto = hasPhoto,
            )
            navigateToFinish()
        }

        bottomSheetDialog.setContentView(sheetBinding.root)
        bottomSheetDialog.setOnCancelListener {
            addFirstMomoViewModel.trackContactPromptResult(
                result = AddWatchAnalytics.Result.DIALOG_CANCELLED,
                phoneSource = phoneSource,
                hasPhoto = hasPhoto,
            )
            navigateToFinish()
        }
        bottomSheetDialog.show()
        bottomSheetDialog.findViewById<View>(com.google.android.material.R.id.design_bottom_sheet)
            ?.setBackgroundColor(Color.TRANSPARENT)
    }

    private fun getContactPromptName(contactName: String): String =
        contactName.substringBefore(" ").takeIf { it.isNotBlank() } ?: contactName

    private fun launchAddKidToContacts(
        contactName: String,
        contactPhone: String,
        phoneSource: String,
        hasPhoto: Boolean,
    ) {
        pendingContactPhoneSource = phoneSource
        pendingContactHasPhoto = hasPhoto
        val intent = Intent(ContactsContract.Intents.Insert.ACTION).apply {
            type = ContactsContract.RawContacts.CONTENT_TYPE
            putExtra(ContactsContract.Intents.Insert.NAME, contactName)
            putExtra(ContactsContract.Intents.Insert.PHONE, contactPhone)
            putExtra(
                ContactsContract.Intents.Insert.PHONE_TYPE,
                ContactsContract.CommonDataKinds.Phone.TYPE_MOBILE
            )
            if (hasPhoto) {
                getKidContactPhotoData()?.let { photoData ->
                    putParcelableArrayListExtra(ContactsContract.Intents.Insert.DATA, photoData)
                }
            }
        }

        try {
            addContactLauncher.launch(intent)
        } catch (error: ActivityNotFoundException) {
            Timber.e(error, "KidProfileFragment: No contacts app available to add kid phone")
            CrashlyticsLog.recordNonFatalError(error, "KidProfileFragment: No contacts app available")
            addFirstMomoViewModel.trackContactPromptResult(
                result = AddWatchAnalytics.Result.NO_HANDLER,
                phoneSource = phoneSource,
                hasPhoto = hasPhoto,
                errorType = error::class.simpleName,
            )
            Toast.makeText(
                requireContext(),
                R.string.add_watch_save_kid_contact_error,
                Toast.LENGTH_SHORT
            ).show()
            navigateToFinish()
        }
    }

    private fun getKidContactPhotoData(): ArrayList<ContentValues>? {
        val photoBytes = getKidContactPhotoBytes() ?: return null
        return arrayListOf(
            ContentValues().apply {
                put(ContactsContract.Data.MIMETYPE, ContactsContract.CommonDataKinds.Photo.CONTENT_ITEM_TYPE)
                put(ContactsContract.CommonDataKinds.Photo.PHOTO, photoBytes)
            }
        )
    }

    private fun getKidContactPhotoBytes(): ByteArray? {
        val imagePath = currentKidProfileImagePath
            ?.takeIf { it.isNotBlank() }
            ?.takeIf { File(it).exists() }
            ?: return null

        return runCatching {
            val decodedBitmap = BitmapFactory.decodeFile(imagePath)
                ?: return null
            val bitmap = Bitmap.createScaledBitmap(
                decodedBitmap,
                CONTACT_PHOTO_SIZE_PX,
                CONTACT_PHOTO_SIZE_PX,
                true
            )
            ByteArrayOutputStream().use { output ->
                bitmap.compress(Bitmap.CompressFormat.PNG, CONTACT_PHOTO_QUALITY, output)
                output.toByteArray().takeIf { it.isNotEmpty() }
            }
        }.onFailure { error ->
            Timber.e(error, "KidProfileFragment: Failed to prepare kid contact photo")
            CrashlyticsLog.recordNonFatalError(
                error,
                "KidProfileFragment: Failed to prepare kid contact photo"
            )
        }.getOrNull()
    }

    private fun navigateToFinish() {
        if (!isAdded) {
            Timber.d("KidProfileFragment: Fragment is not added, skipping finish navigation")
            return
        }

        val navController = findNavController()
        if (navController.currentDestination?.id != R.id.kidProfileFragment) {
            Timber.d("KidProfileFragment: Current destination is not KidProfileFragment, skipping finish navigation")
            return
        }

        navigateById(R.id.action_kidProfileFragment_to_FinishFragment)
    }

    private fun isFormInfoValid(): Boolean {
        Timber.d("KidProfileFragment: isFormInfoValid called")
        var isValid = true

        if (binding.tilName.editText!!.text.isNullOrBlank()) {
            Timber.w("KidProfileFragment: Name is blank")
            binding.tilName.error = getString(R.string.add_watch_kid_profile_label_error_name)
            isValid = false
        }
        if (binding.tilLastName.editText!!.text.isNullOrBlank()) {
            Timber.w("KidProfileFragment: Last name is blank")
            binding.tilLastName.error = getString(R.string.add_watch_kid_profile_label_error_last_name)
            isValid = false
        }
        if (binding.tilBirthday.editText!!.text.isNullOrBlank()) {
            Timber.w("KidProfileFragment: Birthday is blank")
            binding.tilBirthday.error = getString(R.string.add_watch_kid_profile_label_error_birthday)
            isValid = false
        } else {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                try {
                    LocalDate.parse(binding.tilBirthday.editText!!.text)
                } catch (err: DateTimeParseException) {
                    Timber.e("KidProfileFragment: Invalid birthday format")
                    CrashlyticsLog.recordNonFatalError(
                        err,
                        "KidProfileFragment: Invalid birthday format"
                    )
                    binding.tilBirthday.error = getString(R.string.add_watch_kid_profile_label_error_birthday)
                    isValid = false
                }
            }
        }
        if (newSubscriptionViewModel.newCreatedSubscriptionActivationStatus.value != SubscriptionActivationStatus.SUBSCRIPTION_SUCCESS_NO_PHONE) {
            if (!PhoneNumberUtils.isValidPhoneNumber(binding.ccp)) {
                Timber.w("KidProfileFragment: Phone number is invalid")
                binding.tilUserPhone.error = getString(R.string.add_watch_kid_profile_label_error_phone_number)
                isValid = false
            }
        }

        Timber.d("KidProfileFragment: isFormInfoValid result: $isValid")
        return isValid
    }

    private fun setupListeners() {
        Timber.d("KidProfileFragment: setupListeners called")
        binding.root.setOnClickListener {
            Timber.d("KidProfileFragment: Root clicked, hiding keyboard")
            it.hideKeyboard()
        }
        binding.buttonNext.setOnClickListener {
            Timber.d("KidProfileFragment: buttonNext clicked")
            if (!isFormInfoValid()) {
                Timber.w("KidProfileFragment: Form is not valid, showing error dialog")
                showErrorDialog(
                    getString(R.string.add_watch_kid_profile_dialog_error_title),
                    getString(R.string.add_watch_kid_profile_dialog_error_description)
                )
                return@setOnClickListener
            }
            val params = createKidProfileMap()
            Timber.d("KidProfileFragment: Form is valid, submitting kid profile")
            addFirstMomoViewModel.onKidDetailsEntered(params, hasCustomPhoto = hasCustomKidProfileImage())
        }
        setupNameListener()
        setupLastnameListener()
        setupPhoneNumberListener()
        setupBirthdayListener()
        setAddImageButtonListener()
    }

    private fun setupNameListener() {
        Timber.d("KidProfileFragment: setupNameListener called")
        binding.tilName.editText?.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(charSequence: CharSequence, i: Int, i1: Int, i2: Int) {}
            override fun onTextChanged(charSequence: CharSequence, i: Int, i1: Int, i2: Int) {
                if (binding.tilName.isErrorEnabled) {
                    Timber.d("KidProfileFragment: Name field changed, clearing error")
                    binding.tilName.isErrorEnabled = false
                }
            }
            override fun afterTextChanged(editable: Editable) {}
        })
    }

    private fun setupLastnameListener() {
        Timber.d("KidProfileFragment: setupLastnameListener called")
        binding.tilLastName.editText?.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(charSequence: CharSequence, i: Int, i1: Int, i2: Int) {}
            override fun onTextChanged(charSequence: CharSequence, i: Int, i1: Int, i2: Int) {
                if (binding.tilLastName.isErrorEnabled) {
                    Timber.d("KidProfileFragment: Last name field changed, clearing error")
                    binding.tilLastName.isErrorEnabled = false
                }
            }
            override fun afterTextChanged(editable: Editable) {}
        })
    }

    private fun setupPhoneNumberListener() {
        Timber.d("KidProfileFragment: setupPhoneNumberListener called")
        binding.tilUserPhone.editText?.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(charSequence: CharSequence, i: Int, i1: Int, i2: Int) {}
            override fun onTextChanged(charSequence: CharSequence, i: Int, i1: Int, i2: Int) {
                if (binding.tilUserPhone.isErrorEnabled) {
                    Timber.d("KidProfileFragment: Phone number field changed, clearing error")
                    binding.tilUserPhone.isErrorEnabled = false
                }
            }
            override fun afterTextChanged(editable: Editable) {}
        })
        binding.ccp.registerCarrierNumberEditText(binding.tilUserPhone.editText)
    }

    private fun setupBirthdayListener() {
        Timber.d("KidProfileFragment: setupBirthdayListener called")
        binding.tilBirthday.editText!!.isFocusable = false
        binding.tilBirthday.editText!!.setOnClickListener {
            Timber.d("KidProfileFragment: Birthday field clicked, showing DatePickerDialog")
            binding.root.clearFocus()

            val c = Calendar.getInstance()
            val y = c.get(Calendar.YEAR)
            val m = c.get(Calendar.MONTH)
            val d = c.get(Calendar.DAY_OF_MONTH)
            val dialog = DatePickerDialog(
                requireContext(),
                R.style.DatePickerDialogTheme,
                { _, year, month, dayOfMonth ->
                    val calendar = Calendar.getInstance()
                    calendar.set(year, month, dayOfMonth)
                    val formattedDate = simpleDateFormat.format(calendar.time)
                    binding.tilBirthday.editText!!.setText(formattedDate)
                    try {
                        birthday = simpleDateFormat.parse(formattedDate)
                        Timber.d("KidProfileFragment: Birthday set")
                    } catch (e: Exception) {
                        Timber.e("KidProfileFragment: Error parsing birthday")
                        CrashlyticsLog.recordNonFatalError(
                            e,
                            "KidProfileFragment: Error parsing birthday"
                        )
                    }
                }, y, m, d
            )

            dialog.datePicker.maxDate = System.currentTimeMillis()
            dialog.show()
        }
        binding.tilBirthday.editText?.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(charSequence: CharSequence, i: Int, i1: Int, i2: Int) {}
            override fun onTextChanged(charSequence: CharSequence, i: Int, i1: Int, i2: Int) {
                if (binding.tilBirthday.isErrorEnabled) {
                    Timber.d("KidProfileFragment: Birthday field changed, clearing error")
                    binding.tilBirthday.isErrorEnabled = false
                }
            }
            override fun afterTextChanged(editable: Editable) {}
        })
    }

    private fun navigateById(navId: Int, bundle: Bundle = bundleOf()) {
        Timber.d("KidProfileFragment: Navigating to navId: $navId with bundle: $bundle")
        val navController = findNavController()
        if (navController.currentDestination?.getAction(navId) != null) {
            navController.navigate(navId, bundle)
        } else {
            Timber.w("Skipping stale navigation to $navId from ${navController.currentDestination?.label}")
        }
    }

    private fun setAddImageButtonListener() {
        Timber.d("KidProfileFragment: setAddImageButtonListener called")
        binding.addImageButton.setOnClickListener {
            Timber.d("KidProfileFragment: Add image button clicked")
            createProfilePictureOptionsDialog()
        }
    }

    override fun onImageLoaded(path: String?) {
        Timber.d("KidProfileFragment: onImageLoaded called")
        val imagePath = path
            ?.takeIf { it.isNotBlank() }
            ?.takeIf { File(it).exists() }

        if (imagePath == null) {
            currentKidProfileImagePath = null
            binding.imageProfile.setImageResource(R.drawable.ic_profile_image_placeholder)
            return
        }

        currentKidProfileImagePath = imagePath
        binding.imageProfile.loadCircularImage(imagePath, 2f, fallback = R.drawable.ic_profile_image_placeholder)
    }

    private fun restoreKidProfileImage() {
        val imagePath = currentKidProfileImagePath
            ?.takeIf { it.isNotBlank() }
            ?.takeIf { File(it).exists() }

        if (imagePath == null) {
            currentKidProfileImagePath = null
            binding.imageProfile.setImageResource(R.drawable.ic_profile_image_placeholder)
            return
        }

        binding.imageProfile.loadCircularImage(imagePath, 2f, fallback = R.drawable.ic_profile_image_placeholder)
    }

    private fun createProfilePictureOptionsDialog() {
        Timber.d("KidProfileFragment: createProfilePictureOptionsDialog called")
        val items = arrayOf<CharSequence>(
            getString(R.string.photo_delete),
            getString(R.string.photo_take_new),
            getString(R.string.photo_select_from_gallery)
        )
        val builder = AlertDialog.Builder(requireContext())
        builder.setTitle(getString(R.string.change_photo))
        builder.setItems(items) { _, item ->
            when (item) {
                0 -> {
                    Timber.d("KidProfileFragment: Delete photo selected")
                    deletePhoto()
                }
                1 -> {
                    Timber.d("KidProfileFragment: Take new photo selected")
                    takePictureOrRequestPermission()
                }
                2 -> {
                    Timber.d("KidProfileFragment: Select from gallery selected")
                    launchSelectPictureFromGallery()
                }
            }
        }
        builder.setNegativeButton(R.string.button_cancel) { dialogInterface: DialogInterface, _: Int ->
            Timber.d("KidProfileFragment: Cancel photo dialog")
            dialogInterface.dismiss()
        }
        builder.show()
    }

    private fun deletePhoto() {
        Timber.d("KidProfileFragment: deletePhoto called")
        currentKidProfileImagePath = null
        binding.imageProfile.setImageResource(R.drawable.ic_profile_image_placeholder)
    }

    private fun takePictureOrRequestPermission() {
        Timber.d("KidProfileFragment: takePictureOrRequestPermission called")
        if (hasCameraPermission) {
            Timber.d("KidProfileFragment: Camera permission granted, launching take picture")
            return launchTakePicture()
        } else {
            Timber.d("KidProfileFragment: Camera permission not granted, requesting permission")
            requestCameraPermissionLauncher.launch(android.Manifest.permission.CAMERA)
        }
    }

    private fun createKidProfileMap(): MutableMap<String, Any> {
        Timber.d("KidProfileFragment: createKidProfileMap called")
        val params = mutableMapOf<String, Any>()
        params["name"] = binding.tilName.editText!!.text.toString()
        params["lastName"] = binding.tilLastName.editText!!.text.toString()
        if (PhoneNumberUtils.isValidPhoneNumber(binding.ccp)) {
            params["phone"] = binding.ccp.fullNumberWithPlus
        }
        params["image"] = binding.imageProfile.drawable.toBitmap()
        birthday?.let {
            params["birthday"] = it
        }
        Timber.d("KidProfileFragment: createKidProfileMap completed")
        return params
    }

    private fun hasCustomKidProfileImage(): Boolean =
        currentKidProfileImagePath
            ?.takeIf { it.isNotBlank() }
            ?.let { File(it).exists() }
            ?: false

    private data class KidContactPhone(
        val number: String? = null,
        val source: String? = null,
        val notShownReason: String? = null,
    )

    companion object {
        private const val KEY_HANDLED_KID_DETAILS_SUCCESS = "handledKidDetailsSuccess"
        private const val KEY_KID_PROFILE_IMAGE_PATH = "kidProfileImagePath"
        private const val KEY_PENDING_CONTACT_PHONE_SOURCE = "pendingContactPhoneSource"
        private const val KEY_PENDING_CONTACT_HAS_PHOTO = "pendingContactHasPhoto"
        private const val CONTACT_PHOTO_SIZE_PX = 256
        private const val CONTACT_PHOTO_QUALITY = 100
        private const val CONTACT_PHONE_SOURCE_TYPED = "typed"
        private const val CONTACT_PHONE_SOURCE_MSISDN = "msisdn"
        private const val CONTACT_NOT_SHOWN_NO_PHONE = "no_phone"
        private const val CONTACT_NOT_SHOWN_INVALID_PHONE = "invalid_phone"
        private const val CONTACT_NOT_SHOWN_HIDDEN_PHONE_FIELD = "hidden_phone_field"
        private const val CONTACT_NOT_SHOWN_SUBSCRIPTION_NO_PHONE = "subscription_no_phone"
        private const val CONTACT_NOT_SHOWN_BLANK_NAME = "blank_name"
    }
}
