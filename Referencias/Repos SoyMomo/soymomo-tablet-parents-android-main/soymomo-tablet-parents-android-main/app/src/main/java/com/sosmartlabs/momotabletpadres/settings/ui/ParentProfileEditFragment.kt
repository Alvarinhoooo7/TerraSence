package com.sosmartlabs.momotabletpadres.settings.ui

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
import androidx.fragment.app.activityViewModels
import com.parse.ParseUser
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.databinding.FragmentParentProfileEditBinding
import com.sosmartlabs.momotabletpadres.settings.ui.picture.TakePictureFragment
import com.sosmartlabs.momotabletpadres.utils.PhoneNumberUtils
import com.sosmartlabs.momotabletpadres.utils.Resource
import com.sosmartlabs.momotabletpadres.utils.WindowInsetsUtils
import com.sosmartlabs.momotabletpadres.glide.loadCircularImage
import com.sosmartlabs.momotabletpadres.viewmodels.UserProfileViewModel
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber

@AndroidEntryPoint
class ParentProfileEditFragment: TakePictureFragment() {

    private lateinit var binding: FragmentParentProfileEditBinding
    val toolbar: Toolbar get() = binding.toolbar
    private val userProfileViewModel: UserProfileViewModel by activityViewModels()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        binding = FragmentParentProfileEditBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        WindowInsetsUtils.applyBottomInsetAsPadding(binding.nestedScrollView, includeImeBottom = true)
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
                setDisplayShowTitleEnabled(false)
                setDisplayHomeAsUpEnabled(true)
                setDisplayShowHomeEnabled(true)
            }
            toolbar.setNavigationOnClickListener { onBackPressed() }
        }
    }

    private fun setListeners() {
        setupPhotoListener()
        setupNameListener()
        setupLastnameListener()
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
            val imageUrl = getParseFile("image")?.url ?: R.drawable.default_parent_profile_pic
            binding.userProfilePicture.loadCircularImage(imageUrl, 2f, fallback =  R.drawable.default_parent_profile_pic)

            val firstName = getString("firstName") ?: ""
            binding.tilName.editText!!.setText(firstName)

            val lastName = getString("lastName") ?: ""
            binding.tilLastName.editText!!.setText(lastName)

            val phone = getString("phone") ?: ""
            binding.tilUserPhone.editText!!.setText(PhoneNumberUtils.parsePhoneCountryCode(phone))
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
    }

    private fun createUserInfoMap(): MutableMap<String, Any> {
        val params = mutableMapOf<String, Any>()
        params["firstName"] = binding.tilName.editText!!.text.toString()
        params["lastName"] = binding.tilLastName.editText!!.text.toString()
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