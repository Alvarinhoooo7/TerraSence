package com.sosmartlabs.momotabletpadres.tabletsettings.profile

import android.Manifest
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
import com.google.android.material.datepicker.CalendarConstraints
import com.google.android.material.datepicker.DateValidatorPointBackward
import com.google.android.material.datepicker.MaterialDatePicker
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.databinding.FragmentKidProfileBinding
import com.sosmartlabs.momotabletpadres.settings.ui.picture.TakePictureFragment
import com.sosmartlabs.momotabletpadres.utils.Resource
import com.sosmartlabs.momotabletpadres.utils.WindowInsetsUtils
import com.sosmartlabs.momotabletpadres.glide.loadCircularImage
import com.sosmartlabs.momotabletpadres.viewmodels.KidProfileViewModel
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import java.util.TimeZone

@AndroidEntryPoint
class KidProfileEditFragment: TakePictureFragment() {

    private lateinit var binding: FragmentKidProfileBinding
    val toolbar: Toolbar get() = binding.toolbar
    private val toolbarTitle: String get() = getString(R.string.onboarding_child_profile)
    private val kidProfileViewModel: KidProfileViewModel by activityViewModels()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        binding = FragmentKidProfileBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        WindowInsetsUtils.applyEdgeToEdgeInsets(
            root = binding.root,
            topView = binding.appBarLayout,
            bottomView = binding.contentScrollView,
            includeImeBottom = true,
        )
        setupToolbar()
        setListeners()
        observeViewModel()
    }

    override fun onResume() {
        super.onResume()
    }

    override fun onImageLoaded(path: String?) {
        path?.let {
            kidProfileViewModel.changeKidPicture(it)
        }
    }

    private fun setupToolbar() {
        Timber.d("setupToolbar")
        (activity as AppCompatActivity).apply {
            setSupportActionBar(binding.toolbar)
            supportActionBar?.apply {
                setDisplayShowTitleEnabled(false)
                setDisplayHomeAsUpEnabled(true)
                setDisplayShowHomeEnabled(true)
            }
        }
        setHasOptionsMenu(true)
    }

    private fun setListeners() {
        setupPhotoListener()
        setupNameListener()
        setupBirthdayListener()

        binding.buttonSaveChanges.setOnClickListener {
            if (!isFormInfoValid()) {
                return@setOnClickListener
            }
            val params = createKidInfoMap()
            kidProfileViewModel.saveKidInfo(params)
            clearEditTextFocus()
            it.hideKeyboard()
        }

        binding.parentLayout.setOnClickListener {
            it.hideKeyboard()
        }
    }

    private fun observeViewModel() {
        kidProfileViewModel.currentTablet.observe(viewLifecycleOwner) {
            Timber.d("currentTablet $it")
            when (it.status) {
                Resource.Status.LOADING -> {
                    // No-Op
                }
                Resource.Status.LOAD_SUCCESS -> {
                    it.data?.let { currentUser ->
                        setTabletData(currentUser)
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

        kidProfileViewModel.kidFormHasChanges.observe(viewLifecycleOwner) {
            Timber.d("kidFormHasChanges $it")
            binding.buttonSaveChanges.isEnabled = it
        }

        kidProfileViewModel.kidPictureStatus.observe(viewLifecycleOwner) {
            Timber.d("kidPictureStatus $it")
            when (it) {
                Resource.Status.DELETING -> {
                    binding.kidProfilePictureButton.visibility = View.INVISIBLE
                    binding.kidProfilePicture.visibility = View.INVISIBLE
                    binding.pictureProgressIndicator.visibility = View.VISIBLE
                }
                Resource.Status.DELETING_SUCCESS -> {
                    binding.kidProfilePictureButton.visibility = View.VISIBLE
                    binding.kidProfilePicture.visibility = View.VISIBLE
                    binding.pictureProgressIndicator.visibility = View.INVISIBLE
                    Toast.makeText(context, R.string.user_profile_form_changes_success, Toast.LENGTH_SHORT).show()
                }
                Resource.Status.DELETING_ERROR -> {
                    binding.kidProfilePictureButton.visibility = View.VISIBLE
                    binding.kidProfilePicture.visibility = View.VISIBLE
                    binding.pictureProgressIndicator.visibility = View.INVISIBLE
                    Toast.makeText(context, R.string.user_profile_form_changes_error, Toast.LENGTH_SHORT).show()
                }
                Resource.Status.UPDATING -> {
                    binding.kidProfilePictureButton.visibility = View.INVISIBLE
                    binding.kidProfilePicture.visibility = View.INVISIBLE
                    binding.pictureProgressIndicator.visibility = View.VISIBLE
                }
                Resource.Status.UPDATING_SUCCESS -> {
                    binding.kidProfilePictureButton.visibility = View.VISIBLE
                    binding.kidProfilePicture.visibility = View.VISIBLE
                    binding.pictureProgressIndicator.visibility = View.INVISIBLE
                    Toast.makeText(context, R.string.user_profile_form_changes_success, Toast.LENGTH_SHORT).show()
                }
                Resource.Status.UPDATING_ERROR -> {
                    binding.kidProfilePictureButton.visibility = View.VISIBLE
                    binding.kidProfilePicture.visibility = View.VISIBLE
                    binding.pictureProgressIndicator.visibility = View.INVISIBLE
                    Toast.makeText(context, R.string.user_profile_form_changes_error, Toast.LENGTH_SHORT).show()
                }
                else -> {
                    // No-Op
                }
            }
        }
    }

    private fun setTabletData(tablet: Tablet) {
        with(tablet) {
            val imageUrl = profilePicture?.url ?: R.drawable.default_profile_pic
            binding.kidProfilePicture.loadCircularImage(imageUrl, 2f, fallback =  R.drawable.default_profile_pic)

            val profileName = profileName ?: ""
            binding.tilName.editText!!.setText(profileName)

            val birthday = kidBirthday
            val simpleDateFormat = SimpleDateFormat("dd/MM/yyyy", Locale.getDefault()).apply {
                timeZone = TimeZone.getTimeZone("UTC")
            }
            binding.tilBirthday.editText!!.setText(birthday?.let { simpleDateFormat.format(it)})
        }
    }

    private fun setupPhotoListener() {
        binding.kidProfilePictureButton.setOnClickListener {
            val items = arrayOf<CharSequence>(
                getString(com.sosmartlabs.momologin.R.string.photo_take_new),
                getString(com.sosmartlabs.momologin.R.string.photo_select_from_gallery)
            )

            val builder = AlertDialog.Builder(requireContext())
            builder.setTitle(getString(com.sosmartlabs.momologin.R.string.change_photo))
            builder.setItems(items) { _, item ->
                when (item) {
                    0 -> { takeCameraPictureOrRequestPermission() }
                    1 -> { launchSelectPictureFromGallery() }
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
                val kidInfoMap = createKidInfoMap()
                kidProfileViewModel.checkKidHasChanges(kidInfoMap)
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
                val kidInfoMap = createKidInfoMap()
                kidProfileViewModel.checkKidHasChanges(kidInfoMap)
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

    private fun clearEditTextFocus() {
        binding.tilName.editText!!.clearFocus()
        binding.tilBirthday.editText!!.clearFocus()
    }

    private fun createKidInfoMap(): MutableMap<String, Any> {
        val params = mutableMapOf<String, Any>()
        params["profileName"] = binding.tilName.editText!!.text.toString()
        params["birthday"] = binding.tilBirthday.editText!!.text.toString()
        return params
    }

    private fun isFormInfoValid(): Boolean {
        var isValid = true

        if (binding.tilName.editText!!.text.isNullOrBlank()) {
            binding.tilName.isErrorEnabled = true
            binding.tilName.error = getString(R.string.user_profile_form_error_first_name_empty)
            isValid = false
        }
        if (binding.tilBirthday.editText!!.text.isNullOrBlank()) {
            binding.tilBirthday.isErrorEnabled = true
            binding.tilBirthday.error = getString(R.string.user_profile_form_error_birthday)
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
        else requestCameraPermissionLauncher.launch(Manifest.permission.CAMERA)
    }

    override fun onDestroyView() {
        super.onDestroyView()
        dispose()
    }

    private fun dispose() {
        kidProfileViewModel.resetKidPictureStatus()
    }
}