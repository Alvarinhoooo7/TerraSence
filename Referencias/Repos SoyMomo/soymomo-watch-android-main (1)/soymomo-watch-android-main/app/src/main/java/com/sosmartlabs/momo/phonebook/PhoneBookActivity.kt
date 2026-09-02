package com.sosmartlabs.momo.phonebook

import android.Manifest
import android.annotation.SuppressLint
import android.app.ProgressDialog
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.view.View
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.result.launch
import androidx.activity.viewModels
import androidx.coordinatorlayout.widget.CoordinatorLayout
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.recyclerview.widget.ItemTouchHelper
import androidx.recyclerview.widget.LinearLayoutManager
import com.google.android.material.snackbar.Snackbar
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.takepicture.TakePictureActivity
import com.sosmartlabs.momo.databinding.PhonebookActivityBinding
import com.sosmartlabs.momo.utils.ui.MomoDialogFragment
import com.sosmartlabs.momo.interfaces.DragAndDropListener
import com.sosmartlabs.momo.phonebook.model.phonecontact.PhoneContact
import com.sosmartlabs.momo.phonebook.ui.OnContactButtonPressedCallbacks
import com.sosmartlabs.momo.phonebook.ui.PhoneBookViewModel
import com.sosmartlabs.momo.phonebook.ui.PhoneContactsAdapter
import com.sosmartlabs.momo.phonebook.ui.PickPhoneContact
import com.sosmartlabs.momo.phonebook.ui.dialogs.ConfirmDeleteContactDialogFragment
import com.sosmartlabs.momo.phonebook.ui.dialogs.EditContactDialogFragment
import com.sosmartlabs.momo.utils.Constants
import com.sosmartlabs.momo.utils.DragAndDropHelper
import com.sosmartlabs.momo.utils.EdgeToEdgeUtils
import com.sosmartlabs.momo.utils.Resource
import com.sosmartlabs.momo.utils.ui.toolbar.ToolbarConstructor
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber
import javax.inject.Inject

/**
 * Activity for Watch Phone Book
 */
@AndroidEntryPoint
class PhoneBookActivity : TakePictureActivity(),
    EditContactDialogFragment.EditContactDialogListener,
    ConfirmDeleteContactDialogFragment.ConfirmDeleteContactDialogListener {

    @Inject lateinit var toolbarConstructor: ToolbarConstructor

    /** Id of device */
    private lateinit var deviceId: String
    override val objectId: String get() = deviceId

    /** ViewModel for this activity */
    private val viewModel: PhoneBookViewModel by viewModels()

    /** ViewBinding for this activity */
    private lateinit var binding : PhonebookActivityBinding

    /** ProgressDialog for showing loading status */
    private lateinit var progressDialog: ProgressDialog

    /** Adapter for PhoneContact RecyclerView */
    private lateinit var phoneContactsAdapter: PhoneContactsAdapter

    /** Reference to current EditContactDialogFragment */
    private var editContactDialog: EditContactDialogFragment? = null

    /** Speed dial state + original FAB margin for insets handling */
    private var speedDialOpen = false
    private var fabMainOriginalBottomMargin = 0

    /** Callbacks for actions inside a contact card */
    private val onContactButtonPressedCallbacks = object: OnContactButtonPressedCallbacks {
        override fun onEditButtonPressed(phoneContact: PhoneContact) {
            editContactDialog = EditContactDialogFragment(phoneContact).apply {
                show(supportFragmentManager, "edit existing contact")
            }
        }
        override fun onDeleteButtonPressed(phoneContact: PhoneContact) {
            ConfirmDeleteContactDialogFragment(phoneContact)
                .show(supportFragmentManager, "delete")
        }
        override fun onSosSwitchPressed(phoneContact: PhoneContact, sos: Boolean) {
            viewModel.updateSosPhoneContact(phoneContact, sos)
        }
        override fun onBookmarkIconPressed(phoneContact: PhoneContact) {
            viewModel.updateBookmarkPhoneContact(phoneContact)
        }
    }

    /** Listener for rationale dialog when asking permissions */
    private val requestPermissionDialogListener = object: MomoDialogFragment.MomoDialogListener {
        override fun onMomoDialogContinue(type: Int) {
            when(type) {
                Constants.PERMISSION_CONTACTS ->
                    requestPermissions.launch(arrayOf(Manifest.permission.READ_CONTACTS))
                Constants.PERMISSION_STORAGE_CAMERA ->
                    requestPermissions.launch(arrayOf(Manifest.permission.CAMERA))
            }
        }
        override fun onMomoDialogDismiss() { }
    }

    /** Camera permission launcher */
    private val requestCameraPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { isGranted ->
            if(isGranted) {
                launchTakePicture()
            } else {
                showSnackbar(R.string.toast_error_no_photo_permissions)
            }
        }

    /** Contacts permission launcher */
    private val requestContactsPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { isGranted ->
            if(isGranted) {
                getContactFromDevice()
            } else {
                showSnackbar(R.string.snackbar_error_no_contacts_permission)
            }
        }

    /** Pick a contact from device phonebook */
    private val pickContact =
        registerForActivityResult(PickPhoneContact()) { uri ->
            if (uri != null) viewModel.fetchDeviceContact(uri)
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)

        binding = PhonebookActivityBinding.inflate(layoutInflater)
        setContentView(binding.root)

        if (!intent.hasExtra(Constants.EXTRA_DEVICE_ID)) {
            finish()
        }
        deviceId = intent.getStringExtra(Constants.EXTRA_DEVICE_ID)!!

        setupEdgeToEdge()
        initActionBar()
        configureButtons()
        initRecyclerView()
        observeViewModel()
        fetchContacts()

        // FAB + scrim handlers for speed dial
        binding.fabMain.setOnClickListener { toggleSpeedDial() }
        binding.fabScrim.setOnClickListener { toggleSpeedDial(forceClose = true) }
    }

    /** Init the Activity's ActionBar */
    private fun initActionBar() {
        toolbarConstructor
            .setDisplayShowTitle(false)
            .setErrorName("PhoneBookActivity")
            .setTitle(R.string.title_contacts)
            .build()
    }

    /** Configure the Activity's buttons (speed dial actions) */
    private fun configureButtons() {
        binding.fabAddManual.setOnClickListener {
            toggleSpeedDial(forceClose = true)
            editContactDialog = EditContactDialogFragment().apply {
                show(supportFragmentManager, "create")
            }
        }
        binding.fabAddFromContacts.setOnClickListener {
            toggleSpeedDial(forceClose = true)
            getContactFromDeviceOrAskPermission()
        }
    }

    /** Init the RecyclerView that shows the phone contacts list to the user */
    private fun initRecyclerView() {
        phoneContactsAdapter = PhoneContactsAdapter(onContactButtonPressedCallbacks).apply {
            watchModel = viewModel.getWatchModel(deviceId)
        }

        val dragAndDropHelper = DragAndDropHelper(object: DragAndDropListener {
            override fun onViewMoved(oldPosition: Int, newPosition: Int) {
                viewModel.movePhoneContactInList(oldPosition, newPosition)
            }
            override fun onDragAndDropEnded() {
                viewModel.updateContactIndexes()
            }
        })
        val itemTouchHelper = ItemTouchHelper(dragAndDropHelper)

        binding.phoneContactsRecyclerView.apply {
            adapter = phoneContactsAdapter
            layoutManager = LinearLayoutManager(this@PhoneBookActivity)
            itemTouchHelper.attachToRecyclerView(this)
        }
    }

    /** Shows the progress dialog with the given message */
    private fun showProgress(messageRes: Int) {
        progressDialog.setMessage(getString(messageRes))
        progressDialog.show()
    }

    /** Starts observing ViewModel changes and fetch contacts. */
    private fun observeViewModel() {
        progressDialog = ProgressDialog(this)

        // Observe list status
        viewModel.phoneContactList.observe(this) { resource ->
            when(resource.status) {
                Resource.Status.LOADING -> {
                    showProgress(R.string.progress_loading_contacts)
                }
                Resource.Status.LOAD_SUCCESS -> {
                    progressDialog.dismiss()
                    updateRecyclerViewOrShowEmptyView(resource.data)
                }
                Resource.Status.LOAD_ERROR -> {
                    progressDialog.dismiss()
                    showSnackbar(R.string.snackbar_error_loading_contacts)
                    updateRecyclerViewOrShowEmptyView(resource.data)
                }
                Resource.Status.ADDING_SUCCESS,
                Resource.Status.DELETING_SUCCESS -> {
                    updateRecyclerViewOrShowEmptyView(resource.data)
                }
                Resource.Status.UPDATING_ERROR -> {
                    updateRecyclerViewOrShowEmptyView(resource.data)
                    showSnackbar(R.string.toast_error_saving_contact)
                }
                Resource.Status.UNKNOWN_ERROR -> {
                    handleUnknownError()
                    updateRecyclerViewOrShowEmptyView(resource.data)
                }
                else -> {} // Other statuses not handled here
            }
        }

        // Observe single-contact operations
        viewModel.currentPhoneContact.observe(this) { resource ->
            when(resource.status) {
                Resource.Status.ADDING, Resource.Status.UPDATING ->
                    showProgress(R.string.progress_saving_contact)
                Resource.Status.DELETING -> showProgress(R.string.progress_loading_contacts)
                Resource.Status.ADDING_SUCCESS -> {
                    progressDialog.dismiss()
                    showSnackbar(R.string.snackbar_contact_added)
                }
                Resource.Status.DELETING_SUCCESS ->  {
                    progressDialog.dismiss()
                    showSnackbar(R.string.snackbar_contact_deleted)
                }
                Resource.Status.ADDING_ERROR -> {
                    progressDialog.dismiss()
                    showSnackbar(
                        if (resource.statusType == PhoneBookViewModel.PhoneContactError.NUMBER_ALREADY_EXIST_ERROR)
                            R.string.snackbar_error_phone_number_already_exist
                        else
                            R.string.snackbar_error_saving_contact
                    )
                }
                Resource.Status.UPDATING_SUCCESS -> {
                    progressDialog.dismiss()
                    notifyItemChanged(resource.data!!)
                }
                Resource.Status.UPDATING_ERROR -> {
                    progressDialog.dismiss()
                    notifyItemChanged(resource.data!!)
                    showSnackbar(when (resource.statusType) {
                        PhoneBookViewModel.PhoneContactError.SOS_ALREADY_EXIST_ERROR -> R.string.snackbar_sos_only_one_contact
                        PhoneBookViewModel.PhoneContactError.DATABASE_ERROR -> R.string.snackbar_error_saving_contact
                        PhoneBookViewModel.PhoneContactError.NUMBER_ALREADY_EXIST_ERROR -> R.string.snackbar_error_phone_number_already_exist
                        else -> R.string.snackbar_error_saving_contact
                    })
                }
                Resource.Status.DELETING_ERROR -> {
                    if(resource.statusType == PhoneBookViewModel.PhoneContactError.DELETE_SOS_ERROR) {
                        showSnackbar(R.string.snackbar_sos_contact_error_deleting)
                    }
                    else if (resource.statusType == PhoneBookViewModel.PhoneContactError.DATABASE_ERROR) {
                        progressDialog.dismiss()
                        showSnackbar(R.string.snackbar_contact_error_deleting)
                    }
                }
                Resource.Status.UNKNOWN_ERROR -> handleUnknownError()
                else -> {}
            }
        }

        // Observe device contact loading
        viewModel.devicePhoneContact.observe(this) { resource ->
            when (resource.status) {
                Resource.Status.LOADING -> showProgress(R.string.loading)
                Resource.Status.LOAD_SUCCESS -> {
                    progressDialog.dismiss()
                    with(resource.data!!) {
                        editContactDialog =
                            EditContactDialogFragment(name, phoneNumber, imageUri).apply {
                                show(supportFragmentManager,
                                    "create from existing device contact")
                            }
                    }
                }
                Resource.Status.LOAD_ERROR -> {
                    progressDialog.dismiss()
                    showSnackbar(R.string.snackbar_error_loading_contacts)
                }
                Resource.Status.UNKNOWN_ERROR -> handleUnknownError()
                else -> {}
            }
        }
    }

    private fun fetchContacts() {
        viewModel.fetchContacts(deviceId)
    }

    /** Notify to RecyclerView adapter that an item has changed */
    private fun notifyItemChanged(item: PhoneContact) {
        val itemIndex = viewModel.phoneContactList.value!!.data!!.indexOf(item)
        phoneContactsAdapter.notifyItemChanged(itemIndex)
    }

    /** Update RecyclerView or show empty view */
    private fun updateRecyclerViewOrShowEmptyView(list: List<PhoneContact>?) {
        if (list.isNullOrEmpty()) {
            binding.phoneContactsRecyclerView.visibility = View.GONE
            binding.noContactsGroup.visibility = View.VISIBLE
        } else {
            phoneContactsAdapter.submitList(list)
            binding.phoneContactsRecyclerView.visibility = View.VISIBLE
            binding.noContactsGroup.visibility = View.GONE
        }
    }

    /** Dialog callbacks */
    override fun onSaveContact(name: String, phone: String, image: String?, phoneContact: PhoneContact?) {
        if (phoneContact == null) {
            viewModel.addNewContact(name, phone, image)
        } else {
            viewModel.updatePhoneContact(phoneContact, name, phone, image)
        }
        editContactDialog = null
    }
    override fun onCancel() { editContactDialog = null }
    override fun onTakePhoto() { takePhotoOrAskPermission() }
    override fun onSelectFromGallery() { launchSelectPictureFromGallery() }
    override fun onImageLoaded(path: String?) { if (path != null) editContactDialog?.imagePath = path }
    override fun onConfirmDeleteContact(phoneContact: PhoneContact) {
        viewModel.removePhoneContact(phoneContact)
    }

    /** Permission executor/rationale flow */
    private fun executeOrAskPermission(
        permissionId: String,
        momoDialogFragmentType: Int,
        permissionLauncher: ActivityResultLauncher<String>,
        permissionGrantedCallback: () -> Unit
    ) {
        when {
            ContextCompat.checkSelfPermission(this, permissionId) == PackageManager.PERMISSION_GRANTED -> {
                permissionGrantedCallback()
            }
            ActivityCompat.shouldShowRequestPermissionRationale(this, permissionId) -> {
                val dialogFragment = MomoDialogFragment.Builder(requestPermissionDialogListener)
                    .setType(momoDialogFragmentType)
                    .build()
                dialogFragment.show(supportFragmentManager, "askPermissionDialog")
            }
            else -> {
                permissionLauncher.launch(permissionId)
            }
        }
    }

    private fun getContactFromDeviceOrAskPermission() {
        executeOrAskPermission(
            Manifest.permission.READ_CONTACTS,
            Constants.PERMISSION_CONTACTS,
            requestContactsPermissionLauncher
        ) { getContactFromDevice() }
    }

    private fun getContactFromDevice() {
        pickContact.launch()
    }

    private fun takePhotoOrAskPermission() {
        executeOrAskPermission(
            Manifest.permission.CAMERA,
            Constants.PERMISSION_STORAGE_CAMERA,
            requestCameraPermissionLauncher
        ) { launchTakePicture() }
    }

    /** Snackbar helper */
    private fun showSnackbar(messageId: Int) {
        Snackbar.make(binding.container, messageId, Snackbar.LENGTH_LONG).apply {
            view.setBackgroundColor(ContextCompat.getColor(this@PhoneBookActivity, R.color.colorPrimary))
            show()
        }
    }

    /** Unknown error handler */
    private fun handleUnknownError() {
        if (progressDialog.isShowing) progressDialog.dismiss()
        showSnackbar(R.string.unknown_error)
    }

    /** Insets + status/nav bars handling; moves the main FAB up when needed */
    private fun setupEdgeToEdge() {
        Timber.d("PhoneBookActivity: setupEdgeToEdge")

        // Store original FAB margin (it's inside ConstraintLayout)
        val fabParams = binding.fabMain.layoutParams as androidx.constraintlayout.widget.ConstraintLayout.LayoutParams
        fabMainOriginalBottomMargin = fabParams.bottomMargin

        // Status bar text/icons style (primary is dark -> light icons)
        WindowCompat.getInsetsController(window, window.decorView).isAppearanceLightStatusBars = false

        ViewCompat.setOnApplyWindowInsetsListener(binding.container) { _, windowInsets ->
            val systemBars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars())
            val displayCutout = windowInsets.getInsets(WindowInsetsCompat.Type.displayCutout())
            val navigationBars = windowInsets.getInsets(WindowInsetsCompat.Type.navigationBars())

            Timber.d("PhoneBookActivity: systemBars $systemBars")
            Timber.d("PhoneBookActivity: displayCutout $displayCutout")
            Timber.d("PhoneBookActivity: navigationBars $navigationBars")

            // Extend AppBar into status bar area
            binding.appbar.setPadding(
                systemBars.left.coerceAtLeast(displayCutout.left),
                systemBars.top.coerceAtLeast(displayCutout.top),
                systemBars.right.coerceAtLeast(displayCutout.right),
                binding.appbar.paddingBottom
            )

            // Apply bottom insets only if 3-button nav is present
            val shouldApplyBottomInsets = EdgeToEdgeUtils.hasButtonNavigation(applicationContext)
            val bottomPadding = if (shouldApplyBottomInsets) {
                navigationBars.bottom.coerceAtLeast(displayCutout.bottom)
            } else {
                0
            }

            Timber.d("PhoneBookActivity: shouldApplyBottomInsets $shouldApplyBottomInsets, bottomPadding $bottomPadding")

            // Move main FAB up by nav bar height
            fabParams.bottomMargin = fabMainOriginalBottomMargin + bottomPadding
            binding.fabMain.layoutParams = fabParams

            windowInsets
        }
    }

    /** Open/close the speed dial + scrim with tiny animations */
    private fun toggleSpeedDial(forceClose: Boolean = false) {
        val open = if (forceClose) false else !speedDialOpen
        speedDialOpen = open

        if (open) {
            binding.fabMain.animate().rotation(45f).setDuration(150).start()

            binding.speedDial.visibility = View.VISIBLE
            binding.speedDial.alpha = 0f
            binding.speedDial.translationY = 24f * resources.displayMetrics.density
            binding.speedDial.animate()
                .alpha(1f)
                .translationY(0f)
                .setDuration(150)
                .start()

            binding.fabScrim.visibility = View.VISIBLE
            binding.fabScrim.animate().alpha(0.35f).setDuration(150).start()
        } else {
            binding.fabMain.animate().rotation(0f).setDuration(150).start()

            binding.speedDial.animate()
                .alpha(0f)
                .translationY(24f * resources.displayMetrics.density)
                .setDuration(150)
                .withEndAction { binding.speedDial.visibility = View.GONE }
                .start()

            binding.fabScrim.animate()
                .alpha(0f)
                .setDuration(150)
                .withEndAction { binding.fabScrim.visibility = View.GONE }
                .start()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        if (progressDialog.isShowing) {
            progressDialog.dismiss()
        }
    }
}