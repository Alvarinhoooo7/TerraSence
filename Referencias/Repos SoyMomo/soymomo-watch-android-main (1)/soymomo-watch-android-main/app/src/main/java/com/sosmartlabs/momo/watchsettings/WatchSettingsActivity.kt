package com.sosmartlabs.momo.watchsettings

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Intent
import android.os.Bundle
import androidx.core.text.HtmlCompat
import android.widget.Toast
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.isVisible
import com.google.android.material.snackbar.Snackbar
import com.parse.ParseUser
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.alarms.AlarmsActivity
import com.sosmartlabs.momo.batterysave.BatterySaveActivity
import com.sosmartlabs.momo.calendarevent.CalendarEventActivity
import com.sosmartlabs.momo.databinding.ActivitySettingsWatchBinding
import com.sosmartlabs.momo.databinding.ItemWatchSettingBinding
import com.sosmartlabs.momo.dialpad.DialPadActivity
import com.sosmartlabs.momo.firebase.FirebaseRemoteConfigRepository
import com.sosmartlabs.momo.gpsmode.GPSModeActivity
import com.sosmartlabs.momo.hearts.HeartsActivity
import com.sosmartlabs.momo.heymomohistory.HeyMomoHistoryActivity
import com.sosmartlabs.momo.installedapp.InstalledAppActivity
import com.sosmartlabs.momo.locationhistory.LocationHistoryActivity
import com.sosmartlabs.momo.main.ui.dialog.DisabledUserPermissionDialogFragment
import com.sosmartlabs.momo.models.Space2
import com.sosmartlabs.momo.models.Space3
import com.sosmartlabs.momo.models.Space4
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.myfriends.MyFriendsActivity
import com.sosmartlabs.momo.newowner.NewOwnerActivity
import com.sosmartlabs.momo.phonebook.PhoneBookActivity
import com.sosmartlabs.momo.review.ReviewPromptRepository
import com.sosmartlabs.momo.reminders.RemindersActivity
import com.sosmartlabs.momo.steps.StepsActivity
import com.sosmartlabs.momo.utils.Constants
import com.sosmartlabs.momo.utils.EdgeToEdgeUtils
import com.sosmartlabs.momo.utils.Resource
import com.sosmartlabs.momo.utils.SnackbarUtils
import com.sosmartlabs.momo.utils.ui.DefaultIcons
import com.sosmartlabs.momo.utils.ui.ProgressDialogFragment
import com.sosmartlabs.momo.utils.ui.activityindicator.ActivityIndicatorDialogFragment
import com.sosmartlabs.momo.utils.ui.loadImage
import com.sosmartlabs.momo.utils.ui.toolbar.ToolbarConstructor
import com.sosmartlabs.momo.utils.ui.toolbar.ToolbarNavigationType
import com.sosmartlabs.momo.watchcontacts.WatchContactsActivity
import com.sosmartlabs.momo.watchinfo.WatchInfoActivity
import com.sosmartlabs.momo.watchlock.LockActivity
import com.sosmartlabs.momo.watchprofile.WatchProfileActivity
import com.sosmartlabs.momo.watchrequests.WatchRequestActivity
import com.sosmartlabs.momo.models.WatchSettings
import com.sosmartlabs.momo.watchsettings.ui.WatchSettingsViewModel
import com.sosmartlabs.momo.watchsettings.ui.dialogs.*
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber
import java.util.*
import java.util.concurrent.TimeUnit
import javax.inject.Inject

@AndroidEntryPoint
class WatchSettingsActivity : AppCompatActivity(),
    SetTimeDialogFragment.SetTimeDialogListener,
    LanguagesDialogFragment.LanguagesDialogListener,
    SoundDialogFragment.SoundDialogListener,
    RemoveWearerDialogFragment.RemoveWearerDialogListener,
    PowerOffDialogFragment.PowerOffDialogListener {

    @Inject lateinit var toolbarConstructor: ToolbarConstructor
    @Inject lateinit var reviewPromptRepository: ReviewPromptRepository

    private lateinit var mWearerId: String
    private val mViewModel: WatchSettingsViewModel by viewModels()
    private var mWatch: Wearer? = null

    private lateinit var mBinding: ActivitySettingsWatchBinding

    private var isConnected = false

    private var pendingLingoProgressDeepLink = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Timber.d("WatchSettingsActivity: onCreate")

        enableEdgeToEdge()
        mBinding = ActivitySettingsWatchBinding.inflate(layoutInflater)
        setContentView(mBinding.root)
        setupEdgeToEdge()

        mWearerId = intent.getStringExtra(Constants.EXTRA_WEARER_ID) ?: run {
            Timber.e("WatchSettingsActivity launched without EXTRA_WEARER_ID")
            finish()
            return
        }
        if (intent.getBooleanExtra(Constants.EXTRA_OPEN_LINGO_PROGRESS, false)) {
            intent.removeExtra(Constants.EXTRA_OPEN_LINGO_PROGRESS)
            pendingLingoProgressDeepLink = true
            Timber.d("WatchSettingsActivity: Lingo Progress deep-link pending")
        }
        supportPostponeEnterTransition()

        toolbarConstructor
            .setDisplayShowTitle(false)
            .setNavigationOnClick(ToolbarNavigationType.SUPPORT_FINISH_AFTER_TRANSITION)
            .setErrorName("WatchSettingsActivity")
            .build()
        initialWatchValue()
        setupItems()
        setupSectionHeaders()
        observeViewModel()
        getUserPermissions()
        setupImeiCopyToClipboard()
    }

    // region Item Setup

    private fun setupSectionHeaders() {
        mBinding.headerLocationSafety.sectionTitle.setText(R.string.settings_section_location_safety)
        mBinding.headerCommunication.sectionTitle.setText(R.string.settings_section_communication)
        mBinding.headerToolsActivity.sectionTitle.setText(R.string.settings_section_tools_activity)
        mBinding.headerDeviceSettings.sectionTitle.setText(R.string.settings_section_device_settings)
        mBinding.headerAdministration.sectionTitle.setText(R.string.settings_section_administration)
    }

    private fun setupItems() {
        // Section 1: Location & Safety
        configureItem(mBinding.itemLocationHistory, R.drawable.ic_watch_settings_location_history, R.string.settings_history_title) { goToLocationHistory() }
        configureItem(mBinding.itemLockHours, R.drawable.ic_watch_settings_school_mode, R.string.settings_lock_title) { goToLockHours() }
        configureItem(mBinding.itemGpsSettings, R.drawable.ic_watch_settings_gps, R.string.settings_gps_title) { goToGpsSettings() }

        // Section 2: Communication
        configureItem(mBinding.itemContacts, R.drawable.ic_watch_settings_contacts, R.string.settings_contacts_title) { goToContacts() }
        configureItem(mBinding.itemMyFriends, R.drawable.ic_watch_settings_friends, R.string.settings_my_friends_title) { goToFriends() }

        // Section 3: Tools & Activity
        configureItem(mBinding.itemAlarms, R.drawable.ic_watch_settings_alarms, R.string.settings_alarms_title) { goToAlarms() }
        configureItem(mBinding.itemCalendar, R.drawable.ic_watch_settings_calendar, R.string.settings_calendar_title) { goToCalendar() }
        configureItem(mBinding.itemReminders, R.drawable.ic_watch_settings_reminders, R.string.settings_reminders_title) { goToReminders() }
        configureItem(mBinding.itemSteps, R.drawable.ic_watch_settings_steps, R.string.settings_steps_title) { goToSteps() }
        configureItem(mBinding.itemHeymomoHistory, R.drawable.ic_watch_settings_hey_momo, R.string.title_heymomo_history) { goToHeyMomoHistory() }
        configureItem(mBinding.itemLingoProgress, R.drawable.ic_watch_settings_lingo_progress, R.string.s_lingo_progress_title) { goToLingoProgress() }

        // Section 4: Device Settings
        configureItem(mBinding.itemInstalledApps, R.drawable.ic_watch_settings_installed_apps, R.string.installed_app_settings_title) { goToInstalledApps() }
        configureItem(mBinding.itemSound, R.drawable.ic_watch_settings_sound_mode, R.string.settings_sound_title) { goToSoundSettings() }
        configureItem(mBinding.itemBatterySaving, R.drawable.ic_watch_settings_battery, R.string.settings_battery_saving_title) { goToBatterySaving() }
        configureItem(mBinding.itemDialpad, R.drawable.ic_watch_settings_dialer_keyboard, R.string.settings_dialpad_title) { goToDialPad() }
        configureItem(mBinding.itemTimeTimezone, R.drawable.ic_watch_settings_time_zone, R.string.settings_time_title) { goToSetTime() }
        configureItem(mBinding.itemLanguage, R.drawable.ic_watch_settings_languages, R.string.settings_language_title) { goToLanguageSettings() }
        configureItem(mBinding.itemRewards, R.drawable.ic_watch_settings_rewards, R.string.settings_rewards_title) { goToRewards() }
        configureItem(mBinding.itemWatchInfo, R.drawable.ic_watch_settings_watch_info, R.string.settings_watch_info_title) { goToWatchInfo() }
        configureItem(mBinding.itemPendingRequests, R.drawable.ic_watch_settings_pending_requests, R.string.settings_admins_requests_title) { goToAdminUsers() }
        configureItem(mBinding.itemNewOwner, R.drawable.ic_watch_settings_change_admin, R.string.settings_new_owner_title) { goToNewAdminUser() }
        configureItem(mBinding.itemRemoveWatch, R.drawable.ic_watch_settings_unlink, R.string.settings_remove_title) { goToUnlinkWatch() }
        // Style the unlink item as destructive
        mBinding.itemRemoveWatch.itemTitle.setTextColor(ContextCompat.getColor(this, R.color.colorAccent))
    }

    private fun configureItem(binding: ItemWatchSettingBinding, iconRes: Int, titleRes: Int, onClick: () -> Unit) {
        binding.itemIcon.setImageResource(iconRes)
        binding.itemTitle.setText(titleRes)
        binding.itemRoot.setOnClickListener { onClick() }
    }

    // endregion

    // region Visibility

    private fun updateItemVisibility() {
        // When the user lacks the "edit" permission, every edit-gated feature is
        // hidden (instead of being a silent no-op when tapped).
        val canEdit = checkEditPermission()

        // Section 1: Location & Safety
        // Location History is gated by the location permission; the rest by edit
        mBinding.itemLocationHistory.itemRoot.isVisible = checkLocationPermission()
        mBinding.itemLockHours.itemRoot.isVisible = canEdit
        mBinding.itemGpsSettings.itemRoot.isVisible = canEdit

        // Section 2: Communication
        mBinding.itemContacts.itemRoot.isVisible = canEdit
        mBinding.itemMyFriends.itemRoot.isVisible = showFriends() && canEdit

        // Section 3: Tools & Activity
        mBinding.itemAlarms.itemRoot.isVisible = canEdit
        mBinding.itemCalendar.itemRoot.isVisible = canEdit
        mBinding.itemReminders.itemRoot.isVisible = showReminders() && canEdit
        mBinding.itemSteps.itemRoot.isVisible = canEdit
        mBinding.itemHeymomoHistory.itemRoot.isVisible = showHeyMomoHistory() && canEdit
        mBinding.itemLingoProgress.itemRoot.isVisible = showLingoProgress() && canEdit

        // Section 4: Device Settings
        mBinding.itemInstalledApps.itemRoot.isVisible = showInstalledApps() && canEdit
        mBinding.itemSound.itemRoot.isVisible = showSound() && canEdit
        mBinding.itemBatterySaving.itemRoot.isVisible = showBatterySaving() && canEdit
        mBinding.itemDialpad.itemRoot.isVisible = showDialPad() && canEdit
        mBinding.itemTimeTimezone.itemRoot.isVisible = showTimeAndTimeZoneSettings() && canEdit
        mBinding.itemLanguage.itemRoot.isVisible = showLanguageSettings() && canEdit
        mBinding.itemRewards.itemRoot.isVisible = showRewards() && canEdit
        mBinding.itemWatchInfo.itemRoot.isVisible = showWatchInformation() && canEdit

        // Section 5: Administration
        // Admin-only actions also require edit (see checkOwnerPermission)
        mBinding.itemPendingRequests.itemRoot.isVisible = isAdminOfWatch() && canEdit
        mBinding.itemNewOwner.itemRoot.isVisible = isAdminOfWatch() && canEdit

        // Hide sections with no visible items
        updateSectionVisibility()
    }

    private fun updateSectionVisibility() {
        mBinding.sectionLocationSafety.isVisible =
            mBinding.itemLocationHistory.itemRoot.isVisible ||
            mBinding.itemLockHours.itemRoot.isVisible ||
            mBinding.itemGpsSettings.itemRoot.isVisible

        mBinding.sectionCommunication.isVisible =
            mBinding.itemContacts.itemRoot.isVisible || mBinding.itemMyFriends.itemRoot.isVisible

        mBinding.sectionToolsActivity.isVisible =
            mBinding.itemAlarms.itemRoot.isVisible ||
            mBinding.itemCalendar.itemRoot.isVisible ||
            mBinding.itemReminders.itemRoot.isVisible ||
            mBinding.itemSteps.itemRoot.isVisible ||
            mBinding.itemHeymomoHistory.itemRoot.isVisible ||
            mBinding.itemLingoProgress.itemRoot.isVisible

        mBinding.sectionDeviceSettings.isVisible =
            mBinding.itemInstalledApps.itemRoot.isVisible ||
            mBinding.itemSound.itemRoot.isVisible ||
            mBinding.itemBatterySaving.itemRoot.isVisible ||
            mBinding.itemDialpad.itemRoot.isVisible ||
            mBinding.itemTimeTimezone.itemRoot.isVisible ||
            mBinding.itemLanguage.itemRoot.isVisible ||
            mBinding.itemRewards.itemRoot.isVisible ||
            mBinding.itemWatchInfo.itemRoot.isVisible

        mBinding.sectionAdministration.isVisible =
            mBinding.itemPendingRequests.itemRoot.isVisible ||
            mBinding.itemNewOwner.itemRoot.isVisible ||
            mBinding.itemRemoveWatch.itemRoot.isVisible
    }

    fun showLanguageSettings(): Boolean {
        return mWatch?.model?.hasLanguageSettings() == true
    }

    fun showTimeAndTimeZoneSettings(): Boolean {
        return mWatch?.model?.hasTimeAndTimeZoneSettings() == true
    }

    fun showRewards(): Boolean {
        return (mWatch?.model != Space3 && mWatch?.model != Space4)
    }

    fun showSound(): Boolean {
        return true
    }

    fun showDialPad(): Boolean {
        return mWatch?.model?.hasDialPad() == true
    }

    fun showBatterySaving(): Boolean {
        return mWatch?.model?.hasBatterySaving() == true
    }

    fun showFriends(): Boolean {
        return mWatch?.model in listOf(Space2, Space3, Space4)
    }

    fun showReminders(): Boolean {
        return mWatch?.model in listOf(Space2, Space3, Space4)
    }

    fun showWatchInformation(): Boolean {
        return mWatch?.model in listOf(Space2, Space3, Space4)
    }

    fun showInstalledApps(): Boolean {
        return mWatch?.model in listOf(Space3, Space4)
    }

    fun showHeyMomoHistory(): Boolean {
        return mWatch?.model in listOf(Space3, Space4)
    }

    fun showLingoProgress(): Boolean {
        return mWatch?.model == Space4
    }

    // endregion

    // region Permissions

    private fun checkEditPermission(showPrompt: Boolean = false): Boolean {
        if (mViewModel.userPermission.value?.edit == true) return true
        if (showPrompt) {
            DisabledUserPermissionDialogFragment().show(
                supportFragmentManager, "Option Disabled"
            )
        }
        return false
    }

    private fun checkLocationPermission(showPrompt: Boolean = false): Boolean {
        val permission = mViewModel.userPermission.value
        if (permission?.location == true) return true
        if (showPrompt) { optionDisabledDialog() }
        return false
    }

    private fun checkOwnerPermission(showPrompt: Boolean = false): Boolean {
        if (isAdminOfWatch() && checkEditPermission()) { return true }
        if (showPrompt) { optionDisabledDialog() }
        return false
    }

    fun isAdminOfWatch(): Boolean {
        return mWatch?.has("userInCharge") == true &&
                mWatch?.userInCharge?.objectId == ParseUser.getCurrentUser().objectId
    }

    private fun optionDisabledDialog() {
        DisabledUserPermissionDialogFragment().show(
            supportFragmentManager, "Option Disabled"
        )
    }

    private fun getUserPermissions() {
        mViewModel.userPermission.observe(this) {
            if (it.edit) {
                with(mBinding) {
                    watchProfilePictureEditButton.setOnClickListener {
                        if (mWatch == null) return@setOnClickListener
                        val intent =
                            Intent(this@WatchSettingsActivity, WatchProfileActivity::class.java)
                        intent.putExtra(Constants.EXTRA_WEARER_ID, mWatch!!.objectId)
                        startActivity(intent)
                    }

                    buttonShare.root.setOnClickListener {
                        if (mWatch == null) return@setOnClickListener
                        shareWatchLinkMessage()
                    }

                    buttonFind.root.setOnClickListener {
                        if (mWatch == null) return@setOnClickListener
                        mViewModel.findWatch(mWatch!!)
                    }

                    buttonTurnOff.root.setOnClickListener {
                        if (mWatch == null) return@setOnClickListener
                        PowerOffDialogFragment.showNonCancellable(supportFragmentManager)
                    }
                }
            } else {
                mBinding.watchProfilePictureEditButton.setOnClickListener { optionDisabledDialog() }
                mBinding.buttonShare.root.setOnClickListener { optionDisabledDialog() }
                mBinding.buttonFind.root.setOnClickListener { optionDisabledDialog() }
                mBinding.buttonTurnOff.root.setOnClickListener { optionDisabledDialog() }
            }

            val alpha = if (it.edit) 1.0f else 0.5f
            mBinding.watchProfilePictureEditButton.alpha = alpha
            mBinding.buttonShare.root.alpha = alpha
            mBinding.buttonFind.root.alpha = alpha
            mBinding.buttonTurnOff.root.alpha = alpha

            updateItemVisibility()
            tryConsumeLingoProgressDeepLink()
        }
    }

    // endregion

    // region Navigation

    fun goToContacts() {
        if (!checkEditPermission() || mWatch == null) return
        val contactsIntent = if (mWatch!!.modelInt !in listOf(6, 8, 9))
            Intent(this, WatchContactsActivity::class.java)
        else Intent(this, PhoneBookActivity::class.java)
        contactsIntent.putExtra(Constants.EXTRA_DEVICE_ID, mWatch!!.getString("deviceId"))
        startActivity(contactsIntent)
    }

    fun goToHeyMomoHistory() {
        if (!checkEditPermission() || mWatch == null || (mWatch?.model != Space3 && mWatch?.model != Space4)) return
        val intent = Intent(this, HeyMomoHistoryActivity::class.java)
        intent.putExtra(Constants.EXTRA_WEARER_ID, mWatch!!.objectId)
        intent.putExtra(Constants.EXTRA_DEVICE_ID, mWatch!!.getString("deviceId"))
        startActivity(intent)
    }

    fun goToLingoProgress() {
        if (!checkEditPermission() || mWatch == null || !showLingoProgress()) return
        val intent = Intent(this, com.sosmartlabs.momo.lingo.ui.LingoProgressActivity::class.java)
        intent.putExtra(Constants.EXTRA_WEARER_ID, mWatch!!.objectId)
        startActivity(intent)
    }

    /**
     * Consumes the pending Lingo Progress deep-link from a notification tap, but only
     * once both the watch and the user permissions have loaded. Called from both the
     * `watch` and `userPermission` observers — whichever fires last triggers the
     * navigation. If the watch isn't a Space4 (i.e. Lingo isn't applicable), the flag
     * is cleared without navigating so we don't loop.
     */
    private fun tryConsumeLingoProgressDeepLink() {
        if (!pendingLingoProgressDeepLink) return
        if (mWatch == null) return
        if (mViewModel.userPermission.value == null) return
        pendingLingoProgressDeepLink = false
        if (!showLingoProgress()) {
            Timber.d("WatchSettingsActivity: Lingo deep-link skipped (watch not eligible)")
            return
        }
        Timber.d("WatchSettingsActivity: Consuming Lingo Progress deep-link")
        goToLingoProgress()
    }

    fun goToSteps() {
        if (!checkEditPermission() || mWatch == null) return
        val intent = Intent(this, StepsActivity::class.java)
        intent.putExtra(Constants.EXTRA_WEARER_ID, mWatch!!.objectId)
        intent.putExtra(
            Constants.EXTRA_WEARER_NAME,
            getString(
                R.string.item_watch_name,
                if (mWatch!!.has("firstName")) mWatch!!.getString("firstName") else "",
                if (mWatch!!.has("lastName")) mWatch!!.getString("lastName") else ""
            )
        )
        intent.putExtra(Constants.EXTRA_DEVICE_ID, mWatch!!.deviceId)
        startActivity(intent)
    }

    fun goToCalendar() {
        if (!checkEditPermission() || mWatch == null) return
        val intent = Intent(this, CalendarEventActivity::class.java)
        intent.putExtra(Constants.EXTRA_WEARER_ID, mWatch!!.objectId)
        intent.putExtra(Constants.EXTRA_DEVICE_ID, mWatch!!.getString("deviceId"))
        startActivity(intent)
    }

    fun goToReminders() {
        if (!checkEditPermission() || mWatch == null) return
        val intent = Intent(this, RemindersActivity::class.java)
        intent.putExtra(Constants.EXTRA_WATCH, mWatch!!)
        startActivity(intent)
    }

    fun goToAlarms() {
        if (!checkEditPermission() || mWatch == null) return
        val intent = Intent(this, AlarmsActivity::class.java)
        intent.putExtra(Constants.EXTRA_WEARER_ID, mWatch!!.objectId)
        startActivity(intent)
    }

    fun goToLockHours() {
        if (!checkEditPermission() || mWatch == null) return
        val intent = Intent(this, LockActivity::class.java)
        intent.putExtra(Constants.EXTRA_WEARER_ID, mWatch!!.objectId)
        startActivity(intent)
    }

    fun goToRewards() {
        if (!checkEditPermission() || mWatch == null || mWatch?.model == Space3 || mWatch?.model == Space4) return
        val intent = Intent(this, HeartsActivity::class.java)
        intent.putExtra(Constants.EXTRA_WEARER_ID, mWatch!!.objectId)
        startActivity(intent)
    }

    fun goToFriends() {
        if (!checkEditPermission() || mWatch == null) return
        val intent = Intent(this, MyFriendsActivity::class.java)
        intent.putExtra(Constants.EXTRA_WATCH, mWatch!!)
        startActivity(intent)
    }

    fun goToSetTime() {
        if (!checkEditPermission() || mWatch == null) return
        SetTimeDialogFragment.newInstance(mWatch!!, mWatch!!.settings)
            .show(supportFragmentManager, "Set time")
    }

    fun goToGpsSettings() {
        if (!checkEditPermission() || mWatch == null) return
        val intent = Intent(this, GPSModeActivity::class.java)
        intent.putExtra(Constants.EXTRA_WEARER_ID, mWatch!!.objectId)
        startActivity(intent)
    }

    fun goToDialPad() {
        if (!checkEditPermission() || mWatch == null) return
        val intent = Intent(this, DialPadActivity::class.java)
        intent.putExtra(Constants.EXTRA_WEARER_ID, mWatch!!.objectId)
        startActivity(intent)
    }

    fun goToBatterySaving() {
        if (!checkEditPermission() || mWatch == null) return
        val intent = Intent(this, BatterySaveActivity::class.java)
        intent.putExtra(Constants.EXTRA_WEARER_ID, mWatch!!.objectId)
        startActivity(intent)
    }

    fun goToLanguageSettings() {
        val settings = mWatch?.settings
        if (!checkEditPermission() || mWatch == null || settings == null) return
        LanguagesDialogFragment.newInstance(mWatch!!, settings)
            .show(supportFragmentManager, "Set language")
    }

    fun goToSoundSettings() {
        val settings = mWatch?.settings
        if (!checkEditPermission() || mWatch == null || settings == null) return
        SoundDialogFragment.newInstance(mWatch!!, settings)
            .show(supportFragmentManager, "Set sound")
    }

    fun goToWatchInfo() {
        if (!checkEditPermission() || mWatch == null) return
        val intent = Intent(this, WatchInfoActivity::class.java)
        intent.putExtra(Constants.EXTRA_WATCH, mWatch)
        startActivity(intent)
    }

    fun goToInstalledApps() {
        if (!checkEditPermission() || mWatch == null || !showInstalledApps()) return
        val intent = Intent(this, InstalledAppActivity::class.java)
        intent.putExtra(Constants.EXTRA_WATCH, mWatch)
        startActivity(intent)
    }

    fun goToLocationHistory() {
        if (!checkLocationPermission() || mWatch == null) return
        val intent = Intent(this, LocationHistoryActivity::class.java)
        intent.putExtra(Constants.EXTRA_WEARER_ID, mWatch!!.objectId)
        intent.putExtra(Constants.EXTRA_DEVICE_ID, mWatch!!.deviceId)
        startActivity(intent)
    }

    fun goToUnlinkWatch() {
        if (mWatch == null) return
        RemoveWearerDialogFragment.newInstance(mWatch!!)
            .show(supportFragmentManager, "Remove wearer")
    }

    fun goToNewAdminUser() {
        if (!checkOwnerPermission() || mWatch == null) return
        val intent = Intent(this, NewOwnerActivity::class.java)
        intent.putExtra(Constants.EXTRA_WEARER_ID, mWatch!!.objectId)
        intent.putExtra(Constants.EXTRA_DEVICE_ID, mWatch!!.getString("deviceId"))
        startActivity(intent)
    }

    fun goToAdminUsers() {
        if (!checkOwnerPermission() || mWatch == null) return
        val intent = Intent(this, WatchRequestActivity::class.java)
        intent.putExtra(Constants.EXTRA_WEARER_ID, mWatch!!.objectId)
        startActivity(intent)
    }

    // endregion

    // region Dialog Callbacks

    override fun onSaveTime(settings: WatchSettings) {
        mViewModel.updateWatchSettingsTime(settings)
    }

    override fun onSetTimeCancel() {}

    override fun onLanguageChanged(settings: WatchSettings) {
        mViewModel.updateWatchSettingsLanguage(settings)
    }

    override fun onLanguagesDialogCanceled() {}

    override fun onSoundModeChanged(settings: WatchSettings) {
        mViewModel.updateWatchSettingsSound(settings)
    }

    override fun onSoundDialogCanceled() {}

    override fun onRemoveWearer(wearer: Wearer) {
        mViewModel.removeWearer(wearer)
    }

    override fun onCancelRemoveWearer() {}

    override fun onPowerOffConfirmed() {
        val watch = mWatch ?: return
        mViewModel.turnOffWatch(watch)
    }

    override fun onPowerOffCanceled() {}

    // endregion

    // region ViewModel Observers

    private fun observeViewModel() {
        ActivityIndicatorDialogFragment.show(supportFragmentManager)
        updateUI()
        mViewModel.watch.observe(this) {
            when (it.status) {
                Resource.Status.LOAD_SUCCESS -> {
                    val watch = it.data
                    isConnected =
                        !(watch!!.has("lastTKQ") && Calendar.getInstance().timeInMillis - watch.getDate(
                            "lastTKQ"
                        )!!.time > TimeUnit.MINUTES.toMillis(
                            FirebaseRemoteConfigRepository.thresholdMinutesLastTKQ))
                    mWatch = watch
                    updateUI()
                    updateItemVisibility()
                    tryConsumeLingoProgressDeepLink()
                }
                Resource.Status.LOAD_ERROR -> {
                    showToast(getString(R.string.toast_error_finding_momo))
                    supportFinishAfterTransition()
                }
                Resource.Status.DELETING -> {
                    ProgressDialogFragment.show(supportFragmentManager, getString(R.string.progress_removing_momo))
                }
                Resource.Status.DELETING_SUCCESS -> {
                    ProgressDialogFragment.dismiss(supportFragmentManager)
                    showToast(getString(R.string.snackbar_momo_removed))
                    supportFinishAfterTransition()
                }
                Resource.Status.DELETING_ERROR -> {
                    ProgressDialogFragment.dismiss(supportFragmentManager)
                    when (it.statusType) {
                        WatchSettingsViewModel.WatchError.REMOVING_ADMIN_ERROR -> {
                            RemoveAdminErrorDialog().show(
                                supportFragmentManager,
                                "Remove admin error dialog"
                            )
                        }
                        WatchSettingsViewModel.WatchError.DELETE_ERROR -> {
                            showSnackbar(getString(R.string.snackbar_error_removing_momo))
                        }
                        else -> {}
                    }
                }
                else -> {}
            }
            ActivityIndicatorDialogFragment.hide()
        }
        mViewModel.watchCommands.observe(this) {
            when (it.status) {
                Resource.Status.LOADING -> {
                    ProgressDialogFragment.show(supportFragmentManager, getString(R.string.loading))
                }
                Resource.Status.LOAD_SUCCESS -> {
                    ProgressDialogFragment.dismiss(supportFragmentManager)
                    when (it.statusType) {
                        WatchSettingsViewModel.WatchCommands.FIND_PHONE -> {
                            reviewPromptRepository.recordPositiveUserAction()
                            showSnackbar(getString(R.string.snackbar_command_find_sent))
                        }
                        WatchSettingsViewModel.WatchCommands.TURN_OFF -> {
                            showSnackbar(getString(R.string.snackbar_command_turn_off_sent))
                        }
                        else -> {}
                    }
                }
                Resource.Status.LOAD_ERROR -> {
                    ProgressDialogFragment.dismiss(supportFragmentManager)
                    showSnackbar(getString(R.string.snackbar_error_sending_command))
                }
                else -> {}
            }
        }
        mViewModel.watchSettings.observe(this) {
            when (it.status) {
                Resource.Status.LOAD_ERROR -> {
                    ProgressDialogFragment.dismiss(supportFragmentManager)
                    showToast(getString(R.string.toast_error_could_not_load_settings))
                    supportFinishAfterTransition()
                }
                Resource.Status.UPDATING -> {
                    ProgressDialogFragment.show(supportFragmentManager, getString(R.string.progress_saving_changes))
                }
                Resource.Status.UPDATING_SUCCESS -> {
                    ProgressDialogFragment.dismiss(supportFragmentManager)
                    if (!isConnected) {
                        SnackbarUtils.showNotConnected(
                            this@WatchSettingsActivity,
                            mBinding.coordinator
                        )
                        return@observe
                    }
                    when (it.statusType) {
                        WatchSettingsViewModel.WatchSettingStatus.UPDATED_TIMEZONE -> {
                            showSnackbar(getString(R.string.snackbar_timezone_set))
                        }
                        WatchSettingsViewModel.WatchSettingStatus.UPDATED_LANGUAGE -> {
                            showSnackbar(getString(R.string.snackbar_language))
                        }
                        WatchSettingsViewModel.WatchSettingStatus.UPDATED_SOUND -> {
                            showSnackbar(getString(R.string.snackbar_sound))
                        }
                        else -> {}
                    }
                }
                Resource.Status.UPDATING_ERROR -> {
                    ProgressDialogFragment.dismiss(supportFragmentManager)
                    when (it.statusType) {
                        WatchSettingsViewModel.WatchSettingStatus.TIMEZONE_ERROR -> {
                            showSnackbar(getString(R.string.snackbar_error_timezone))
                        }
                        WatchSettingsViewModel.WatchSettingStatus.LANGUAGE_ERROR -> {
                            showSnackbar(getString(R.string.snackbar_language_error))
                        }
                        WatchSettingsViewModel.WatchSettingStatus.SOUND_ERROR -> {
                            showSnackbar(getString(R.string.snackbar_error_sound))
                        }
                        else -> {}
                    }
                }
                else -> {}
            }
        }
    }

    // endregion

    // region UI Helpers

    private fun updateUI() {
        setUserImage(mWatch)
        setUserData()
    }

    private fun setUserImage(watch: Wearer?) {
        try {
            val imageUrl = watch?.image?.url ?: DefaultIcons.PROFILE_MOMO_SPACE
            mBinding.watchProfilePicture.loadImage(
                imageUrl,
                fallback = DefaultIcons.PROFILE_MOMO_SPACE
            )
        } catch (e: Exception) {
            Timber.e(e)
            val imageUrl = DefaultIcons.PROFILE_MOMO_SPACE
            mBinding.watchProfilePicture.loadImage(
                imageUrl,
                fallback = DefaultIcons.PROFILE_MOMO_SPACE
            )
        }
    }

    private fun setUserData() {
        val id = "ID: ${mWatch?.imei() ?: ""}"
        mBinding.watchIdTextview.text = id
        mBinding.phoneNumberTextview.text = mWatch?.phone ?: ""
        mBinding.userNameTextview.text = mWatch?.name() ?: ""
        mBinding.watchModelTextview.text = mWatch?.shortModelName() ?: ""
    }

    private fun initialWatchValue() {
        if (mWatch != null) return
        mWatch = mViewModel.getWatchImmediate(mWearerId)
        updateUI()
        ActivityIndicatorDialogFragment.hide()
    }

    private fun setupImeiCopyToClipboard() {
        mBinding.watchIdTextview.setOnClickListener {
            val imei = mWatch?.imei() ?: return@setOnClickListener
            val clipboard = getSystemService(CLIPBOARD_SERVICE) as ClipboardManager
            val clip = ClipData.newPlainText("IMEI", imei)
            clipboard.setPrimaryClip(clip)
            showToast(getString(R.string.imei_copied_to_clipboard))
        }
    }

    private fun shareWatchLinkMessage() {
        // Share the deviceId: it's what the /link/watch/<id> deep link carries and
        // what the receiver parses, validates and prefills into the add-watch flow.
        val deviceId = mWatch?.deviceId() ?: return
        val message = getString(R.string.share_watch_link_message, deviceId)
        val sendIntent = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_TEXT, message)
        }
        val chooserTitle = getString(R.string.share_watch_link_chooser_title)
        val chooser = Intent.createChooser(sendIntent, chooserTitle)
        startActivity(chooser)
    }

    fun showSnackbar(message: String?) {
        val snackbar = Snackbar.make(mBinding.coordinator, HtmlCompat.fromHtml(message ?: "", HtmlCompat.FROM_HTML_MODE_LEGACY), Snackbar.LENGTH_LONG)
        snackbar.view.setBackgroundColor(ContextCompat.getColor(this, R.color.colorPrimary))
        snackbar.show()
    }

    private fun showToast(message: String?) {
        Toast.makeText(this, message, Toast.LENGTH_LONG).show()
    }

    // endregion

    // region Lifecycle

    override fun onResume() {
        super.onResume()
        Timber.d("WatchSettingsActivity: onResume")
        mViewModel.loadWatchSettings(mWearerId)
    }

    override fun onPause() {
        ProgressDialogFragment.dismiss(supportFragmentManager)
        super.onPause()
    }

    // endregion

    // region Edge-to-Edge

    private fun setupEdgeToEdge() {
        Timber.d("WatchSettingsActivity: setupEdgeToEdge")

        WindowCompat.getInsetsController(window, window.decorView).isAppearanceLightStatusBars = false

        ViewCompat.setOnApplyWindowInsetsListener(mBinding.coordinator) { _, windowInsets ->
            val systemBars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars())
            val displayCutout = windowInsets.getInsets(WindowInsetsCompat.Type.displayCutout())
            val navigationBars = windowInsets.getInsets(WindowInsetsCompat.Type.navigationBars())

            val topInset = systemBars.top.coerceAtLeast(displayCutout.top)

            mBinding.headerLayout.setPadding(
                systemBars.left.coerceAtLeast(displayCutout.left),
                topInset,
                systemBars.right.coerceAtLeast(displayCutout.right),
                mBinding.headerLayout.paddingBottom
            )

            val shouldApplyBottomInsets = EdgeToEdgeUtils.hasButtonNavigation(applicationContext)
            val bottomPadding = if (shouldApplyBottomInsets) {
                navigationBars.bottom.coerceAtLeast(displayCutout.bottom)
            } else {
                0
            }

            mBinding.scrollView.setPadding(
                mBinding.scrollView.paddingLeft,
                mBinding.scrollView.paddingTop,
                mBinding.scrollView.paddingRight,
                bottomPadding
            )

            windowInsets
        }
    }

    // endregion
}
