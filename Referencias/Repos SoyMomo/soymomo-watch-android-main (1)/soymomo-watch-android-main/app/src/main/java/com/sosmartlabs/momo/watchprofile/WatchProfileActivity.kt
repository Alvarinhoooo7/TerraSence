package com.sosmartlabs.momo.watchprofile

import android.Manifest
import android.annotation.SuppressLint
import android.app.DatePickerDialog
import android.app.ProgressDialog
import android.content.DialogInterface
import android.os.Build
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.View
import android.widget.DatePicker
import android.widget.Toast
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.appcompat.app.AlertDialog
import androidx.core.app.ActivityCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.ActivityWatchProfileBinding
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.takepicture.TakePictureActivity
import com.sosmartlabs.momo.utils.Constants
import com.sosmartlabs.momo.utils.ConversionsUtil
import com.sosmartlabs.momo.utils.DateUtil
import com.sosmartlabs.momo.utils.EdgeToEdgeUtils
import com.sosmartlabs.momo.utils.PhoneNumberUtils
import com.sosmartlabs.momo.utils.Resource
import com.sosmartlabs.momo.utils.SamsungUtils
import com.sosmartlabs.momo.utils.ui.DefaultIcons
import com.sosmartlabs.momo.utils.ui.MomoDialogFragment
import com.sosmartlabs.momo.utils.ui.loadImage
import com.sosmartlabs.momo.utils.ui.toolbar.ToolbarConstructor
import com.sosmartlabs.momo.utils.ui.toolbar.ToolbarNavigationType
import com.sosmartlabs.momo.watchprofile.dialogs.HeightDialogFragment
import com.sosmartlabs.momo.watchprofile.ui.WatchProfileViewModel
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber
import java.util.Calendar
import java.util.Date
import javax.inject.Inject

/**
 * @author mrg
 * @date 6/16/17
 * @modify 6/7/22
 */
@AndroidEntryPoint
class WatchProfileActivity : TakePictureActivity(), DatePickerDialog.OnDateSetListener,
    MomoDialogFragment.MomoDialogListener, HeightDialogFragment.EditTextDialogListener {

    @Inject
    lateinit var toolbarConstructor: ToolbarConstructor

    override fun onMomoDialogContinue(type: Int) {
        when (type) {
            Constants.PERMISSION_STORAGE_CAMERA ->
                requestPermissions.launch(arrayOf(
                    Manifest.permission.CAMERA
                ))
        }
    }

    override fun onMomoDialogDismiss() {

    }

    companion object {
        private const val MIN_WEIGHT_KG = 10
        private const val MAX_WEIGHT_KG = 500
        private const val MIN_HEIGHT_CM = 60
        private const val MAX_HEIGHT_CM = 210
    }

    private lateinit var binding: ActivityWatchProfileBinding
    private lateinit var mWatch: Wearer
    private var mBirthday: Date = Date()
    private lateinit var dialog: ProgressDialog
    private lateinit var ftAndIn: Pair<Int, Int>

    override val objectId: String? get() = mWatch.objectId

    private val mViewModel: WatchProfileViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Timber.d("WatchProfileActivity: onCreate")
        
        enableEdgeToEdge()
        binding = ActivityWatchProfileBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setupEdgeToEdge()

        binding.fabAddImage.setOnClickListener {
            val items = arrayOf<CharSequence>(
                getString(R.string.photo_delete),
                getString(R.string.photo_take_new),
                getString(R.string.photo_select_from_gallery)
            )
            val builder = AlertDialog.Builder(this@WatchProfileActivity)
            builder.setTitle(getString(R.string.change_photo))
            builder.setItems(items) { _, item ->
                when (item) {
                    0 -> mViewModel.deleteProfileImage()
                    1 -> {
                        if (hasCameraPermission) {
                            launchTakePicture()
                        } else {
                            askForPermissions()
                        }
                    }
                    2 -> {
                        launchSelectPictureFromGallery()
                    }
                }
            }
            builder.setNegativeButton(R.string.button_cancel) { dialogInterface: DialogInterface, _: Int ->
                dialogInterface.dismiss()
            }
            builder.show()
        }

        try {
            toolbarConstructor
                .setTitle(R.string.kid_profile_title)
                .setNavigationOnClick(ToolbarNavigationType.SUPPORT_FINISH_AFTER_TRANSITION)
                .setErrorName("WatchProfileActivity")
                .build()
        } catch (e: NullPointerException) {
            Timber.e(e)
        }

        dialog = ProgressDialog(this)

        binding.birthdayTextinput.editText?.setOnClickListener {
            val c = Calendar.getInstance()
            c.time = mBirthday
            val year = c.get(Calendar.YEAR)
            val month = c.get(Calendar.MONTH)
            val day = c.get(Calendar.DAY_OF_MONTH)
            val datePickerDialog = if (SamsungUtils.hasBrokenDatePickerDialog()) DatePickerDialog(
                this@WatchProfileActivity, android.R.style.Theme_Holo_Light_Dialog,
                this@WatchProfileActivity, year, month, day
            ) else DatePickerDialog(
                this@WatchProfileActivity, this@WatchProfileActivity, year, month, day
            )
            datePickerDialog.datePicker.maxDate = Calendar.getInstance().timeInMillis
            datePickerDialog.show()
        }

        binding.ccp.registerCarrierNumberEditText(binding.edittextWatchPhone)
        binding.edittextWatchPhone.addTextChangedListener(object : TextWatcher {
            override fun afterTextChanged(s: Editable) {
                binding.tilPhone.isErrorEnabled = false
                if (s.isNotBlank()) {
                    if (!PhoneNumberUtils.isValidPhoneNumber(binding.ccp)) {
                        binding.tilPhone.error = getString(R.string.edittext_error_invalid_phone)
                        binding.edittextWatchPhone.requestFocus()
                    }
                }
            }

            override fun beforeTextChanged(p0: CharSequence?, p1: Int, p2: Int, p3: Int) {
            }

            override fun onTextChanged(p0: CharSequence?, p1: Int, p2: Int, p3: Int) {
            }

        })

        binding.weightTextinput.editText?.addTextChangedListener(object : TextWatcher {
            override fun onTextChanged(s: CharSequence, start: Int, before: Int, count: Int) {
            }

            override fun beforeTextChanged(s: CharSequence, start: Int, count: Int, after: Int) {
            }

            override fun afterTextChanged(s: Editable) {
                binding.weightTextinput.isErrorEnabled = false
                if (s.isNotBlank()) {
                    try {
                        val weight: Int = s.toString().toInt()
                        if (weight < MIN_WEIGHT_KG || weight > MAX_WEIGHT_KG) {
                            binding.weightTextinput.error = getString(R.string.edittext_error_weight)
                            binding.weightTextinput.editText?.requestFocus()
                        }
                    } catch (e: NumberFormatException) {
                        binding.weightTextinput.error = getString(R.string.edittext_error_weight)
                        binding.weightTextinput.editText?.requestFocus()
                    }
                }
            }
        })

        binding.heightTextinput.editText?.addTextChangedListener(object : TextWatcher {
                override fun onTextChanged(s: CharSequence, start: Int, before: Int, count: Int) {
                }

                override fun beforeTextChanged(
                    s: CharSequence,
                    start: Int,
                    count: Int,
                    after: Int
                ) {
                }

                override fun afterTextChanged(s: Editable) {
                    with(binding) {
                        heightTextinput.isErrorEnabled = false
                        if (s.isNotBlank()) {
                            try {
                                val height: Int = s.toString().toInt()
                                if (height < MIN_HEIGHT_CM || height > MAX_HEIGHT_CM) {
                                    heightTextinput.error = getString(R.string.edittext_error_height)
                                    heightTextinput.editText?.requestFocus()
                                }
                            } catch (e: NumberFormatException) {
                                heightTextinput.error = getString(R.string.edittext_error_height)
                                heightTextinput.editText?.requestFocus()
                            }
                        }
                    }
                }
            })

        observeViewModel()
    }

    private fun observeViewModel() {
        mViewModel.watch.observe(this) {
            when (it.status) {
                Resource.Status.LOADING -> with(dialog) {
                    setMessage(getString(R.string.progress_finding_momo))
                    show()
                }
                Resource.Status.LOAD_SUCCESS -> {
                    dialog.dismiss()
                    mWatch = it.data!!
                    updateUi()
                }
                Resource.Status.LOAD_ERROR -> {
                    dialog.dismiss()
                    Toast.makeText(
                        this@WatchProfileActivity,
                        R.string.toast_error_finding_momo,
                        Toast.LENGTH_LONG
                    ).show()
                    finish()
                }
                Resource.Status.UPDATING -> if (it.statusType != WatchProfileViewModel.WatchUpdateType.WatchProfile) {
                    with(dialog) {
                        setMessage(
                            when (it.statusType) {
                                WatchProfileViewModel.WatchUpdateType.DeleteImage -> getString(R.string.progress_deleting_photo)
                                else -> getString(R.string.progress_saving_photo)
                            }
                        )
                        show()
                    }
                }

                Resource.Status.UPDATING_SUCCESS -> if (it.statusType != WatchProfileViewModel.WatchUpdateType.WatchProfile) {
                    dialog.dismiss()
                    if (it.statusType == WatchProfileViewModel.WatchUpdateType.UpdateImage)
                        Toast.makeText(
                            this@WatchProfileActivity,
                            R.string.toast_photo_saved,
                            Toast.LENGTH_LONG
                        ).show()
                    updateUi()
                }

                Resource.Status.UPDATING_ERROR -> if (it.statusType != WatchProfileViewModel.WatchUpdateType.WatchProfile) {
                    dialog.dismiss()
                    Toast.makeText(
                        this@WatchProfileActivity,
                        when (it.statusType) {
                            WatchProfileViewModel.WatchUpdateType.DeleteImage -> R.string.toast_error_deleting_photo
                            else -> R.string.toast_error_saving_photo
                        },
                        Toast.LENGTH_LONG
                    ).show()
                }
                else -> { /* Do nothing in any other case */
                }
            }
        }
    }

    override fun onPause() {
        super.onPause()
        if (::mWatch.isInitialized && !mWatch.objectId.isNullOrBlank()) {
            val isImperial = mViewModel.isImperialMeasureSystem.value ?: false
            val phoneNumber = if (PhoneNumberUtils.isValidPhoneNumber(binding.ccp)) binding.ccp.fullNumberWithPlus else mWatch.phone.orEmpty()
            mViewModel.updateWatch(
                firstName = binding.nameTextinput.editText?.text.toString(),
                lastName = binding.lastNameTextinput.editText?.text.toString(),
                birthday = mBirthday,
                phone = phoneNumber,
                weight = if (!binding.weightTextinput.isErrorEnabled && binding.weightTextinput.editText?.text.toString().isNotBlank())
                    binding.weightTextinput.editText?.text.toString().toIntOrNull()?.let { weight ->
                        if (!isImperial && weight in MIN_WEIGHT_KG..MAX_WEIGHT_KG) weight
                        else if (isImperial) ConversionsUtil.convertLbsToKg(weight)
                        else null
                    }
                else null,
                height = if (!binding.heightTextinput.isErrorEnabled)
                    binding.heightTextinput.editText?.text.toString().toIntOrNull()?.let { height ->
                        if (!isImperial && height in MIN_HEIGHT_CM..MAX_HEIGHT_CM) height
                        else if (isImperial && ::ftAndIn.isInitialized)
                            ConversionsUtil.convertFeetAndInchesToCm(ftAndIn.first, ftAndIn.second)
                        else null
                    }
                else null
            )
        }
    }

    override fun onResume() {
        super.onResume()
        mViewModel.loadProfile(intent.getStringExtra(Constants.EXTRA_WEARER_ID)!!)
    }

    private fun updateUi() {
        val first: String = if (mWatch.has("firstName")) mWatch.firstName else ""
        val last: String = if (mWatch.has("lastName")) mWatch.lastName else ""
        val isImperial = mViewModel.isImperialMeasureSystem.value!!

        binding.nameTextinput.editText?.setText(first)
        binding.lastNameTextinput.editText?.setText(last)
        if (mWatch.has("phone")) {
            if (mWatch.phone.contains('+')) binding.ccp.fullNumber = mWatch.phone
            else {
                binding.edittextWatchPhone.setText(mWatch.phone)
            }
        }
        if (!PhoneNumberUtils.isValidPhoneNumber(binding.ccp)) {
            binding.tilPhone.error = getString(R.string.edittext_error_invalid_phone)
            binding.edittextWatchPhone.requestFocus()
        }
        if (mWatch.has("birthday")) mBirthday = mWatch.getDate("birthday")!!
        binding.birthdayTextinput.editText?.setText(
            if (mWatch.has("birthday")) DateUtil.getFormattedOnlyDate(
                mWatch.birthday
            ) else ""
        )

        binding.weightTextinput.hint =
            (if (mWatch.weight == null && !isImperial) getString(R.string.profile_weight_kg)
            else getString(R.string.profile_weight_lbs)).toString()

        binding.weightTextinput.editText?.setText(
            if (mWatch.has("weight") && mWatch.weight != null)
                if (!isImperial) {
                    binding.weightTextinput.hint = getString(R.string.profile_weight_kg)
                    mWatch.weight!!.toString()
                } else {
                    binding.weightTextinput.hint = getString(R.string.profile_weight_lbs)
                    ConversionsUtil.convertKgToLbs(mWatch.weight!!).toString()
                }
            else ""
        )

        if (!isImperial) {
            binding.tilHeightFtAndIn.visibility = View.GONE
            binding.heightTextinput.editText?.let {
                it.visibility = View.VISIBLE
                it.setText(
                    if (mWatch.has("height") && mWatch.height != null)
                        mWatch.height!!.toString()
                    else ""
                )
            }
        } else {
            binding.tilHeightFtAndIn.visibility = View.VISIBLE
            binding.heightTextinput.editText?.visibility = View.GONE
            binding.edittextWatchHeightFts.setText(
                if (mWatch.has("height") && mWatch.height != null) {
                    ftAndIn = ConversionsUtil.convertCmToFtAndIn(mWatch.height!!)
                    getString(
                        R.string.height_children_has_imperial,
                        ftAndIn.first, ftAndIn.second
                    )
                } else ""
            )

            binding.edittextWatchHeightFts.setOnClickListener {
                val dialog =
                    (if (::ftAndIn.isInitialized) ftAndIn else null).let {
                        HeightDialogFragment.newInstance(
                            it?.first.toString(), it?.second.toString(),
                            getString(R.string.til_height_dialog)
                        )
                    }
                dialog.isCancelable = false
                dialog.show(supportFragmentManager, "edit_text_dialog_fragment")
            }

        }


        //val url = if (mWatch.has("image")) mWatch.image!!.url else null
        val url = mWatch.image?.url
        binding.imageProfile.loadImage(url, fallback = DefaultIcons.PROFILE_MOMO_SPACE)
    }

    override fun onDateSet(p0: DatePicker?, year: Int, month: Int, day: Int) {
        val c = Calendar.getInstance()
        c.set(Calendar.YEAR, year)
        c.set(Calendar.MONTH, month)
        c.set(Calendar.DAY_OF_MONTH, day)
        c.set(Calendar.HOUR_OF_DAY, 12)
        c.set(Calendar.MINUTE, 0)
        c.set(Calendar.SECOND, 0)
        mBirthday = c.time
        binding.birthdayTextinput.editText?.setText(DateUtil.getFormattedOnlyDate(mBirthday))
    }

    override fun onImageLoaded(path: String?) {
        path?.let { mViewModel.updateProfileImage(path) }
    }

    override fun onRequestPermissionsResult(result: Map<String, Boolean>) {
        if (result[Manifest.permission.CAMERA] == true) launchTakePicture()
        else Toast.makeText(this, R.string.toast_error_no_photo_permissions, Toast.LENGTH_SHORT)
            .show()
    }

    private fun askForPermissions() {
        if (ActivityCompat.shouldShowRequestPermissionRationale(this, Manifest.permission.CAMERA)) {
            val fragmentTag = "momoDialog"
            if (supportFragmentManager.findFragmentByTag(fragmentTag) == null) {
                val dialogFragment = MomoDialogFragment.Builder(this)
                    .setType(Constants.PERMISSION_STORAGE_CAMERA)
                    .build()
                dialogFragment.show(supportFragmentManager, fragmentTag)
            }
        } else {
            requestPermissions.launch(arrayOf(Manifest.permission.CAMERA))
        }
    }

    override fun onTextEditHeightChanged(editFeetDialog: String, editInchesDialog: String) {
        binding.edittextWatchHeightFts.setText(
            getString(
                R.string.height_children_has_imperial,
                editFeetDialog.toInt(), editInchesDialog.toInt()
            )
        )
        ftAndIn = Pair(editFeetDialog.toInt(), editInchesDialog.toInt())
    }

    private fun setupEdgeToEdge() {
        Timber.d("WatchProfileActivity: setupEdgeToEdge")

        // Set dark status bar appearance (link_watch_background is #603BB0 - dark purple)
        WindowCompat.getInsetsController(window, window.decorView).isAppearanceLightStatusBars = false

        ViewCompat.setOnApplyWindowInsetsListener(binding.root) { view, windowInsets ->
            val systemBars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars())
            val displayCutout = windowInsets.getInsets(WindowInsetsCompat.Type.displayCutout())
            val navigationBars = windowInsets.getInsets(WindowInsetsCompat.Type.navigationBars())

            Timber.d("WatchProfileActivity: systemBars $systemBars")
            Timber.d("WatchProfileActivity: displayCutout $displayCutout")
            Timber.d("WatchProfileActivity: navigationBars $navigationBars")

            val topInset = systemBars.top.coerceAtLeast(displayCutout.top)

            // Apply top padding to AppBar to extend background into status bar area
            binding.appBar.setPadding(
                systemBars.left.coerceAtLeast(displayCutout.left),
                topInset,
                systemBars.right.coerceAtLeast(displayCutout.right),
                binding.appBar.paddingBottom
            )

            // Apply bottom insets conditionally based on navigation type
            val shouldApplyBottomInsets = EdgeToEdgeUtils.hasButtonNavigation(applicationContext)
            val bottomPadding = if (shouldApplyBottomInsets) {
                navigationBars.bottom.coerceAtLeast(displayCutout.bottom)
            } else {
                0
            }

            Timber.d("WatchProfileActivity: shouldApplyBottomInsets $shouldApplyBottomInsets, bottomPadding $bottomPadding")

            // Apply bottom padding to ScrollView for navigation bar
            binding.childDataScrollview.setPadding(
                binding.childDataScrollview.paddingLeft,
                binding.childDataScrollview.paddingTop,
                binding.childDataScrollview.paddingRight,
                bottomPadding
            )

            windowInsets
        }
    }
}