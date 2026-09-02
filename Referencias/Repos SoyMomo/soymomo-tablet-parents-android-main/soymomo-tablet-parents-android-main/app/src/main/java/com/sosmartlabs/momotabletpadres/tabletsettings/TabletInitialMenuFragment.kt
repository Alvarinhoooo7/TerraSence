package com.sosmartlabs.momotabletpadres.tabletsettings

import android.content.Intent
import android.content.res.ColorStateList
import android.os.Bundle
import android.text.format.DateUtils
import android.view.LayoutInflater
import android.view.MenuItem
import android.view.View
import android.view.ViewGroup
import androidx.annotation.ColorRes
import androidx.annotation.DrawableRes
import androidx.annotation.IdRes
import androidx.annotation.StringRes
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.snackbar.Snackbar
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.contacts.ContactsActivity
import com.sosmartlabs.momotabletpadres.databinding.ItemTabletSettingRowBinding
import com.sosmartlabs.momotabletpadres.databinding.SettingsTabletFragmentInitialBinding
import com.sosmartlabs.momotabletpadres.glide.loadImage
import com.sosmartlabs.momotabletpadres.locationhistory.LocationHistoryActivity
import com.sosmartlabs.momotabletpadres.main.MainActivity
import com.sosmartlabs.momotabletpadres.tablet.TabletViewModel
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.tablet.model.TabletModel
import com.sosmartlabs.momotabletpadres.tablet.model.TabletPresenceState
import com.sosmartlabs.momotabletpadres.utils.ErrorHandlers
import com.sosmartlabs.momotabletpadres.utils.NewNetworkStateChecker
import com.sosmartlabs.momotabletpadres.utils.WindowInsetsUtils
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber

@AndroidEntryPoint
class TabletInitialMenuFragment : Fragment() {

    private lateinit var binding: SettingsTabletFragmentInitialBinding

    private val tabletViewModel: TabletViewModel by activityViewModels()

    init {
        Timber.d("TabletInitialMenuFragment: Initializing fragment")
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        Timber.d("TabletInitialMenuFragment: Creating view")
        binding = SettingsTabletFragmentInitialBinding.inflate(inflater, container, false)
        // Push the purple header (logo + back arrow) clear of the status bar and
        // pad the scroll body clear of the navigation bar — one listener, matching
        // MainActivity's status-bar + 8dp top spacing so the logo lines up app-wide.
        WindowInsetsUtils.applyEdgeToEdgeInsets(
            root = binding.coordinator,
            topView = binding.headerLayout,
            bottomView = binding.contentScrollView,
            extraTopPx = resources.getDimensionPixelSize(R.dimen.horizontal_margin_small),
        )
        setupToolbar()
        setupStaticListeners()
        setupDeviceLockListener()
        setupViewModel()
        return binding.root
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        return when (item.itemId) {
            android.R.id.home -> {
                goToMainActivity()
                true
            }

            else -> super.onOptionsItemSelected(item)
        }
    }

    private fun setupViewModel() {
        Timber.d("TabletInitialMenuFragment: Setting up view model")
        tabletViewModel.currentTablet.observe(viewLifecycleOwner) { tablet ->
            Timber.d("TabletInitialMenuFragment: Current tablet updated: ${tablet?.id}")
            tablet?.let {
                bindTabletCard(tablet)
                bindDeviceLock(tablet)
                bindSections(tablet)
                // Fetch presence as soon as the tablet is available. This also
                // covers back-navigation (the view is recreated, so the observer
                // re-fires) — keeping the loading→result transition clean.
                tabletViewModel.loadTabletPresence()
            }
        }
        tabletViewModel.presence.observe(viewLifecycleOwner) { state ->
            bindPresence(state)
        }
    }

    /**
     * Refresh the connection-status pill each time the screen appears (mirrors
     * the iOS `onAppear` fetch). The backend caches presence ~5 min, so this is
     * cheap to call on every resume.
     */
    override fun onResume() {
        super.onResume()
        tabletViewModel.loadTabletPresence()
        // Re-pull the tablet so edits made on child screens (kid profile photo /
        // name / birthday, which write to a separate KidProfileViewModel) are
        // reflected here on back-navigation instead of staying stale.
        tabletViewModel.refreshCurrentTablet()
    }

    private fun setupToolbar() {
        Timber.d("TabletInitialMenuFragment: Setting up toolbar")
        (activity as AppCompatActivity).setSupportActionBar(binding.toolbar)
        val actionbar = (activity as AppCompatActivity).supportActionBar
        actionbar.apply {
            this?.setDisplayShowTitleEnabled(false)
            this?.setDisplayHomeAsUpEnabled(true)
            this?.setDisplayShowHomeEnabled(true)
        }
        setHasOptionsMenu(true)
    }

    /**
     * Static section-header copy that doesn't depend on tablet data. Per-row
     * wiring (including the teal-tinted Dug row) lands in [bindSections]
     * because it needs the tablet's id / model.
     */
    private fun setupStaticListeners() {
        binding.sectionSafety.sectionTitle.setText(R.string.tablet_settings_section_safety)
        binding.sectionControl.sectionTitle.setText(R.string.tablet_settings_section_control)
        binding.sectionMonitoring.sectionTitle.setText(R.string.tablet_settings_section_monitoring)
        binding.sectionAccount.sectionTitle.setText(R.string.tablet_settings_section_account)
    }

    private fun bindTabletCard(tablet: Tablet) {
        Timber.d("TabletInitialMenuFragment: Binding hero card for tablet ${tablet.id}")
        binding.tabletModel.text = getString(modelNameRes(tablet.model))
        binding.tabletName.text = tablet.profileName.orEmpty()
        binding.tabletId.text = getString(R.string.tablet_settings_card_id_format, tablet.objectId.orEmpty())

        val phone = tablet.phone
        if (phone.isNullOrBlank()) {
            binding.tabletPhone.visibility = View.GONE
        } else {
            binding.tabletPhone.text = getString(R.string.subscription_device_card_phone, phone)
            binding.tabletPhone.visibility = View.VISIBLE
        }

        binding.tabletProfilePicture.loadImage(
            tablet.profilePicture?.url,
            fallback = R.drawable.default_profile_pic
        )

        val openProfile = View.OnClickListener {
            Timber.d("TabletInitialMenuFragment: Profile card clicked")
            navigateById(R.id.action_tabletInitialMenuFragment_to_kidProfileEditFragment)
        }
        binding.tabletProfilePicture.setOnClickListener(openProfile)
        binding.tabletCard.setOnClickListener(openProfile)
        binding.kidProfilePictureButton.setOnClickListener(openProfile)

        binding.shareButton.setOnClickListener {
            shareInvitation(tablet)
        }
    }

    // ── Device lock (remote block) ───────────────────────────────────────

    /**
     * Reflects the current remote-block state on the lock card. Programmatic —
     * setting isChecked here does NOT fire the switch's click listener, so this
     * never re-enters [performRemoteBlock].
     */
    private fun bindDeviceLock(tablet: Tablet) {
        val locked = tablet.remoteBlocked ?: false
        binding.lockSwitch.isChecked = locked
        binding.lockStatus.setText(
            if (locked) R.string.tablet_settings_lock_status_locked
            else R.string.tablet_settings_lock_status_active
        )
    }

    /**
     * Wires the lock switch once. Uses setOnClickListener (fires on user taps
     * only, after the toggle) so programmatic binding in [bindDeviceLock] can't
     * trigger it. Locking asks for confirmation (it stops the child cold);
     * unlocking is immediate — mirroring the iOS lock chip UX.
     */
    private fun setupDeviceLockListener() {
        binding.lockSwitch.setOnClickListener {
            val desired = binding.lockSwitch.isChecked
            if (desired) {
                MaterialAlertDialogBuilder(requireContext())
                    .setTitle(R.string.tablet_settings_lock_confirm_title)
                    .setMessage(R.string.tablet_settings_lock_confirm_message)
                    .setPositiveButton(R.string.tablet_settings_lock_confirm_action) { d, _ ->
                        d.dismiss()
                        performRemoteBlock(true)
                    }
                    .setNegativeButton(R.string.tablet_settings_lock_confirm_cancel) { d, _ ->
                        d.dismiss()
                        binding.lockSwitch.isChecked = false
                    }
                    .setOnCancelListener { binding.lockSwitch.isChecked = false }
                    .show()
            } else {
                performRemoteBlock(false)
            }
        }
    }

    /**
     * Pushes the remote-block state to the backend. Optimistic with rollback:
     * the switch already shows the desired state; on error (or no internet) we
     * revert it. The lock flag is durable in Parse even if the tablet is
     * offline — the on-device worker syncs on reconnect.
     */
    private fun performRemoteBlock(lock: Boolean) {
        if (!NewNetworkStateChecker.isThereInternetConnection(requireContext())) {
            Timber.w("TabletInitialMenuFragment: remote block aborted — no internet")
            ErrorHandlers.noConnectionDialog(requireContext(), null)
            binding.lockSwitch.isChecked = !lock
            return
        }
        binding.lockSwitch.isEnabled = false
        tabletViewModel.remoteBlock(lock) { error ->
            if (view == null) return@remoteBlock
            binding.lockSwitch.isEnabled = true
            if (error != null) {
                Timber.e("TabletInitialMenuFragment: remote block failed: ${error.code}")
                binding.lockSwitch.isChecked = !lock
                ErrorHandlers.alertDialog(requireContext(), error.code.toString())
            } else {
                Timber.d("TabletInitialMenuFragment: remote block set to $lock")
                binding.lockStatus.setText(
                    if (lock) R.string.tablet_settings_lock_status_locked
                    else R.string.tablet_settings_lock_status_active
                )
                Snackbar.make(
                    binding.root,
                    if (lock) R.string.tablet_settings_lock_snackbar_locked
                    else R.string.tablet_settings_lock_snackbar_unlocked,
                    Snackbar.LENGTH_SHORT
                ).show()
            }
        }
    }

    /**
     * Renders the connection-status pill from a [TabletPresenceState]: tints the
     * dot, sets the label, and shows battery only when we have a live value.
     * Mirrors the iOS ConnectionStatus pill.
     */
    private fun bindPresence(state: TabletPresenceState) {
        val (dotColorRes, labelText) = when (state) {
            is TabletPresenceState.Loading ->
                R.color.presence_checking to getString(R.string.tablet_settings_presence_checking)
            is TabletPresenceState.Online ->
                R.color.presence_online to getString(R.string.tablet_settings_presence_online)
            is TabletPresenceState.LastSeen ->
                R.color.presence_last_seen to getString(
                    R.string.tablet_settings_presence_last_seen,
                    DateUtils.getRelativeTimeSpanString(
                        state.date.time,
                        System.currentTimeMillis(),
                        DateUtils.MINUTE_IN_MILLIS
                    )
                )
            is TabletPresenceState.Disconnected ->
                R.color.presence_disconnected to getString(R.string.tablet_settings_presence_disconnected)
            is TabletPresenceState.Unknown ->
                // We genuinely can't tell (no presence + no device signal). Show a
                // neutral, non-alarming chip rather than falsely claiming offline.
                R.color.presence_checking to getString(R.string.tablet_settings_presence_updating)
            is TabletPresenceState.NoInternet ->
                // Parent's phone is offline — flag our connectivity, not the tablet's.
                R.color.presence_checking to getString(R.string.tablet_settings_presence_no_internet)
        }

        binding.connectionStatusDot.backgroundTintList =
            ColorStateList.valueOf(ContextCompat.getColor(requireContext(), dotColorRes))
        binding.connectionStatusLabel.text = labelText

        val battery = when (state) {
            is TabletPresenceState.Online -> state.batteryPercentage
            is TabletPresenceState.LastSeen -> state.batteryPercentage
            else -> null
        }
        if (battery != null && battery > 0) {
            binding.connectionStatusBatteryIcon.setImageResource(batteryIconRes(battery))
            binding.connectionStatusBatteryIcon.visibility = View.VISIBLE
            binding.connectionStatusBattery.text = getString(R.string.item_device_battery, battery)
            binding.connectionStatusBattery.visibility = View.VISIBLE
        } else {
            binding.connectionStatusBatteryIcon.visibility = View.GONE
            binding.connectionStatusBattery.visibility = View.GONE
        }
    }

    /** Picks the battery icon by level, matching the iOS thresholds. */
    @DrawableRes
    private fun batteryIconRes(percentage: Int): Int = when {
        percentage < 10 -> R.drawable.ic_battery_0
        percentage < 35 -> R.drawable.ic_battery_25
        percentage < 65 -> R.drawable.ic_battery_50
        percentage < 90 -> R.drawable.ic_battery_75
        else -> R.drawable.ic_battery_100
    }

    private fun bindSections(tablet: Tablet) {
        Timber.d("TabletInitialMenuFragment: Binding sections for tablet ${tablet.id} (${tablet.model})")
        val isPhone = tablet.model == TabletModel.PHONE_1
        // Dug ships only on Pro and Phone hardware. Mirror the availability in
        // DugFeaturesRepository.getDugFeaturesByTabletModel so the row never
        // opens onto an empty detector screen (Lite and Uno don't ship Dug).
        val hasDug = tablet.model == TabletModel.PRO
                || tablet.model == TabletModel.PRO_EU
                || tablet.model == TabletModel.PRO_2
                || tablet.model == TabletModel.PHONE_1

        // ── SAFETY ───────────────────────────────────────────────────────
        val safetyRows = mutableListOf<RowBinding>()
        // Dug leads the Safety group as a standard row, but with a teal icon
        // tile so it stands out as the flagship protection feature.
        if (hasDug) {
            safetyRows += RowBinding(binding.rowDug) {
                icon(R.drawable.settings_feature_dug)
                title(R.string.tablet_settings_dug_title)
                tileColor(R.color.colorSecondary)
                navTo(R.id.action_tabletInitialMenuFragment_to_tabletFragmentDugUnified)
            }
        } else {
            binding.rowDug.rowContainer.visibility = View.GONE
        }
        if (isPhone) {
            safetyRows += RowBinding(binding.rowContacts) {
                icon(R.drawable.settings_feature_contacts)
                title(R.string.settings_fragment_contacts_title)
                onClick {
                    val intent = Intent(requireContext(), ContactsActivity::class.java).apply {
                        putExtra("tabletId", tablet.objectId)
                    }
                    startActivity(intent)
                }
            }
            safetyRows += RowBinding(binding.rowLocationHistory) {
                icon(R.drawable.settings_feature_location_history)
                title(R.string.settings_fragment_location_history_title)
                onClick {
                    val intent = Intent(requireContext(), LocationHistoryActivity::class.java).apply {
                        putExtra("tabletId", tablet.objectId)
                    }
                    startActivity(intent)
                }
            }
        } else {
            binding.rowContacts.rowContainer.visibility = View.GONE
            binding.rowLocationHistory.rowContainer.visibility = View.GONE
        }
        safetyRows += RowBinding(binding.rowSafety) {
            icon(R.drawable.settings_feature_safety)
            title(R.string.settings_fragment_initial_safety_title)
            navTo(R.id.action_tabletInitialMenuFragment_to_tabletSafetyFragment)
        }
        // Safe walking relies on phone-only sensors/telemetry, so it's shown
        // on the MomoPhone only.
        if (isPhone) {
            safetyRows += RowBinding(binding.rowSafeWalking) {
                icon(R.drawable.ic_safe_walking_detection_momo)
                title(R.string.safe_walking_detection_title)
                navTo(R.id.action_tabletInitialMenuFragment_to_safeWalkingFragment)
            }
        } else {
            binding.rowSafeWalking.rowContainer.visibility = View.GONE
        }
        toggleLastRowDivider(safetyRows)

        // ── CONTROL ──────────────────────────────────────────────────────
        val controlRows = mutableListOf<RowBinding>()
        controlRows += RowBinding(binding.rowAppsManagement) {
            icon(R.drawable.settings_feature_apps)
            title(R.string.settings_fragment_initial_apps_title)
            navTo(R.id.action_tabletInitialMenuFragment_to_tabletFragmentAppsMain)
        }
        // Schedules — flattened from the former Times submenu into direct rows.
        controlRows += RowBinding(binding.rowUseLimit) {
            icon(R.drawable.settings_use_limit_image)
            title(R.string.card_use_limit_title)
            navTo(R.id.action_tabletInitialMenuFragment_to_tabletTimeUseLimitFragment)
        }
        controlRows += RowBinding(binding.rowSchoolMode) {
            icon(R.drawable.settings_school_mode_image)
            title(R.string.card_school_mode_title)
            navTo(R.id.action_tabletInitialMenuFragment_to_tabletTimeSchoolModeFragment)
        }
        controlRows += RowBinding(binding.rowUseRange) {
            icon(R.drawable.settings_use_range_image)
            title(R.string.card_use_range_title)
            navTo(R.id.action_tabletInitialMenuFragment_to_tabletTimeUseRangeFragment)
        }
        // Blocks — flattened from the former Blocks submenu into direct rows.
        controlRows += RowBinding(binding.rowWebBlock) {
            icon(R.drawable.settings_blocks_web)
            title(R.string.card_web_block_title)
            navTo(R.id.action_tabletInitialMenuFragment_to_tabletBlockWebFragment)
        }
        controlRows += RowBinding(binding.rowPaymentsBlock) {
            icon(R.drawable.settings_blocks_payments)
            title(R.string.card_payments_block_title)
            navTo(R.id.action_tabletInitialMenuFragment_to_tabletBlockPaymentsFragment)
        }
        // Remote block ("Device lock") is now the prominent toggle on the hero
        // card (see bindDeviceLock), so the dedicated row was removed here.
        controlRows += RowBinding(binding.rowAdsBlock) {
            icon(R.drawable.settings_blocks_ads)
            title(R.string.card_ads_block_title)
            navTo(R.id.action_tabletInitialMenuFragment_to_tabletBlockAdsFragment)
        }
        toggleLastRowDivider(controlRows)

        // ── MONITORING ──────────────────────────────────────────────────
        val monitoringRows = mutableListOf<RowBinding>()
        monitoringRows += RowBinding(binding.rowRemoteScreenshots) {
            icon(R.drawable.settings_feature_remote_capture)
            title(R.string.settings_fragment_initial_remote_capture_title)
            navTo(R.id.action_tabletInitialMenuFragment_to_tabletRemoteScreenshotFragment)
        }
        monitoringRows += RowBinding(binding.rowAppStats) {
            icon(R.drawable.settings_feature_stats)
            title(R.string.settings_fragment_initial_stats_title)
            navTo(R.id.action_tabletInitialMenuFragment_to_tabletStatsFragment)
        }
        toggleLastRowDivider(monitoringRows)

        // ── ACCOUNT ─────────────────────────────────────────────────────
        val accountRows = mutableListOf<RowBinding>()
        accountRows += RowBinding(binding.rowLinkDevice) {
            icon(R.drawable.settings_link_device)
            title(R.string.link_app_title)
            navTo(R.id.action_tabletInitialMenuFragment_to_linkDeviceFragment)
        }
        toggleLastRowDivider(accountRows)
    }

    /**
     * Tiny builder that wires a single row's icon + title + click handler
     * via the include's generated binding. Lets the section composition
     * read top-down without hand-wiring four properties per row.
     */
    private inner class RowBinding(val row: ItemTabletSettingRowBinding, init: RowBinding.() -> Unit) {
        init {
            init()
            row.rowContainer.visibility = View.VISIBLE
        }

        fun icon(@DrawableRes res: Int) {
            row.rowIcon.setImageResource(res)
        }

        fun title(@StringRes res: Int) {
            row.rowTitle.setText(res)
        }

        /** Overrides the icon-tile background. Used to give the Dug row its
         *  distinctive teal tint while keeping the standard row pattern. */
        fun tileColor(@ColorRes res: Int) {
            row.rowIconTile.setCardBackgroundColor(
                ContextCompat.getColor(row.rowIconTile.context, res)
            )
        }

        fun navTo(@IdRes actionId: Int) {
            row.rowContainer.setOnClickListener { navigateById(actionId) }
        }

        fun onClick(handler: () -> Unit) {
            row.rowContainer.setOnClickListener { handler() }
        }
    }

    /** Hides the hairline divider on the last visible row of a section so the
     *  bottom of the section card reads cleanly. */
    private fun toggleLastRowDivider(rows: List<RowBinding>) {
        val visible = rows.filter { it.row.rowContainer.visibility == View.VISIBLE }
        visible.forEachIndexed { index, row ->
            row.row.rowDivider.visibility = if (index == visible.lastIndex) View.GONE else View.VISIBLE
        }
    }

    private fun modelNameRes(model: TabletModel?): Int = when (model) {
        TabletModel.LITE -> R.string.lite_model_name
        TabletModel.LITE_2 -> R.string.lite_2_model_name
        TabletModel.LITE_3 -> R.string.lite_3_model_name
        TabletModel.PRO, TabletModel.PRO_EU -> R.string.pro_model_name
        TabletModel.PRO_2 -> R.string.pro_2_model_name
        TabletModel.PHONE_1 -> R.string.momophone_1_model_name
        TabletModel.UNO -> R.string.uno_model_name
        else -> R.string.unknown_model_name
    }

    /**
     * Fires the system share sheet with a localized invitation text that
     * embeds the universal-link-shaped invitation URL:
     *   https://soymomo.com/link/tablet/<objectId>
     *
     * Renders as a real clickable link in WhatsApp / iMessage / Mail.
     * Recipients with the SoyMomo Tablet Padres app installed are taken
     * to the receiver-side "add tablet" flow with the id pre-filled; others
     * land on the soymomo.com landing page that walks them through the
     * App Store / Play Store fallback.
     */
    private fun shareInvitation(tablet: Tablet) {
        val objectId = tablet.objectId.orEmpty()
        if (objectId.isBlank()) {
            Timber.w("TabletInitialMenuFragment: shareInvitation - tablet has no objectId")
            return
        }
        val message = getString(R.string.tablet_settings_share_invitation_template, objectId)
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_TEXT, message)
        }
        startActivity(Intent.createChooser(intent, getString(R.string.tablet_settings_share_chooser_title)))
    }

    private fun navigateById(id: Int) {
        Timber.d("TabletInitialMenuFragment: Navigating to destination $id")
        findNavController().navigate(id)
    }

    private fun goToMainActivity() {
        Timber.d("TabletInitialMenuFragment: Navigating to main activity")
        val intent = Intent(this.activity, MainActivity::class.java)
        startActivity(intent)
    }
}
