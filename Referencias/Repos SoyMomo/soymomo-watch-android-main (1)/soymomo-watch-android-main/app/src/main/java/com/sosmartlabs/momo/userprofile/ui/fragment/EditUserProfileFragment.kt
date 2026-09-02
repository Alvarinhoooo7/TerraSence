package com.sosmartlabs.momo.userprofile.ui.fragment

import android.content.Context
import android.content.DialogInterface
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.inputmethod.InputMethodManager
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.Toolbar
import androidx.core.content.ContextCompat
import androidx.fragment.app.activityViewModels
import com.google.android.material.datepicker.CalendarConstraints
import com.google.android.material.datepicker.DateValidatorPointBackward
import com.google.android.material.datepicker.MaterialDatePicker
import com.parse.ParseUser
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.takepicture.TakePictureFragment
import com.sosmartlabs.momo.databinding.UserProfileEditFragmentBinding
import com.sosmartlabs.momo.userprofile.ui.UserProfileViewModel
import com.sosmartlabs.momo.utils.PhoneNumberUtils
import com.sosmartlabs.momo.utils.Resource
import com.sosmartlabs.momo.utils.ui.DefaultIcons
import com.sosmartlabs.momo.utils.ui.loadImage
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import java.util.TimeZone

@AndroidEntryPoint
class EditUserProfileFragment: TakePictureFragment() {

    /**
     * Binding
     */
    private lateinit var binding: UserProfileEditFragmentBinding

    val toolbar: Toolbar get() = binding.toolbar

    private val toolbarTitle: String get() = getString(R.string.user_profile_edit_profile_title)

    /**
     * ViewModel
     */
    private val userProfileViewModel: UserProfileViewModel by activityViewModels()

    override val objectId: String = ""

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        binding = UserProfileEditFragmentBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupToolbar()
        setListeners()
        observeViewModel()
    }

    override fun onResume() {
        super.onResume()
        userProfileViewModel.getCurrentUser()
    }

    override fun onImageLoaded(path: String?) {
        path?.let {
            userProfileViewModel.changeUserPicture(it)
        }
    }

    private fun setupToolbar() {
        Timber.d("setupToolbar")
        with(activity as AppCompatActivity) {
            setSupportActionBar(toolbar)
            supportActionBar?.apply {
                title = toolbarTitle
                setDisplayShowTitleEnabled(true)
                setDisplayHomeAsUpEnabled(true)
                setDisplayShowHomeEnabled(true)
            }
            window.statusBarColor = ContextCompat.getColor(requireContext(), R.color.background_sim_step_card_title)
            window.navigationBarColor = ContextCompat.getColor(requireContext(), R.color.white)
            toolbar.setNavigationOnClickListener { onBackPressed() }
        }
    }

    private fun setListeners() {
        setupPhotoListener()
        setupNameListener()
        setupLastnameListener()
        setupBirthdayListener()
        setupPhoneNumberListener()

        binding.buttonSaveChanges.setOnClickListener {
            if (!isFormInfoValid()) {
                return@setOnClickListener
            }
            val params = createUserInfoMap()
            userProfileViewModel.saveUserInfo(params)
            clearEditTextFocus()
            it.hideKeyboard()
        }

        binding.parentLayout.setOnClickListener {
            it.hideKeyboard()
        }
    }

    private fun observeViewModel() {
        userProfileViewModel.currentUser.observe(viewLifecycleOwner) {
            Timber.d("currentUser $it")
            when (it.status) {
                Resource.Status.LOADING -> {
                    // No-Op
                }
                Resource.Status.LOAD_SUCCESS -> {
                    it.data?.let { currentUser ->
                        setUserData(currentUser)
                    }
                }
                Resource.Status.LOAD_ERROR -> {
                    Toast.makeText(context, R.string.user_profile_form_changes_error, Toast.LENGTH_SHORT).show()
                }
                Resource.Status.UPDATING -> {
                    binding.buttonSaveChanges.visibility = View.INVISIBLE
                    binding.progressIndicator.visibility = View.VISIBLE
                }
                Resource.Status.UPDATING_SUCCESS -> {
                    binding.buttonSaveChanges.visibility = View.VISIBLE
                    binding.progressIndicator.visibility = View.INVISIBLE
                    Toast.makeText(context, R.string.user_profile_form_changes_success, Toast.LENGTH_SHORT).show()
                }
                Resource.Status.UPDATING_ERROR -> {
                    binding.buttonSaveChanges.visibility = View.VISIBLE
                    binding.progressIndicator.visibility = View.INVISIBLE
                    Toast.makeText(context, R.string.user_profile_form_changes_error, Toast.LENGTH_SHORT).show()
                }
                else -> {
                    // No-Op
                }
            }
        }

        userProfileViewModel.userFormHasChanges.observe(viewLifecycleOwner) {
            Timber.d("userFormHasChanges $it")
            binding.buttonSaveChanges.isEnabled = it
        }

        userProfileViewModel.userPictureStatus.observe(viewLifecycleOwner) {
            Timber.d("userPictureStatus $it")
            when (it) {
                Resource.Status.DELETING -> {
                    binding.userProfilePictureButton.visibility = View.INVISIBLE
                    binding.userProfilePicture.visibility = View.INVISIBLE
                    binding.pictureProgressIndicator.visibility = View.VISIBLE
                }
                Resource.Status.DELETING_SUCCESS -> {
                    binding.userProfilePictureButton.visibility = View.VISIBLE
                    binding.userProfilePicture.visibility = View.VISIBLE
                    binding.pictureProgressIndicator.visibility = View.INVISIBLE
                    Toast.makeText(context, R.string.user_profile_form_changes_success, Toast.LENGTH_SHORT).show()
                }
                Resource.Status.DELETING_ERROR -> {
                    binding.userProfilePictureButton.visibility = View.VISIBLE
                    binding.userProfilePicture.visibility = View.VISIBLE
                    binding.pictureProgressIndicator.visibility = View.INVISIBLE
                    Toast.makeText(context, R.string.user_profile_form_changes_error, Toast.LENGTH_SHORT).show()
                }
                Resource.Status.UPDATING -> {
                    binding.userProfilePictureButton.visibility = View.INVISIBLE
                    binding.userProfilePicture.visibility = View.INVISIBLE
                    binding.pictureProgressIndicator.visibility = View.VISIBLE
                }
                Resource.Status.UPDATING_SUCCESS -> {
                    binding.userProfilePictureButton.visibility = View.VISIBLE
                    binding.userProfilePicture.visibility = View.VISIBLE
                    binding.pictureProgressIndicator.visibility = View.INVISIBLE
                    Toast.makeText(context, R.string.user_profile_form_changes_success, Toast.LENGTH_SHORT).show()
                }
                Resource.Status.UPDATING_ERROR -> {
                    binding.userProfilePictureButton.visibility = View.VISIBLE
                    binding.userProfilePicture.visibility = View.VISIBLE
                    binding.pictureProgressIndicator.visibility = View.INVISIBLE
                    Toast.makeText(context, R.string.user_profile_form_changes_error, Toast.LENGTH_SHORT).show()
                }
                else -> {
                    // No-Op
                }
            }
        }
    }

    private fun setUserData(user: ParseUser) {
        with(user) {
            val imageUrl = getParseFile("image")?.url ?: DefaultIcons.PROFILE_PLACEHOLDER
            binding.userProfilePicture.loadImage(imageUrl, fallback = DefaultIcons.PROFILE_PLACEHOLDER)

            val firstName = getString("firstName") ?: ""
            binding.tilName.editText!!.setText(firstName)

            val lastName = getString("lastName") ?: ""
            binding.tilLastName.editText!!.setText(lastName)

            val phone = getString("phone") ?: ""
            binding.tilUserPhone.editText!!.setText(PhoneNumberUtils.parsePhoneCountryCode(phone))

            val birthday = getDate("birthday")
            val simpleDateFormat = SimpleDateFormat("dd/MM/yyyy", Locale.getDefault()).apply {
                timeZone = TimeZone.getTimeZone("UTC")
            }
            binding.tilBirthday.editText!!.setText(birthday?.let { simpleDateFormat.format(it)})
        }
    }

    private fun setupPhotoListener() {
        binding.userProfilePictureButton.setOnClickListener {
            val items = arrayOf<CharSequence>(
                getString(com.sosmartlabs.momologin.R.string.photo_delete),
                getString(com.sosmartlabs.momologin.R.string.photo_take_new),
                getString(com.sosmartlabs.momologin.R.string.photo_select_from_gallery)
            )

            val builder = AlertDialog.Builder(requireContext())
            builder.setTitle(getString(com.sosmartlabs.momologin.R.string.change_photo))
            builder.setItems(items) { _, item ->
                when (item) {
                    0 -> { userProfileViewModel.removeUserPicture() }
                    1 -> { takeCameraPictureOrRequestPermission() }
                    2 -> { launchSelectPictureFromGallery() }
                }
            }
            builder.setNegativeButton(com.sosmartlabs.momologin.R.string.button_cancel) { dialogInterface: DialogInterface, _: Int ->
                dialogInterface.dismiss()
            }
            builder.show()
        }
    }

    private fun setupNameListener() {
        binding.tilName.editText?.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(charSequence: CharSequence, i: Int, i1: Int, i2: Int) {

            }

            override fun onTextChanged(charSequence: CharSequence, i: Int, i1: Int, i2: Int) {
                Timber.d("onTextChanged")
                if (binding.tilName.isErrorEnabled) binding.tilName.isErrorEnabled = false
            }

            override fun afterTextChanged(editable: Editable) {
                Timber.d("afterTextChanged")
                val userInfoMap = createUserInfoMap()
                userProfileViewModel.checkUserHasChanges(userInfoMap)
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
                val userInfoMap = createUserInfoMap()
                userProfileViewModel.checkUserHasChanges(userInfoMap)
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
                .setInputMode(MaterialDatePicker.INPUT_MODE_CALENDAR)
                .setSelection(MaterialDatePicker.todayInUtcMilliseconds())
                .setCalendarConstraints(constraintsBuilder)
                .build()

            datePicker.show(parentFragmentManager, "DATE_PICKER")

            datePicker.addOnPositiveButtonClickListener {
                val calendar = Calendar.getInstance()
                calendar.timeInMillis = it
                val format = SimpleDateFormat("dd/MM/yyyy", Locale.getDefault()).apply {
                    timeZone = TimeZone.getTimeZone("UTC")
                }
                binding.tilBirthday.editText!!.setText(format.format(calendar.time))
                val userInfoMap = createUserInfoMap()
                userProfileViewModel.checkUserHasChanges(userInfoMap)
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

    private fun setupPhoneNumberListener() {
        binding.tilUserPhone.editText?.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(charSequence: CharSequence, i: Int, i1: Int, i2: Int) {

            }

            override fun onTextChanged(charSequence: CharSequence, i: Int, i1: Int, i2: Int) {
                if (binding.tilUserPhone.isErrorEnabled) binding.tilUserPhone.isErrorEnabled = false
            }

            override fun afterTextChanged(editable: Editable) {
                val userInfoMap = createUserInfoMap()
                userProfileViewModel.checkUserHasChanges(userInfoMap)
            }
        })
        binding.ccp.registerCarrierNumberEditText(binding.tilUserPhone.editText)
    }

    private fun clearEditTextFocus() {
        binding.tilName.editText!!.clearFocus()
        binding.tilLastName.editText!!.clearFocus()
        binding.tilUserPhone.editText!!.clearFocus()
        binding.tilBirthday.editText!!.clearFocus()
    }

    private fun createUserInfoMap(): MutableMap<String, Any> {
        val params = mutableMapOf<String, Any>()
        params["firstName"] = binding.tilName.editText!!.text.toString()
        params["lastName"] = binding.tilLastName.editText!!.text.toString()
        params["birthday"] = binding.tilBirthday.editText!!.text.toString()
        params["phone"] = "${binding.ccp.selectedCountryCodeWithPlus}${binding.tilUserPhone.editText!!.text}".filterNot { it.isWhitespace() }
        return params
    }

    private fun isFormInfoValid(): Boolean {
        var isValid = true

        if (binding.tilName.editText!!.text.isNullOrBlank()) {
            binding.tilName.isErrorEnabled = true
            binding.tilName.error = getString(R.string.user_profile_form_error_first_name_empty)
            isValid = false
        }
        if (binding.tilLastName.editText!!.text.isNullOrBlank()) {
            binding.tilLastName.isErrorEnabled = true
            binding.tilLastName.error = getString(R.string.user_profile_form_error_last_name_empty)
            isValid = false
        }
        if (binding.tilBirthday.editText!!.text.isNullOrBlank()) {
            binding.tilBirthday.isErrorEnabled = true
            binding.tilBirthday.error = getString(R.string.user_profile_form_error_birthday)
            isValid = false
        }
        if (binding.tilUserPhone.editText!!.text.isNullOrBlank()) {
            binding.tilUserPhone.isErrorEnabled = true
            binding.tilUserPhone.error = getString(R.string.user_profile_form_error_phone_number_empty)
            isValid = false
        }
        if (!PhoneNumberUtils.isValidPhoneNumber(binding.ccp)) {
            binding.tilUserPhone.isErrorEnabled = true
            binding.tilUserPhone.error = getString(R.string.user_profile_form_error_phone_number)
            isValid = false
        }

        return isValid
    }

    private fun View.hideKeyboard() {
        val inputMethodManager = context.getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager
        inputMethodManager.hideSoftInputFromWindow(windowToken, 0)
        clearFocus()
    }

    private fun takeCameraPictureOrRequestPermission() {
        if (hasCameraPermission) launchTakePicture()
        else requestCameraPermissionLauncher.launch(android.Manifest.permission.CAMERA)
    }

    override fun onDestroyView() {
        super.onDestroyView()
        dispose()
    }

    private fun dispose() {
        userProfileViewModel.resetUserPictureStatus()
    }
}