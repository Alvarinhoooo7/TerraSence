package com.sosmartlabs.momo.linkwatch.ui.fragments

import android.content.DialogInterface
import android.os.Build
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.content.res.AppCompatResources
import androidx.appcompat.widget.Toolbar
import androidx.core.content.ContextCompat
import androidx.core.os.bundleOf
import androidx.core.widget.addTextChangedListener
import androidx.fragment.app.activityViewModels
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import com.google.android.material.datepicker.CalendarConstraints
import com.google.android.material.datepicker.DateValidatorPointBackward
import com.google.android.material.datepicker.MaterialDatePicker
import com.google.android.material.textfield.TextInputLayout
import com.parse.ParseFile
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.addfirstwatch.model.KidProfileStatus
import com.sosmartlabs.momo.databinding.LinkwatchFragmentChildDataBinding
import com.sosmartlabs.momo.linkwatch.LinkWatchActivity
import com.sosmartlabs.momo.linkwatch.data.ChildDataValidationError
import com.sosmartlabs.momo.linkwatch.ui.LinkWatchChildDataViewModel
import com.sosmartlabs.momo.linkwatch.ui.LinkWatchViewModel
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.takepicture.TakePictureFragment
import com.sosmartlabs.momo.utils.ui.DefaultErrorDialog
import com.sosmartlabs.momo.utils.ui.DefaultIcons
import com.sosmartlabs.momo.utils.ui.loadCircularImage
import com.sosmartlabs.momo.utils.ui.loadImage
import com.sosmartlabs.momologin.utils.colors.ColorProvider
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber
import java.io.File
import java.text.DateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import javax.inject.Inject

@AndroidEntryPoint
class ChildDataFragment @Inject constructor() : TakePictureFragment() {

    private lateinit var binding: LinkwatchFragmentChildDataBinding

    val toolbar: Toolbar get() = binding.toolbar
    override val objectId: String = ""

    @Inject
    lateinit var colorProvider: ColorProvider

    private val _linkWatchViewModel: LinkWatchViewModel by activityViewModels()
    private val _linkWatchChildDataViewModel: LinkWatchChildDataViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        arguments?.getParcelable<Wearer>("wearer")?.let {
            _linkWatchChildDataViewModel.setCurrentWearer(it)
        }
    }

    override fun onImageLoaded(path: String?) {
        path?.let {
            val parseFile = ParseFile(File(path)).apply { save() }
            _linkWatchViewModel.currentWearer.value?.let { it.image = parseFile }
        }
        binding.childProfilePic.loadCircularImage(path, 2f, fallback = R.drawable.add_image_child_linkwatch)
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        binding = LinkwatchFragmentChildDataBinding.inflate(inflater, container, false)
        binding.childDataCardview.lifecycleOwner = this
        binding.childDataCardview.viewModel = _linkWatchChildDataViewModel
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupToolbar()
        setupListeners()
        observeViewModel()
        setWatchData()
    }

    private fun setWatchData() {
        arguments?.getParcelable<Wearer>("wearer")?.let {
            val viewModel = _linkWatchChildDataViewModel
            viewModel.firstNameData.postValue(it.firstName)
            viewModel.lastNameData.postValue(it.lastName)
            viewModel.birthdayData.postValue(it.birthday)

            if (it.height != null) {
                viewModel.heightData.postValue(it.height.toString())
            }

            if (it.weight != null) {
                viewModel.weightData.postValue(it.weight.toString())
            }

            if (it.has("image")) {
                val url = it.image?.url
                binding.childProfilePic.loadImage(url, fallback = DefaultIcons.PROFILE_MOMO_SPACE)
            }
         }
    }

    private fun setupListeners() {
        binding.childDataCardview.linkButton.setOnClickListener() {
            validateData()
        }
        setupInputListeners()
        binding.childDataCardview.datePicker.setOnClickListener {
            datePickerListener()
        }
        binding.childProfilePic.setOnClickListener {
            addImage()
        }
        binding.fabAddImage.setOnClickListener {
            addImage()
        }
    }

    private fun deletePhoto() {
        val addImageChildLinkWatchDrawable = AppCompatResources.getDrawable(
            requireContext(), R.drawable.add_image_child_linkwatch)
        if (binding.childProfilePic.drawable != addImageChildLinkWatchDrawable) {
            binding.childProfilePic.setImageDrawable(addImageChildLinkWatchDrawable)
        }
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

    private fun observeViewModel() {
        _linkWatchChildDataViewModel.birthdayData.observe(viewLifecycleOwner){
            if (it != null) {binding.childDataCardview.birthdayTextinput.editText!!.setText(getFormattedOnlyDate(it))}
        }
        _linkWatchChildDataViewModel.kidProfileStatus.observe(viewLifecycleOwner) {
            when(it) {
                KidProfileStatus.KID_DETAILS_SAVING -> {
                    Timber.d("SAVED")
                }
                KidProfileStatus.KID_DETAILS_SUCCESS -> {
                    _linkWatchViewModel.incrementCompletedSteps("child")
                    navigateById(R.id.action_childDataFragment_to_mainViewFragment)
                }
                KidProfileStatus.ERROR_LOADING -> {
                    showErrorDialog(getString(R.string.add_watch_kid_profile_dialog_error_title), getString(R.string.add_watch_kid_profile_dialog_error_description))
                }
                else -> {
                    showErrorDialog(getString(R.string.add_watch_kid_profile_dialog_error_title), it.toString())
                }
            }
        }
        _linkWatchViewModel.currentWearer.observe(viewLifecycleOwner) {
            Timber.d("CURRENT WEARER: $it")
            _linkWatchChildDataViewModel.setCurrentWearer(it)
        }
    }

    private fun showErrorDialog(title: String, description: String?) {
        val defaultErrorDialog = DefaultErrorDialog()
        defaultErrorDialog.arguments = bundleOf(
            "icon" to "",
            "title" to title,
            "description" to description,
        )
        defaultErrorDialog.show(childFragmentManager, title)
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

        fun checkError(textInput : TextInputLayout, errorId : ChildDataValidationError, changeIconColor : Boolean = true) {
            if (_linkWatchChildDataViewModel.errors.contains(errorId)) {
                colorProvider.setErrorColors(requireContext(), textInput, changeIconColor)
            }
        }

        _linkWatchChildDataViewModel.validateData()
        checkError(binding.childDataCardview.nameTextinput, ChildDataValidationError.FIRST_NAME_ERROR)
        checkError(binding.childDataCardview.lastNameTextinput, ChildDataValidationError.LAST_NAME_ERROR)
        checkError(binding.childDataCardview.heightTextinput, ChildDataValidationError.HEIGHT_ERROR)
        checkError(binding.childDataCardview.birthdayTextinput, ChildDataValidationError.BIRTHDAY_ERROR)
        checkError(binding.childDataCardview.weightTextinput, ChildDataValidationError.WEIGHT_ERROR)

        if (_linkWatchChildDataViewModel.errors.isEmpty()) {
            updateKidData()
        } else {
            binding.childDataCardview.errorMessage.visibility = View.VISIBLE
        }
    }

    private fun updateKidData() {
        val formViewModel = _linkWatchChildDataViewModel
        formViewModel.currentWearer.value?.let { watch ->
            formViewModel.firstNameData.value?.let { watch.firstName = it }
            formViewModel.lastNameData.value?.let { watch.lastName = it }
            formViewModel.birthdayData.value?.let { watch.birthday = it }
            formViewModel.heightData.value?.let { watch.height = it.toInt() }
            formViewModel.weightData.value?.let { watch.weight = it.toInt() }
            _linkWatchViewModel.setCurrentWearer(watch)
        }
        formViewModel.onKidDetailsEntered()
    }

    private fun getFormattedOnlyDate(date: Date): String {
        val location = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N)
            Locale.getDefault(Locale.Category.FORMAT) else Locale.getDefault()
        val df = DateFormat.getDateInstance(DateFormat.SHORT, location).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }
        return df.format(date)
    }

    private fun setupInputListeners() {

        fun restoreColorListener(textInput : TextInputLayout, validationFunction : () -> Boolean,
                                 error : ChildDataValidationError, hideIcon : Boolean = true) {
            textInput.editText?.addTextChangedListener {
                if (validationFunction()) {
                    colorProvider.setDefaultColors(requireContext(), textInput, hideIcon)
                    _linkWatchChildDataViewModel.removeError(error)
                    if (_linkWatchChildDataViewModel.errors.isEmpty()) {
                        binding.childDataCardview.errorMessage.visibility = View.GONE
                    }
                }
            }
        }

        restoreColorListener(binding.childDataCardview.nameTextinput, _linkWatchChildDataViewModel::validateFirstName, ChildDataValidationError.FIRST_NAME_ERROR)
        restoreColorListener(binding.childDataCardview.lastNameTextinput, _linkWatchChildDataViewModel::validateLastName, ChildDataValidationError.LAST_NAME_ERROR)
        restoreColorListener(binding.childDataCardview.birthdayTextinput, _linkWatchChildDataViewModel::validateBirthday, ChildDataValidationError.BIRTHDAY_ERROR)
        restoreColorListener(binding.childDataCardview.weightTextinput, _linkWatchChildDataViewModel::validateWeight, ChildDataValidationError.WEIGHT_ERROR)
        restoreColorListener(binding.childDataCardview.heightTextinput, _linkWatchChildDataViewModel::validateHeight, ChildDataValidationError.HEIGHT_ERROR)
    }

    private fun addImage() {
        val items = arrayOf<CharSequence>(
            getString(com.sosmartlabs.momologin.R.string.photo_delete),
            getString(com.sosmartlabs.momologin.R.string.photo_take_new),
            getString(com.sosmartlabs.momologin.R.string.photo_select_from_gallery)
        )

        val builder = AlertDialog.Builder(requireContext())
        builder.setTitle(getString(com.sosmartlabs.momologin.R.string.change_photo))
        builder.setItems(items) { _, item ->
            when (item) {
                0 -> { deletePhoto() }
                1 -> { takePicture() }
                2 -> { launchSelectPictureFromGallery() }
            }
        }
        builder.setNegativeButton(R.string.button_cancel) { dialogInterface: DialogInterface, _: Int ->
            dialogInterface.dismiss()
        }
        builder.show()
    }

    private fun datePickerListener() {
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
        datePicker.addOnPositiveButtonClickListener { _linkWatchChildDataViewModel.setDate(it) }
    }
}