package com.sosmartlabs.momo.addfirstwatch.ui.fragments

import android.content.DialogInterface
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.content.res.AppCompatResources
import androidx.core.os.bundleOf
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import com.parse.ParseUser
import com.sosmartlabs.momo.BuildConfig
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.addfirstwatch.model.FirstContactStatus
import com.sosmartlabs.momo.addfirstwatch.model.WatchAvailabilityStatus
import com.sosmartlabs.momo.addfirstwatch.ui.AddFirstMomoViewModel
import com.sosmartlabs.momo.takepicture.TakePictureFragment
import com.sosmartlabs.momo.databinding.AddWatchFirstContactFragmentBinding
import com.sosmartlabs.momo.utils.PhoneNumberUtils
import com.sosmartlabs.momo.utils.hideKeyboard
import com.sosmartlabs.momo.utils.ui.DefaultErrorDialog
import com.sosmartlabs.momo.utils.ui.DefaultIcons
import com.sosmartlabs.momo.utils.ui.loadCircularImage
import com.sosmartlabs.momo.utils.ui.loadImage
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber

@AndroidEntryPoint
class FirstContactFragment: TakePictureFragment() {

    /**
     * Binding
     */
    private lateinit var binding: AddWatchFirstContactFragmentBinding

    /**
     * ViewModel
     */
    private val addFirstMomoViewModel: AddFirstMomoViewModel by activityViewModels()

    private var currentImagePath: String? = null

    override val objectId: String?
        get() = addFirstMomoViewModel.currentWearer.value?.objectId

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        Timber.d("Creating view for FirstContactFragment")
        binding = AddWatchFirstContactFragmentBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        Timber.d("View created for FirstContactFragment. Setting up UI components")
        super.onViewCreated(view, savedInstanceState)
        setupListeners()
        observeViewModel()
        prefillForm()
    }

    private fun prefillForm() {
        Timber.d("Pre-filling form with user data from ParseUser")
        ParseUser.getCurrentUser().apply {
            if (has("firstName")) {
                val firstName = get("firstName").toString()
                Timber.d("Setting first contact first name from user profile")
                binding.tilName.editText!!.setText(firstName)
            }
            if (has("lastName")) {
                val lastName = get("lastName").toString()
                Timber.d("Setting first contact last name from user profile")
                binding.tilLastname.editText!!.setText(lastName)
            }
            if (has("phone")) {
                val phone = get("phone").toString()
                Timber.d("Setting first contact phone from user profile")
                binding.tilUserPhone.editText!!.setText(PhoneNumberUtils.parsePhoneCountryCode(phone))
            }
            getParseFile("image")?.let {
                Timber.d("Loading first contact profile image from user profile")
                binding.imageProfile.loadImage(it.url, fallback = DefaultIcons.PROFILE_PLACEHOLDER)
            } ?: run {
                Timber.d("No profile image found, using placeholder")
                binding.imageProfile.loadImage(DefaultIcons.PROFILE_PLACEHOLDER, fallback = DefaultIcons.PROFILE_PLACEHOLDER)
            }
        }
        if (BuildConfig.DEBUG) {
            Timber.d("Debug build detected, setting default nickname to 'Father'")
            binding.tilNickname.editText!!.setText("Father")
        }
    }

    private fun showErrorDialog(title: String, description: String?) {
        Timber.e("Showing error dialog - Title: $title, Description: $description")
        val defaultErrorDialog = DefaultErrorDialog()
        defaultErrorDialog.arguments = bundleOf(
            "icon" to "",
            "title" to title,
            "description" to description,
        )
        defaultErrorDialog.show(childFragmentManager, title)
    }

    private fun navigateById(navId: Int, bundle: Bundle = bundleOf()) {
        Timber.d("Navigating to destination with id: $navId and bundle: $bundle")
        val navController = findNavController()
        if (navController.currentDestination?.getAction(navId) != null) {
            navController.navigate(navId, bundle)
        } else {
            Timber.w("Skipping stale navigation to $navId from ${navController.currentDestination?.label}")
        }
    }

    private fun setupListeners() {
        Timber.d("Setting up UI element listeners")
        binding.root.setOnClickListener {
            it.hideKeyboard()
        }
        setAddImageButtonListener()
        setupNicknameListener()
        setupNameListener()
        setupLastnameListener()
        setupPhoneNumberListener()
        setupButtonNextListener()
    }

    private fun showProgressIndicator() {
        Timber.d("Showing progress indicator and disabling next button")
        binding.buttonNext.visibility = View.INVISIBLE
        binding.buttonNext.isClickable = false
        binding.progressIndicator.visibility = View.VISIBLE
    }

    private fun hideProgressIndicator() {
        Timber.d("Hiding progress indicator and enabling next button")
        binding.buttonNext.visibility = View.VISIBLE
        binding.buttonNext.isClickable = true
        binding.progressIndicator.visibility = View.GONE
    }

    private fun observeViewModel() {
        Timber.d("Setting up ViewModel observers")
        addFirstMomoViewModel.firstContactStatus.observe(viewLifecycleOwner) { status ->
            Timber.d("FirstContactStatus updated: $status")
            when (status) {
                FirstContactStatus.SAVING_CONTACT -> {
                    Timber.d("Saving contact in progress")
                    showProgressIndicator()
                }
                FirstContactStatus.CONTACT_SAVED -> {
                    Timber.d("Contact saved successfully")
                    hideProgressIndicator()
                    val hasPreInsertedSim = addFirstMomoViewModel.hasPreInsertedSim()
                    Timber.d("Has pre-inserted SIM: $hasPreInsertedSim")
                    if (hasPreInsertedSim) {
                        navigateById(R.id.action_firstContactFragment_to_hasPreInsertedSimFragment)
                    } else {
                        navigateById(R.id.action_firstContactFragment_to_configureSimFragment)
                    }
                }
                FirstContactStatus.ERROR_SAVING -> {
                    Timber.e("Error saving contact")
                    hideProgressIndicator()
                    showErrorDialog(getString(R.string.dialog_imei_error_title), getString(R.string.add_watch_first_contact_dialog_error_description))
                }
                FirstContactStatus.ERROR_CONTACT_DUPLICATED -> {
                    Timber.w("Contact already exists")
                    hideProgressIndicator()
                    val hasPreInsertedSim = addFirstMomoViewModel.hasPreInsertedSim()
                    Timber.d("Has pre-inserted SIM: $hasPreInsertedSim")
                    if (hasPreInsertedSim) {
                        navigateById(R.id.action_firstContactFragment_to_hasPreInsertedSimFragment)
                    } else {
                        navigateById(R.id.action_firstContactFragment_to_configureSimFragment)
                    }
                }
                else -> {
                    Timber.e("Unexpected status: $status")
                    hideProgressIndicator()
                    showErrorDialog(getString(R.string.add_watch_first_contact_dialog_error_title), status.toString())
                }
            }
        }

        addFirstMomoViewModel.watchAvailabilityStatus.observe(viewLifecycleOwner) { status ->
            Timber.d("Watch availability status updated: $status")
            when (status) {
                WatchAvailabilityStatus.SUCCESS_WITH_SIM_PRE_INSERTED -> {
                    Timber.d("Setting progress step to 1 for pre-inserted SIM")
                    addFirstMomoViewModel.setProgressStep(1)
                }
                else -> {
                    Timber.d("Setting progress step to 2 for standard flow")
                    addFirstMomoViewModel.setProgressStep(2)
                }
            }
        }
    }

    private fun setupNicknameListener() {
        Timber.d("Setting up nickname text change listener")
        binding.tilNickname.editText?.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(charSequence: CharSequence, i: Int, i1: Int, i2: Int) {
                Timber.v("Nickname before text changed")
            }

            override fun onTextChanged(charSequence: CharSequence, i: Int, i1: Int, i2: Int) {
                if (binding.tilNickname.isErrorEnabled) {
                    Timber.d("Clearing nickname error state")
                    binding.tilNickname.isErrorEnabled = false
                }
            }

            override fun afterTextChanged(editable: Editable) {
                Timber.v("Nickname field changed")
            }
        })
    }

    private fun setupNameListener() {
        Timber.d("Setting up name text change listener")
        binding.tilName.editText?.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(charSequence: CharSequence, i: Int, i1: Int, i2: Int) {
                Timber.v("Name field before text changed")
            }

            override fun onTextChanged(charSequence: CharSequence, i: Int, i1: Int, i2: Int) {
                if (binding.tilName.isErrorEnabled) {
                    Timber.d("Clearing name error state")
                    binding.tilName.isErrorEnabled = false
                }
            }

            override fun afterTextChanged(editable: Editable) {
                Timber.v("Name field changed")
            }
        })
    }

    private fun setupLastnameListener() {
        Timber.d("Setting up lastname text change listener")
        binding.tilLastname.editText?.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(charSequence: CharSequence, i: Int, i1: Int, i2: Int) {
                Timber.v("Lastname field before text changed")
            }

            override fun onTextChanged(charSequence: CharSequence, i: Int, i1: Int, i2: Int) {
                if (binding.tilLastname.isErrorEnabled) {
                    Timber.d("Clearing lastname error state")
                    binding.tilLastname.isErrorEnabled = false
                }
            }

            override fun afterTextChanged(editable: Editable) {
                Timber.v("Lastname field changed")
            }
        })
    }

    private fun setupPhoneNumberListener() {
        Timber.d("Setting up phone number text change listener")
        binding.tilUserPhone.editText?.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(charSequence: CharSequence, i: Int, i1: Int, i2: Int) {
                Timber.v("Phone number field before text changed")
            }

            override fun onTextChanged(charSequence: CharSequence, i: Int, i1: Int, i2: Int) {
                if (binding.tilUserPhone.isErrorEnabled) {
                    Timber.d("Clearing phone number error state")
                    binding.tilUserPhone.isErrorEnabled = false
                }
            }

            override fun afterTextChanged(editable: Editable) {
                Timber.v("Phone number field changed")
            }
        })
        binding.ccp.registerCarrierNumberEditText(binding.tilUserPhone.editText)
    }

    private fun setupButtonNextListener() {
        Timber.d("Setting up next button click listener")
        binding.buttonNext.setOnClickListener {
            if (!isFormInfoValid()) {
                Timber.w("Form validation failed - cannot proceed")
                return@setOnClickListener
            }

            val contactName = "${binding.tilNickname.editText!!.text} - ${binding.tilName.editText!!.text} ${binding.tilLastname.editText!!.text}"
            val phoneNumber = binding.ccp.fullNumberWithPlus
            Timber.d("Form validated successfully. Saving first contact")

            addFirstMomoViewModel.onContactEntered(
                contactName,
                phoneNumber,
                currentImagePath
            )
        }
    }

    private fun isFormInfoValid(): Boolean {
        Timber.d("Validating form information")
        if (binding.tilNickname.editText!!.text.isNullOrBlank()){
            Timber.w("Validation failed: Nickname is empty")
            binding.tilNickname.error = getString(R.string.add_watch_first_contact_label_error_nickname)
            return false
        }
        if (binding.tilName.editText!!.text.isNullOrBlank()){
            Timber.w("Validation failed: Name is empty")
            binding.tilName.error = getString(R.string.add_watch_first_contact_label_error_name)
            return false
        }
        if (binding.tilLastname.editText!!.text.isNullOrBlank()){
            Timber.w("Validation failed: Lastname is empty")
            binding.tilLastname.error = getString(R.string.add_watch_first_contact_label_error_last_name)
            return false
        }
        if (!PhoneNumberUtils.isValidPhoneNumber(binding.ccp)) {
            Timber.w("Validation failed: Invalid phone number")
            binding.tilUserPhone.error = getString(R.string.add_watch_first_contact_label_error_phone_number)
            return false
        }
        Timber.d("Form validation successful")
        return true
    }

    private fun setAddImageButtonListener() {
        Timber.d("Setting up add image button click listener")
        binding.addImageButton.setOnClickListener {
            createProfilePictureOptionsDialog()
        }
    }

    override fun onImageLoaded(path: String?) {
        Timber.d("Image loaded from path: $path")
        currentImagePath = path
        path?.let {
            binding.imageProfile.loadCircularImage(it, 2f, fallback = R.drawable.ic_profile_image_placeholder)
        } ?: run {
            binding.imageProfile.loadCircularImage(null as String?, 2f, fallback = R.drawable.ic_profile_image_placeholder)
            currentImagePath = null
        }
    }

    private fun createProfilePictureOptionsDialog() {
        Timber.d("Creating profile picture options dialog")
        val items = arrayOf<CharSequence>(
            getString(R.string.photo_delete),
            getString(R.string.photo_take_new),
            getString(R.string.photo_select_from_gallery)
        )
        val builder = AlertDialog.Builder(requireContext())
        builder.setTitle(getString(R.string.change_photo))
        builder.setItems(items) { _, item ->
            when (item) {
                0 -> deletePhoto()
                1 -> takePictureOrRequestPermission()
                2 -> launchSelectPictureFromGallery()
            }
        }
        builder.setNegativeButton(R.string.button_cancel) { dialogInterface: DialogInterface, _: Int ->
            Timber.d("Profile picture dialog cancelled")
            dialogInterface.dismiss()
        }
        builder.show()
    }

    private fun takePictureOrRequestPermission() {
        Timber.d("Attempting to take picture or request camera permission")
        if (hasCameraPermission) {
            Timber.d("Camera permission already granted, launching camera")
            return launchTakePicture()
        }
        else {
            Timber.d("Requesting camera permission")
            requestCameraPermissionLauncher.launch(android.Manifest.permission.CAMERA)
        }
    }

    private fun deletePhoto() {
        Timber.d("Deleting profile photo")
        currentImagePath = null
        val placeholder = AppCompatResources.getDrawable(requireContext(), R.drawable.ic_profile_image_placeholder)
        binding.imageProfile.loadCircularImage(null as String?, 2f, fallback = R.drawable.ic_profile_image_placeholder)
    }

    override fun onDestroyView() {
        Timber.d("Destroying FirstContactFragment view")
        super.onDestroyView()
        dispose()
    }

    private fun dispose() {
        Timber.d("Disposing FirstContactFragment resources")
    }
}
