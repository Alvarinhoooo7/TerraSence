package com.sosmartlabs.momo.linkwatch.ui.fragments


import android.app.ProgressDialog
import android.content.DialogInterface
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.Toolbar
import androidx.core.content.ContextCompat
import androidx.core.os.bundleOf
import androidx.core.widget.addTextChangedListener
import androidx.fragment.app.activityViewModels
import androidx.fragment.app.viewModels
import androidx.lifecycle.MutableLiveData
import androidx.navigation.fragment.findNavController
import com.google.android.material.textfield.TextInputLayout
import com.parse.ParseException
import com.parse.ParseFile
import com.parse.ParseUser
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.LinkwatchFragmentAdminDataBinding
import com.sosmartlabs.momo.linkwatch.LinkWatchActivity
import com.sosmartlabs.momo.linkwatch.ui.LinkWatchAdminDataViewModel
import com.sosmartlabs.momo.linkwatch.ui.LinkWatchViewModel
import com.sosmartlabs.momo.takepicture.TakePictureFragment
import com.sosmartlabs.momo.utils.ui.loadImage
import com.sosmartlabs.momologin.utils.colors.ColorProvider
import com.sosmartlabs.momologin.utils.validation.ValidationError
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber
import java.io.File
import javax.inject.Inject

@AndroidEntryPoint
class AdminDataFragment @Inject constructor() : TakePictureFragment() {

    private lateinit var binding: LinkwatchFragmentAdminDataBinding

    val toolbar: Toolbar get() = binding.toolbar
    override val objectId: String = ""

    @Inject
    lateinit var colorProvider: ColorProvider

    private val _linkWatchViewModel: LinkWatchViewModel by activityViewModels()
    private val _linWatchAdminDataViewModel: LinkWatchAdminDataViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        binding = LinkwatchFragmentAdminDataBinding.inflate(inflater, container, false)
        binding.adminDataCardview.lifecycleOwner = viewLifecycleOwner
        binding.adminDataCardview.viewModel = _linWatchAdminDataViewModel
        return binding.root
    }

    override fun onImageLoaded(path: String?) {
        if (path == null) return

        val progressDialog = ProgressDialog(requireActivity())
        val parseFile = ParseFile(File(path))
        val user = ParseUser.getCurrentUser()

        val fileLoaded = MutableLiveData<Boolean>()
        parseFile.saveInBackground { e: ParseException? ->
            if (e != null) {
                toastMessage(com.sosmartlabs.momologin.R.string.toast_error_saving_photo)
            } else {
                user!!.put("image", parseFile)
                fileLoaded.postValue(true)
            }
        }

        fileLoaded.observe(this) {fileUploaded : Boolean ->
            if (!fileUploaded) return@observe
            user.saveInBackground { error: ParseException? ->
                progressDialog.dismiss()
                if (error != null) {
                    toastMessage(com.sosmartlabs.momologin.R.string.toast_error_saving_photo)
                }
                else {
                    toastMessage(com.sosmartlabs.momologin.R.string.toast_photo_saved)
                    setUserImage()
                }
            }
        }
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupToolbar()
        _linWatchAdminDataViewModel.setUser(ParseUser.getCurrentUser(), requireContext())
        setUserImage()
        setupListeners()
        setupInputListeners()
        setupCCPListener()
    }

    private fun setupListeners() {
        binding.adminDataCardview.linkButton.setOnClickListener() {
            validateData()
        }
        binding.fabAddImage.setOnClickListener {
            addImage()
        }
        binding.adminProfilePic.setOnClickListener {
            addImage()
        }
        setupInputListeners()
        setupCCPListener()
    }

    private fun removeImage() {
        val progressDialog = ProgressDialog(requireActivity())
        progressDialog.setMessage(getString(com.sosmartlabs.momologin.R.string.progress_deleting_photo))
        progressDialog.show()
        val user = ParseUser.getCurrentUser()

        user!!.remove("image")
        user.saveInBackground { e: ParseException? ->
            progressDialog.dismiss()
            if (e != null) toastMessage(com.sosmartlabs.momologin.R.string.toast_error_deleting_photo)
            else setUserImage()
        }
    }

    private fun setUserImage() {
        val imageFile = ParseUser.getCurrentUser().get("image") as ParseFile?
        if (imageFile != null) {
            imageFile.let { binding.adminProfilePic.loadImage(imageFile.url, fallback = R.drawable.add_image_admin_linkwatch) }
        } else {
            binding.adminProfilePic.setImageResource(R.drawable.add_image_admin_linkwatch)
        }
    }

    private fun toastMessage(messageId: Int) {
        Toast.makeText(requireContext(), getString(messageId), Toast.LENGTH_LONG).show()
    }

    private fun takePicture() {
        if (hasCameraPermission) launchTakePicture()
        else requestCameraPermissionLauncher.launch(android.Manifest.permission.CAMERA)
    }


    private fun setupToolbar() {
        Timber.d("setupToolbar")
        with(activity as AppCompatActivity) {
            setSupportActionBar(toolbar)
            supportActionBar?.apply {
                title = null
                if (activity is LinkWatchActivity) {
                    setDisplayShowTitleEnabled(true)
                    setDisplayHomeAsUpEnabled(true)
                    setDisplayShowHomeEnabled(true)
                }
            }
            window.statusBarColor = ContextCompat.getColor(requireContext(), R.color.background_sim_step_card_title)
            window.navigationBarColor = ContextCompat.getColor(requireContext(), R.color.white)
        }
    }

    private fun navigateById(navId: Int, bundle: Bundle = bundleOf()) {
        val navController = findNavController()
        if (navController.currentDestination?.getAction(navId) != null) {
            navController.navigate(navId, bundle)
        } else {
            Timber.w("Skipping stale navigation to $navId from ${navController.currentDestination?.label}")
        }
    }

    private fun validateData() {

        fun checkError(textInput : TextInputLayout, errorId : ValidationError, changeIconColor : Boolean = true) {
            if (_linWatchAdminDataViewModel.errors.contains(errorId)) {
                colorProvider.setErrorColors(requireContext(), textInput, changeIconColor)
            }
        }

        _linWatchAdminDataViewModel.validateData()
        checkError(binding.adminDataCardview.nameTextinput, ValidationError.FIRST_NAME_ERROR)
        checkError(binding.adminDataCardview.lastNameTextinput, ValidationError.LAST_NAME_ERROR)
        checkError(binding.adminDataCardview.numberTextinput, ValidationError.PHONE_NUMBER_ERROR)
        checkError(binding.adminDataCardview.emailTextinput, ValidationError.EMAIL_FORMAT_ERROR)

        if (_linWatchAdminDataViewModel.errors.isEmpty()) {
            saveUser()
            _linkWatchViewModel.incrementCompletedSteps("admin")
            navigateById(R.id.action_adminDataFragment_to_mainViewFragment)
        } else {
            binding.adminDataCardview.errorMessage.visibility = View.VISIBLE
        }
    }

    private fun setupInputListeners() {

        fun restoreColorListener(textInput : TextInputLayout, validationFunction : () -> Boolean,
                                 error : ValidationError, hideIcon : Boolean = true) {
            textInput.editText?.addTextChangedListener {
                if (validationFunction()) {
                    colorProvider.setDefaultColors(requireContext(), textInput, hideIcon)
                    _linWatchAdminDataViewModel.removeError(error)
                    if (_linWatchAdminDataViewModel.errors.isEmpty()) {
                        binding.adminDataCardview.errorMessage.visibility = View.GONE
                    }
                }
            }
        }

        restoreColorListener(binding.adminDataCardview.nameTextinput, _linWatchAdminDataViewModel::validateFirstName, ValidationError.FIRST_NAME_ERROR)
        restoreColorListener(binding.adminDataCardview.lastNameTextinput, _linWatchAdminDataViewModel::validateLastName, ValidationError.LAST_NAME_ERROR)
        restoreColorListener(binding.adminDataCardview.numberTextinput, _linWatchAdminDataViewModel::validatePhoneNumber, ValidationError.PHONE_NUMBER_ERROR)
        restoreColorListener(binding.adminDataCardview.emailTextinput, _linWatchAdminDataViewModel::validateEmailFormat, ValidationError.EMAIL_FORMAT_ERROR)
    }

    private fun setupCCPListener() {

        fun setCode() {
            val numberCode = binding.adminDataCardview.ccp.selectedCountryCode
            val regionCode = binding.adminDataCardview.ccp.selectedCountryNameCode
            _linWatchAdminDataViewModel.setCountryCode(numberCode, regionCode)
        }

        setCode()
        binding.adminDataCardview.ccp.setOnCountryChangeListener { setCode() }

        _linWatchAdminDataViewModel.countryCodeData.observe(requireActivity()) {
            try { binding.adminDataCardview.ccp.setCountryForPhoneCode(it.toInt())
            } catch (_ : Exception) {}
        }
    }

    private fun saveUser() {
        val user = ParseUser.getCurrentUser()
        user.put("firstName", _linWatchAdminDataViewModel.firstNameData.value!!)
        user.put("lastName", _linWatchAdminDataViewModel.lastNameData.value!!)
        user.put("email", _linWatchAdminDataViewModel.emailData.value!!)
        user.put("phone", _linWatchAdminDataViewModel.getPhoneNumber())
        user.saveInBackground { error : ParseException? ->
            if (error != null) {
                Timber.e("error: $error")
        }
    }
    }

    private fun addImage(){
        val items = arrayOf<CharSequence>(
            getString(com.sosmartlabs.momologin.R.string.photo_delete),
            getString(com.sosmartlabs.momologin.R.string.photo_take_new),
            getString(com.sosmartlabs.momologin.R.string.photo_select_from_gallery)
        )

        val builder = AlertDialog.Builder(requireContext())
        builder.setTitle(getString(com.sosmartlabs.momologin.R.string.change_photo))
        builder.setItems(items) { _, item ->
            when (item) {
                0 -> { removeImage() }
                1 -> { takePicture() }
                2 -> { launchSelectPictureFromGallery() }
            }
        }
        builder.setNegativeButton(com.sosmartlabs.momologin.R.string.button_cancel) { dialogInterface: DialogInterface, _: Int ->
            dialogInterface.dismiss()
        }
        builder.show()
    }
}