package com.sosmartlabs.momo.watchcontacts

import android.Manifest
import android.annotation.SuppressLint
import android.app.ProgressDialog
import android.content.Intent
import android.content.pm.PackageManager
import android.database.Cursor
import android.graphics.Bitmap
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.ContactsContract
import android.provider.MediaStore
import android.text.Editable
import android.text.Html
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.widget.ImageView
import android.widget.TextView
import android.widget.Toast
import android.widget.ViewFlipper
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.lifecycle.ViewModelProvider
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.ItemTouchHelper
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.bumptech.glide.request.RequestOptions
import com.google.android.material.snackbar.Snackbar
import com.google.android.material.textfield.TextInputLayout
import com.hbb20.CountryCodePicker
import com.parse.ParseFile
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.ActivityWatchContactsBinding
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.utils.Constants
import com.sosmartlabs.momo.utils.DragAndDropHelper
import com.sosmartlabs.momo.utils.EdgeToEdgeUtils
import com.sosmartlabs.momo.utils.FileProviderHelper
import com.sosmartlabs.momo.utils.ImageUtils
import com.sosmartlabs.momo.utils.SnackbarUtils
import com.sosmartlabs.momo.utils.ui.DefaultIcons
import com.sosmartlabs.momo.utils.ui.MomoDialogFragment
import com.sosmartlabs.momo.watchcontacts.model.Contact
import com.sosmartlabs.momo.watchcontacts.ui.ContactAdapter
import com.sosmartlabs.momo.watchcontacts.ui.ContactAvatarAdapter
import com.sosmartlabs.momo.watchcontacts.ui.WatchContactsViewModel
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.IOException

/**
 * TODO: Integrate with PhonebookActivity and delete!!!
 * @author mrgcl
 */
@AndroidEntryPoint
class WatchContactsActivity : AppCompatActivity(), MomoDialogFragment.MomoDialogListener {

    private val REQUEST_TAKE_PICTURE = 101
    private val REQUEST_SELECT_PICTURE = 102
    
    private var currentPhotoPath = ""
    private var currentAvatarView: ImageView? = null
    private var currentViewFlipper: ViewFlipper? = null
    
    private lateinit var binding: ActivityWatchContactsBinding
    private lateinit var contactAdapter: ContactAdapter
    private lateinit var deviceId: String
    private var isConnected = false
    private var watch: Wearer? = null
    private lateinit var progressDialog: ProgressDialog
    private lateinit var viewModel: WatchContactsViewModel
    private var contacts: List<Contact> = emptyList()

    /** Speed dial state + original FAB margin for insets handling */
    private var speedDialOpen = false
    private var fabMainOriginalBottomMargin = 0

    // Permission launchers
    private val requestContactsPermissionLauncher = 
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { isGranted ->
            if (isGranted) {
                pickContact()
            } else {
                showSnackbar(getString(R.string.snackbar_error_no_contacts_permission))
            }
        }
    
    private val requestCameraPermissionLauncher = 
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { isGranted ->
            if (isGranted) {
                takePicture()
            } else {
                showSnackbar(getString(R.string.toast_error_no_photo_permissions))
            }
        }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        
        binding = ActivityWatchContactsBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        if (intent.hasExtra(Constants.EXTRA_DEVICE_ID)) {
            deviceId = intent.getStringExtra(Constants.EXTRA_DEVICE_ID)!!
        } else {
            finish()
            return
        }
        
        viewModel = ViewModelProvider(this)[WatchContactsViewModel::class.java]
        contactAdapter = ContactAdapter(ArrayList(), this)
        
        setupEdgeToEdge()
        setupToolbar()
        setupFAB()
        setupRecyclerView()
        observeViewModel()
        
        progressDialog = ProgressDialog(this)
    }
    
    private fun setupEdgeToEdge() {
        Timber.d("WatchContactsActivity: setupEdgeToEdge")
        
        // Store original FAB margin (it's inside ConstraintLayout)
        val fabParams = binding.fabMain.layoutParams as androidx.constraintlayout.widget.ConstraintLayout.LayoutParams
        fabMainOriginalBottomMargin = fabParams.bottomMargin
        
        // Set dark status bar appearance (colorPrimary is dark purple)
        WindowCompat.getInsetsController(window, window.decorView).isAppearanceLightStatusBars = false
        
        ViewCompat.setOnApplyWindowInsetsListener(binding.container) { view, windowInsets ->
            val systemBars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars())
            val displayCutout = windowInsets.getInsets(WindowInsetsCompat.Type.displayCutout())
            val navigationBars = windowInsets.getInsets(WindowInsetsCompat.Type.navigationBars())
            
            Timber.d("WatchContactsActivity: systemBars $systemBars")
            Timber.d("WatchContactsActivity: displayCutout $displayCutout")
            Timber.d("WatchContactsActivity: navigationBars $navigationBars")
            
            // Apply top padding to AppBarLayout to extend colorPrimary background into status bar area
            binding.appbar.setPadding(
                systemBars.left.coerceAtLeast(displayCutout.left),
                systemBars.top.coerceAtLeast(displayCutout.top),
                systemBars.right.coerceAtLeast(displayCutout.right),
                binding.appbar.paddingBottom
            )
            
            // Apply bottom insets conditionally based on navigation type
            val shouldApplyBottomInsets = EdgeToEdgeUtils.hasButtonNavigation(applicationContext)
            val bottomPadding = if (shouldApplyBottomInsets) {
                navigationBars.bottom.coerceAtLeast(displayCutout.bottom)
            } else {
                0
            }
            
            Timber.d("WatchContactsActivity: shouldApplyBottomInsets $shouldApplyBottomInsets, bottomPadding $bottomPadding")

            // Move main FAB up by nav bar height
            fabParams.bottomMargin = fabMainOriginalBottomMargin + bottomPadding
            binding.fabMain.layoutParams = fabParams
            
            windowInsets
        }
    }
    
    private fun setupToolbar() {
        try {
            setSupportActionBar(binding.toolbar)
            supportActionBar?.apply {
                setDisplayHomeAsUpEnabled(true)
                setDisplayShowHomeEnabled(true)
                setDisplayShowTitleEnabled(false)
                title = getString(R.string.title_contacts)
            }
            binding.toolbar.setNavigationOnClickListener { finish() }
        } catch (e: NullPointerException) {
            Timber.e("WatchContactsActivity: Error setting up toolbar $e")
        }
    }
    
    private fun setupFAB() {
        // FAB + scrim handlers for speed dial
        binding.fabMain.setOnClickListener { toggleSpeedDial() }
        binding.fabScrim.setOnClickListener { toggleSpeedDial(forceClose = true) }

        binding.fabAddFromContacts.setOnClickListener {
            toggleSpeedDial(forceClose = true)
            if (contactAdapter.itemCount >= Constants.MAX_CONTACTS) {
                showSnackbar(getString(R.string.snackbar_error_max_contacts))
                return@setOnClickListener
            }
            getContactFromDeviceOrAskPermission()
        }
        
        binding.fabAddManual.setOnClickListener {
            toggleSpeedDial(forceClose = true)
            showAddContactDialog("", "")
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
    
    private fun setupRecyclerView() {
        binding.contactsRecyclerView.apply {
            layoutManager = LinearLayoutManager(this@WatchContactsActivity)
            adapter = this@WatchContactsActivity.contactAdapter
            
            val dragAndDropHelper = DragAndDropHelper(this@WatchContactsActivity.contactAdapter)
            val itemTouchHelper = ItemTouchHelper(dragAndDropHelper)
            itemTouchHelper.attachToRecyclerView(this)
        }
    }
    
    private fun observeViewModel() {
        viewModel.watch.observe(this) { watch = it }
        viewModel.isWatchConnected.observe(this) { isConnected = it }
        viewModel.contactList.observe(this) { result ->
            when (result.status) {
                com.sosmartlabs.momo.utils.Resource.Status.LOADING -> {
                    progressDialog.setMessage(getString(R.string.progress_loading_contacts))
                    progressDialog.show()
                }
                com.sosmartlabs.momo.utils.Resource.Status.LOAD_SUCCESS -> {
                    progressDialog.dismiss()
                    contacts = result.data ?: emptyList()
                    contactAdapter.updateData(contacts)
                    if (contacts.isEmpty()) {
                        binding.contactsRecyclerView.visibility = View.GONE
                        binding.noContactsGroup.visibility = View.VISIBLE
                    } else {
                        binding.contactsRecyclerView.visibility = View.VISIBLE
                        binding.noContactsGroup.visibility = View.GONE
                    }
                }
                com.sosmartlabs.momo.utils.Resource.Status.LOAD_ERROR -> {
                    progressDialog.dismiss()
                    showSnackbar(getString(R.string.snackbar_error_loading_contacts))
                }
                else -> {}
            }
        }
    }
    
    private fun getContactFromDeviceOrAskPermission() {
        when {
            ContextCompat.checkSelfPermission(this, Manifest.permission.READ_CONTACTS) == PackageManager.PERMISSION_GRANTED -> {
                pickContact()
            }
            ActivityCompat.shouldShowRequestPermissionRationale(this, Manifest.permission.READ_CONTACTS) -> {
                val dialogFragment = MomoDialogFragment.Builder(this)
                    .setType(Constants.PERMISSION_CONTACTS)
                    .build()
                dialogFragment.show(supportFragmentManager, "momoDialog")
            }
            else -> {
                requestContactsPermissionLauncher.launch(Manifest.permission.READ_CONTACTS)
            }
        }
    }
    
    private fun pickContact() {
        val uri = Uri.parse("content://contacts")
        val intent = Intent(Intent.ACTION_PICK, uri).apply {
            type = ContactsContract.CommonDataKinds.Phone.CONTENT_TYPE
        }
        startActivityForResult(intent, Constants.REQUEST_READ_CONTACTS)
    }
    
    override fun onResume() {
        super.onResume()
        viewModel.getContacts(deviceId)
    }
    
    override fun onMomoDialogContinue(type: Int) {
        when (type) {
            Constants.PERMISSION_CONTACTS -> {
                requestContactsPermissionLauncher.launch(Manifest.permission.READ_CONTACTS)
            }
            Constants.PERMISSION_STORAGE_CAMERA -> {
                requestCameraPermissionLauncher.launch(Manifest.permission.CAMERA)
            }
        }
    }
    
    override fun onMomoDialogDismiss() {
        // Do nothing
    }
    
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        
        when (requestCode) {
            Constants.REQUEST_READ_CONTACTS -> {
                if (resultCode == RESULT_OK && data != null) {
                    val uri = data.data
                    val projection = arrayOf(
                        ContactsContract.CommonDataKinds.Phone.NUMBER,
                        ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME
                    )
                    var cursor: Cursor? = null
                    try {
                        cursor = contentResolver.query(uri!!, projection, null, null, null)
                        cursor?.moveToFirst()
                        val numberColumnIndex = cursor?.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER) ?: -1
                        val phone = cursor?.getString(numberColumnIndex)?.replace("[()\\-\\s]".toRegex(), "") ?: ""
                        if (phone.isEmpty()) {
                            showSnackbar(getString(R.string.snackbar_error_contact_has_no_phone))
                            return
                        }
                        val nameColumnIndex = cursor?.getColumnIndex(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME) ?: -1
                        val name = cursor?.getString(nameColumnIndex) ?: ""
                        showAddContactDialog(name, phone)
                    } catch (e: Exception) {
                        Timber.e("WatchContactsActivity: Error reading contact $e")
                    } finally {
                        cursor?.close()
                    }
                }
            }
            REQUEST_TAKE_PICTURE -> {
                if (resultCode == RESULT_OK) {
                    val f = File(currentPhotoPath)
                    if (currentAvatarView != null && currentViewFlipper != null) {
                        Glide.with(this)
                            .load(f)
                            .apply(RequestOptions.circleCropTransform())
                            .into(currentAvatarView!!)
                        currentViewFlipper!!.displayedChild = 0
                    }
                }
            }
        }
    }
    
    fun showAddContactDialog(name: String, phone: String) {
        val inflater = LayoutInflater.from(this)
        val dialogView = inflater.inflate(R.layout.dialog_add_contact, null)
        val tilName = dialogView.findViewById<TextInputLayout>(R.id.til_contact_name)
        val tilPhone = dialogView.findViewById<TextInputLayout>(R.id.til_contact_phone)
        val ccp = dialogView.findViewById<CountryCodePicker>(R.id.ccp)
        
        tilPhone.editText?.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) {
                tilPhone.isErrorEnabled = false
                if (s?.isNotEmpty() == true) {
                    if (!com.sosmartlabs.momo.utils.PhoneNumberUtils.isValidPhoneNumber(ccp)) {
                        tilPhone.error = getString(R.string.edittext_error_invalid_phone)
                        tilPhone.editText?.requestFocus()
                    }
                }
            }
        })
        
        ccp.registerCarrierNumberEditText(tilPhone.editText)
        val title = dialogView.findViewById<TextView>(R.id.textview_dialog_title)
        title.setText(R.string.alert_add_contact_title)
        tilName.editText?.setText(if (name.length > 14) name.substring(0, 14) else name)
        
        if (phone.contains("+")) {
            ccp.fullNumber = phone
        } else {
            tilPhone.editText?.setText(phone)
        }
        
        val contactImage = dialogView.findViewById<ImageView>(R.id.contact_image)
        contactImage.setImageResource(DefaultIcons.PROFILE_MOMO_CLASSIC)
        contactImage.visibility = View.GONE
        
        val viewFlipper = dialogView.findViewById<ViewFlipper>(R.id.view_flipper_dialog_contact)
        val editAvatarFab = dialogView.findViewById<com.google.android.material.floatingactionbutton.FloatingActionButton>(R.id.fab_edit_avatar)
        editAvatarFab.setOnClickListener { viewFlipper.displayedChild = 1 }
        editAvatarFab.visibility = View.GONE
        
        val recyclerView = dialogView.findViewById<RecyclerView>(R.id.recycler_view_avatar_chooser)
        recyclerView.visibility = View.GONE
        val contactAvatarAdapter = ContactAvatarAdapter(this, viewFlipper, contactImage)
        recyclerView.layoutManager = GridLayoutManager(this, 3)
        recyclerView.adapter = contactAvatarAdapter
        contactAvatarAdapter.notifyDataSetChanged()
        
        currentAvatarView = contactImage
        currentViewFlipper = viewFlipper
        
        val dialog = AlertDialog.Builder(this)
            .setView(dialogView)
            .setNegativeButton(R.string.button_cancel, null)
            .setPositiveButton(R.string.button_accept, null)
            .create()
        
        dialog.show()
        dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener {
            val contactName = tilName.editText?.text.toString().trim()
            if (contactName.isEmpty()) {
                tilName.error = getString(R.string.edittext_error_enter_contact_name)
                return@setOnClickListener
            }
            if (!com.sosmartlabs.momo.utils.PhoneNumberUtils.isValidPhoneNumber(ccp)) {
                tilPhone.error = getString(R.string.edittext_error_invalid_phone)
                return@setOnClickListener
            }
            saveContact(contactName, ccp.fullNumberWithPlus, ImageUtils.drawableToBitmap(contactImage.drawable)!!)
            dialog.dismiss()
        }
    }
    
    fun createEditContactDialog(contact: Contact, position: Int) {
        val inflater = LayoutInflater.from(this)
        val dialogView = inflater.inflate(R.layout.dialog_add_contact, null)
        val ccp = dialogView.findViewById<CountryCodePicker>(R.id.ccp)
        val tilName = dialogView.findViewById<TextInputLayout>(R.id.til_contact_name)
        val tilPhone = dialogView.findViewById<TextInputLayout>(R.id.til_contact_phone)
        
        tilName.editText?.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) {
                if (tilName.isErrorEnabled) {
                    tilName.isErrorEnabled = false
                }
            }
        })
        
        tilPhone.editText?.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) {
                tilPhone.isErrorEnabled = false
                if (s?.isNotEmpty() == true) {
                    if (!com.sosmartlabs.momo.utils.PhoneNumberUtils.isValidPhoneNumber(ccp)) {
                        tilPhone.error = getString(R.string.edittext_error_invalid_phone)
                        tilPhone.editText?.requestFocus()
                    }
                }
            }
        })
        
        ccp.registerCarrierNumberEditText(tilPhone.editText)
        val title = dialogView.findViewById<TextView>(R.id.textview_dialog_title)
        title.setText(R.string.alert_contact_edit)
        tilName.editText?.setText(contact.getString("name"))
        
        if (contact.getString("phone")?.contains("+") == true) {
            ccp.fullNumber = contact.getString("phone")
        } else {
            tilPhone.editText?.setText(contact.getString("phone"))
        }
        
        val contactImage = dialogView.findViewById<ImageView>(R.id.contact_image)
        contactImage.visibility = View.GONE
        if (contact.has("picture")) {
            Glide.with(this)
                .load(contact.picture?.url)
                .into(contactImage)
        } else {
            contactImage.setImageResource(DefaultIcons.PROFILE_MOMO_CLASSIC)
        }
        
        val viewFlipper = dialogView.findViewById<ViewFlipper>(R.id.view_flipper_dialog_contact)
        val editAvatarFab = dialogView.findViewById<com.google.android.material.floatingactionbutton.FloatingActionButton>(R.id.fab_edit_avatar)
        editAvatarFab.visibility = View.GONE
        editAvatarFab.setOnClickListener { viewFlipper.displayedChild = 1 }
        
        val recyclerView = dialogView.findViewById<RecyclerView>(R.id.recycler_view_avatar_chooser)
        recyclerView.visibility = View.GONE
        val contactAvatarAdapter = ContactAvatarAdapter(this, viewFlipper, contactImage)
        recyclerView.layoutManager = GridLayoutManager(this, 3)
        recyclerView.adapter = contactAvatarAdapter
        contactAvatarAdapter.notifyDataSetChanged()
        
        val backButtonAvatar = dialogView.findViewById<ImageView>(R.id.back_choose_avatar)
        backButtonAvatar.setOnClickListener { viewFlipper.displayedChild = 0 }
        
        currentAvatarView = contactImage
        currentViewFlipper = viewFlipper
        
        val dialog = AlertDialog.Builder(this)
            .setView(dialogView)
            .setNegativeButton(R.string.button_cancel, null)
            .setPositiveButton(R.string.button_save, null)
            .create()
        
        dialog.show()
        dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener {
            val progressDialog = ProgressDialog(this)
            progressDialog.setMessage(getString(R.string.progress_saving_contact))
            progressDialog.show()
            
            val contactName = tilName.editText?.text.toString().trim()
            if (contactName.isEmpty()) {
                tilName.error = getString(R.string.edittext_error_enter_contact_name)
                return@setOnClickListener
            }
            if (!com.sosmartlabs.momo.utils.PhoneNumberUtils.isValidPhoneNumber(ccp)) {
                tilPhone.error = getString(R.string.edittext_error_invalid_phone)
                return@setOnClickListener
            }
            
            for (savedContact in contacts) {
                val contactPhone = savedContact.phone
                if (contactPhone != null && savedContact.objectId != contact.objectId &&
                    android.telephony.PhoneNumberUtils.compare(contactPhone, ccp.fullNumberWithPlus)) {
                    progressDialog.dismiss()
                    showSnackbar(R.string.snackbar_error_phone_number_already_exist)
                    return@setOnClickListener
                }
            }
            
            contact.name = contactName
            contact.phone = ccp.fullNumberWithPlus
            val bitmap = ImageUtils.drawableToBitmap(contactImage.drawable)
            val stream = ByteArrayOutputStream()
            bitmap?.compress(Bitmap.CompressFormat.PNG, 50, stream)
            val data = stream.toByteArray()
            val imageFile = ParseFile(data)
            contact.picture = imageFile
            
            contact.saveInBackground { e ->
                if (e != null) {
                    CrashlyticsLog.recordNonFatalError(e, "Error saving watch contact")
                }
                contactAdapter.notifyItemChanged(position)
                progressDialog.dismiss()
                dialog.dismiss()
            }
        }
    }
    
    fun saveContact(name: String, phone: String, bitmap: Bitmap) {
        val progressDialog = ProgressDialog(this)
        progressDialog.setMessage(getString(R.string.progress_saving_contact))
        progressDialog.show()
        
        for (contact in contacts) {
            val contactPhone = contact.phone
            if (contactPhone != null && android.telephony.PhoneNumberUtils.compare(contactPhone, phone)) {
                progressDialog.dismiss()
                showSnackbar(R.string.snackbar_error_phone_number_already_exist)
                return
            }
        }
        
        val contact = Contact().apply {
            this.name = name
            this.phone = phone
            sos = false
            chatEnabled = false
            watch = this@WatchContactsActivity.watch
            position = contacts.size
        }
        
        val stream = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.PNG, 50, stream)
        val data = stream.toByteArray()
        val imageFile = ParseFile(data)
        contact.picture = imageFile
        
        contact.saveInBackground { e ->
            if (e != null || watch == null) {
                progressDialog.dismiss()
                showSnackbar(getString(R.string.snackbar_error_saving_contact))
                CrashlyticsLog.recordNonFatalError(e, "Error saving watch contact")
            } else {
                watch!!.getRelation<Contact>("contacts").add(contact)
                watch!!.saveInBackground { e1 ->
                    progressDialog.dismiss()
                    if (e1 != null) {
                        CrashlyticsLog.recordNonFatalError(e1, "Error saving watch for watch contact")
                        showSnackbar(getString(R.string.snackbar_error_saving_contact))
                    } else {
                        contactAdapter.addContact(contact)
                        binding.contactsRecyclerView.visibility = View.VISIBLE
                        binding.noContactsGroup.visibility = View.GONE
                        if (isConnected) {
                            showSnackbar(getString(R.string.snackbar_contact_added))
                        } else {
                            SnackbarUtils.showNotConnected(this@WatchContactsActivity, binding.container)
                        }
                    }
                }
            }
        }
    }
    
    override fun onPause() {
        contactAdapter.sendContacts()
        super.onPause()
    }
    
    fun getWearerDeviceId(): String = deviceId
    
    fun showSnackbar(message: String) {
        val snackbar = Snackbar.make(binding.container, Html.fromHtml(message), Snackbar.LENGTH_LONG)
        showSnackbar(snackbar)
    }
    
    fun showSnackbar(resId: Int) {
        val snackbar = Snackbar.make(binding.container, resId, Snackbar.LENGTH_LONG)
        showSnackbar(snackbar)
    }
    
    private fun showSnackbar(snackbar: Snackbar) {
        snackbar.view.setBackgroundColor(ContextCompat.getColor(this, R.color.colorPrimary))
        snackbar.show()
    }
    
    fun selectPicture() {
        val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
            type = "image/*"
        }
        startActivityForResult(Intent.createChooser(intent, getString(R.string.photo_select_from_gallery)), REQUEST_SELECT_PICTURE)
    }
    
    fun takePicture() {
        val takePictureIntent = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
        if (hasPermissions() && takePictureIntent.resolveActivity(packageManager) != null) {
            try {
                val file = createImageFile("test")
                val photoUri = FileProvider.getUriForFile(
                    this,
                    FileProviderHelper.getFileProviderAuthority(applicationContext),
                    file
                )
                takePictureIntent.putExtra(MediaStore.EXTRA_OUTPUT, photoUri)
                startActivityForResult(takePictureIntent, REQUEST_TAKE_PICTURE)
            } catch (e: IOException) {
                Toast.makeText(this, R.string.toast_error_camera, Toast.LENGTH_LONG).show()
            } catch (e: IllegalStateException) {
                Toast.makeText(this, R.string.toast_error_finding_momo, Toast.LENGTH_LONG).show()
                finish()
            }
        }
    }
    
    private fun createImageFile(deviceId: String): File {
        val imageFileName = deviceId + System.currentTimeMillis()
        val storageDir = cacheDir
        val image = File.createTempFile(imageFileName, ".png", storageDir)
        currentPhotoPath = image.absolutePath
        return image
    }
    
    fun hasPermissions(): Boolean {
        return ActivityCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
    }
    
    fun askForPermissions() {
        if (ActivityCompat.shouldShowRequestPermissionRationale(this, Manifest.permission.CAMERA)) {
            requestCameraPermissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }
}
