package com.sosmartlabs.momo.newowner

import android.os.Bundle
import android.widget.Toast
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.isVisible
import androidx.recyclerview.widget.ConcatAdapter
import androidx.recyclerview.widget.LinearLayoutManager
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.parse.ParseCloud
import com.parse.ParseObject
import com.parse.ParseQuery
import com.parse.ParseUser
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.ActivityNewOwnerBinding
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.newowner.ui.NewOwnerHeaderAdapter
import com.sosmartlabs.momo.newowner.ui.UserAdapter
import com.sosmartlabs.momo.utils.Constants
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber

/**
 * Lets the watch admin hand ownership to one of the watch's co-managers.
 * @author mrgcl — modernized UI (collapsing header, card list, Material dialog).
 */
@AndroidEntryPoint
class NewOwnerActivity : AppCompatActivity() {

    private lateinit var binding: ActivityNewOwnerBinding
    private lateinit var userAdapter: UserAdapter
    private var wearerId: String? = null
    private var deviceId: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        binding = ActivityNewOwnerBinding.inflate(layoutInflater)
        setContentView(binding.root)

        wearerId = intent.getStringExtra(Constants.EXTRA_WEARER_ID)
        deviceId = intent.getStringExtra(Constants.EXTRA_DEVICE_ID)
        if (wearerId == null || deviceId == null) {
            finish()
            return
        }

        setupEdgeToEdge()
        setupToolbar()
        setupRecyclerView()
        loadUsers()
    }

    private fun setupToolbar() {
        setSupportActionBar(binding.toolbar)
        supportActionBar?.apply {
            // The title is drawn by the CollapsingToolbarLayout when collapsed and by the header
            // when expanded, so the Toolbar must not render its own title (it would duplicate them).
            setDisplayShowTitleEnabled(false)
            setDisplayHomeAsUpEnabled(true)
            setDisplayShowHomeEnabled(true)
        }
        binding.toolbar.setNavigationOnClickListener { finish() }
    }

    private fun setupRecyclerView() {
        userAdapter = UserAdapter { watchUser -> showAssignAdminDialog(watchUser) }
        binding.usersRecyclerView.apply {
            layoutManager = LinearLayoutManager(this@NewOwnerActivity)
            adapter = ConcatAdapter(NewOwnerHeaderAdapter(), userAdapter)
        }
    }

    private fun loadUsers() {
        showLoading()
        val query = ParseQuery.getQuery<ParseObject>("WatchUser").apply {
            whereEqualTo("watch", ParseObject.createWithoutData("Wearer", wearerId))
            whereNotEqualTo("user", ParseUser.getCurrentUser())
            whereExists("user")
            whereEqualTo("active", true)
            include("user")
        }
        query.findInBackground { objects, e ->
            if (e != null) {
                Timber.e(e, "NewOwnerActivity: Error loading users")
                Toast.makeText(this, R.string.toast_error_loading_users, Toast.LENGTH_LONG).show()
                CrashlyticsLog.recordNonFatalError(e, "Error finding WatchUsers in NewOwnerActivity")
                showEmpty()
            } else {
                handleUsersLoaded(objects)
            }
        }
    }

    private fun handleUsersLoaded(users: List<ParseObject>) {
        if (users.isEmpty()) {
            showEmpty()
        } else {
            userAdapter.submitList(users)
            showList()
        }
    }

    private fun showAssignAdminDialog(watchUser: ParseObject) {
        val user = watchUser.getParseUser("user") ?: return
        val firstName = user.getString("firstName").orEmpty()
        val lastName = user.getString("lastName").orEmpty()
        val name = getString(R.string.item_watch_name, firstName, lastName).trim()
        MaterialAlertDialogBuilder(this)
            .setTitle(R.string.new_owner_confirm_title)
            .setMessage(getString(R.string.new_owner_confirm_message, name))
            .setPositiveButton(R.string.button_accept) { dialog, _ ->
                dialog.dismiss()
                assignNewOwner(user)
            }
            .setNegativeButton(R.string.button_cancel) { dialog, _ -> dialog.dismiss() }
            .show()
    }

    private fun assignNewOwner(user: ParseUser) {
        showLoading()
        val params = hashMapOf(
            "deviceId" to deviceId.orEmpty(),
            "newOwner" to user.objectId
        )
        ParseCloud.callFunctionInBackground("setNewOwner", params) { result: Int?, e ->
            if (e != null || (result ?: 0) < 1) {
                if (e != null) {
                    Timber.e(e, "NewOwnerActivity: setNewOwner error")
                    CrashlyticsLog.recordNonFatalError(e, "Error on setNewOwner cloud function")
                }
                Toast.makeText(this, R.string.toast_error_assigning_new_admin, Toast.LENGTH_LONG).show()
                showList()
            } else {
                Toast.makeText(this, R.string.toast_new_admin_assigned, Toast.LENGTH_LONG).show()
                finish()
            }
        }
    }

    /** Mutually-exclusive content states. The progress bar also covers the assign call so the
     *  list can't be tapped twice while ownership is being transferred. */
    private fun showLoading() {
        binding.progressBar.isVisible = true
        binding.usersRecyclerView.isVisible = false
        binding.layoutNoUsers.isVisible = false
    }

    private fun showList() {
        binding.progressBar.isVisible = false
        binding.usersRecyclerView.isVisible = true
        binding.layoutNoUsers.isVisible = false
    }

    private fun showEmpty() {
        binding.progressBar.isVisible = false
        binding.usersRecyclerView.isVisible = false
        binding.layoutNoUsers.isVisible = true
    }

    private fun setupEdgeToEdge() {
        WindowCompat.getInsetsController(window, window.decorView).isAppearanceLightStatusBars = false

        val baseListBottom = binding.usersRecyclerView.paddingBottom
        ViewCompat.setOnApplyWindowInsetsListener(binding.root) { _, windowInsets ->
            val systemBars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars())
            val displayCutout = windowInsets.getInsets(WindowInsetsCompat.Type.displayCutout())
            val navigationBars = windowInsets.getInsets(WindowInsetsCompat.Type.navigationBars())

            binding.appBar.setPadding(
                systemBars.left.coerceAtLeast(displayCutout.left),
                systemBars.top.coerceAtLeast(displayCutout.top),
                systemBars.right.coerceAtLeast(displayCutout.right),
                binding.appBar.paddingBottom
            )

            val bottom = navigationBars.bottom.coerceAtLeast(displayCutout.bottom)
            binding.usersRecyclerView.setPadding(
                binding.usersRecyclerView.paddingLeft,
                binding.usersRecyclerView.paddingTop,
                binding.usersRecyclerView.paddingRight,
                baseListBottom + bottom
            )
            binding.layoutNoUsers.setPadding(
                binding.layoutNoUsers.paddingLeft,
                binding.layoutNoUsers.paddingTop,
                binding.layoutNoUsers.paddingRight,
                bottom
            )

            windowInsets
        }
    }
}
