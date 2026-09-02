package com.sosmartlabs.momotabletpadres.tabletsettings.appprotection.ui

import android.app.Dialog
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.os.Build
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.content.res.ResourcesCompat
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import com.sosmartlabs.momotabletpadres.GlobalConstants.Companion.INSTALLED_APP_PACKAGE_NAME_ARG
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.core.settings.dug.common.SettingsConstants.TABLET_OBJECT_EXTRA
import com.sosmartlabs.momotabletpadres.databinding.DialogTimeLimitAppBinding
import com.sosmartlabs.momotabletpadres.databinding.SettingsCardAppsDetailPhoneBinding
import com.sosmartlabs.momotabletpadres.databinding.TabletFragmentAppsDetailBinding
import com.sosmartlabs.momotabletpadres.glide.loadAppIcon
import com.sosmartlabs.momotabletpadres.tabletsettings.appprotection.model.installedapp.InstalledAppEntity
import com.sosmartlabs.momotabletpadres.utils.GooglePlayLauncher
import com.sosmartlabs.momotabletpadres.utils.WindowInsetsUtils
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import com.sosmartlabs.momotabletpadres.viewmodels.AppProtectionViewModel
import com.sosmartlabs.momotabletpadres.tablet.TabletViewModel
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber
import java.util.Locale

@AndroidEntryPoint
class TabletAppsDetailFragment : Fragment() {

    lateinit var binding: TabletFragmentAppsDetailBinding
    private lateinit var variableCard: SettingsCardAppsDetailPhoneBinding

    private val appProtectionViewModel: AppProtectionViewModel by activityViewModels()
    val tabletViewModel: TabletViewModel by activityViewModels()

    lateinit var tablet: Tablet

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        Timber.d("TabletAppsDetailFragment: onCreateView - Inflating view and initializing bindings")
        binding = TabletFragmentAppsDetailBinding.inflate(inflater, container, false)
        setupToolbar()
        variableCard = binding.variableCard
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Timber.d("TabletAppsDetailFragment: onViewCreated - View created, initializing notification arguments and observers")
        WindowInsetsUtils.applyEdgeToEdgeInsets(
            root = binding.root,
            topView = binding.appBarLayout,
            bottomView = binding.contentScrollView
        )
        manageNotificationArguments(arguments)
        observeViewModel()
    }

    private fun setupToolbar() {
        Timber.d("TabletAppsDetailFragment: Setting up toolbar")
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

    private fun manageNotificationArguments(args: Bundle?) {
        Timber.d("TabletAppsDetailFragment: manageNotificationArguments - Checking notification arguments")
        if (args == null) {
            Timber.w("TabletAppsDetailFragment: manageNotificationArguments - Arguments bundle is null")
            return
        }
        val packageName = args.getString(INSTALLED_APP_PACKAGE_NAME_ARG)
        val tablet: Tablet? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            args.getParcelable(TABLET_OBJECT_EXTRA, Tablet::class.java)
        } else {
            @Suppress("DEPRECATION")
            args.getParcelable(TABLET_OBJECT_EXTRA)
        }
        if (tablet == null || packageName == null) {
            Timber.e("TabletAppsDetailFragment: manageNotificationArguments - Tablet or packageName is null (tablet=$tablet, packageName=$packageName)")
            CrashlyticsLog.log("TabletAppsDetailFragment: manageNotificationArguments - Tablet or packageName is null (tablet=$tablet, packageName=$packageName)")
            return
        }
        Timber.d("TabletAppsDetailFragment: manageNotificationArguments - Fetching installed app for tabletId=${tablet.id}, packageName=$packageName")
        appProtectionViewModel.fetchInstalledApp(tablet, packageName)
    }

    fun observeViewModel() {
        Timber.d("TabletAppsDetailFragment: observeViewModel - Setting up ViewModel observers")
        tabletViewModel.tablet.observe(viewLifecycleOwner) { tablet ->
            Timber.d("TabletAppsDetailFragment: observeViewModel - Tablet updated (ID: ${tablet.id})")
            this.tablet = tablet
        }

        appProtectionViewModel.selectedInstalledApp.observe(viewLifecycleOwner) { app ->
            Timber.d("TabletAppsDetailFragment: observeViewModel - Selected app updated (Name: ${app.appName}, Package: ${app.packageName})")
            updateAppUI(app)
        }
    }

    private fun updateAppUI(app: InstalledAppEntity) {
        Timber.d("TabletAppsDetailFragment: updateAppUI - Updating UI for app (Name: ${app.appName}, Package: ${app.packageName})")
        with(variableCard) {
            Timber.v("TabletAppsDetailFragment: updateAppUI - Loading app icon for ${app.appName}")
            binding.headerImage.loadAppIcon(app.iconImageUrl, app.appName)

            binding.headerTitle.text = app.appName

            if (app.allowed) {
                Timber.d("TabletAppsDetailFragment: updateAppUI - App is allowed, showing allowed UI state")
                allowedApps()
            } else {
                Timber.d("TabletAppsDetailFragment: updateAppUI - App is blocked, showing blocked UI state")
                blockedApps()
            }

            appStatusSwitch.setOnClickListener {
                Timber.d("TabletAppsDetailFragment: updateAppUI - App status switch clicked for ${app.appName} (allowed=${app.allowed})")
                if (app.allowed) {
                    blockApp(app)
                } else {
                    allowApp(app)
                }
            }

            setAgeRate(app)

            binding.variableCard.description.text =
                app.llmDescription?.get(Locale.getDefault().language)
                    ?: getString(R.string.default_app_description)

            binding.variableCard.potentialDangers.text =
                app.potentialDangers?.get(Locale.getDefault().language)
                    ?: getString(R.string.default_potential_dangers)

            googlePlay.setOnClickListener {
                Timber.d("TabletAppsDetailFragment: updateAppUI - Google Play button clicked for ${app.packageName}")
                toGooglePlay(app.packageName)
            }

            setTimeLimitButton(app)
            timeLimit.setOnClickListener {
                Timber.d("TabletAppsDetailFragment: updateAppUI - Time limit button clicked for ${app.appName}")
                limitTimeDialog(app)
            }
        }
    }

    private fun allowApp(app: InstalledAppEntity) {
        Timber.d("TabletAppsDetailFragment: allowApp - Allowing app ${app.appName}")
        appProtectionViewModel.allowApp(app)
        allowedApps()
    }

    fun allowedApps() {
        Timber.d("TabletAppsDetailFragment: allowedApps - Updating UI for allowed app state")
        variableCard.appStatusLabel.text = getString(R.string.app_allowed_text)
        variableCard.lockIcon.setImageDrawable(ContextCompat.getDrawable(requireContext(), R.drawable.settings_blocks_lock_open))
        variableCard.appStatusSwitch.isChecked = true
    }

    private fun blockedApps() {
        Timber.d("TabletAppsDetailFragment: blockedApps - Updating UI for blocked app state")
        variableCard.appStatusLabel.text = getString(R.string.app_blocked_text)
        variableCard.lockIcon.setImageDrawable(ContextCompat.getDrawable(requireContext(), R.drawable.settings_blocks_lock_close))
        variableCard.appStatusSwitch.isChecked = false
    }

    private fun setTimeLimitButton(app: InstalledAppEntity) {
        Timber.d("TabletAppsDetailFragment: setTimeLimitButton - Setting time limit button for ${app.appName}, current limit: ${app.limit}")
        if (app.limit == 0) {
            variableCard.timeLimitText.text = getString(R.string.settings_app_add_limit)
            variableCard.timeLimitText.setTextColor(ResourcesCompat.getColor(resources, R.color.colorPrimary, null))
            variableCard.timeLimitAdd.setImageDrawable(ResourcesCompat.getDrawable(resources, R.drawable.ic_add_time_limit, null))
            variableCard.timeLimit.strokeColor = ResourcesCompat.getColor(resources, R.color.colorPrimary, null)
            variableCard.timeLimitIcon.imageTintList = ResourcesCompat.getColorStateList(resources, R.color.colorPrimary, null)
        } else {
            variableCard.timeLimitText.text = getString(R.string.settings_app_time_limit)
            variableCard.timeLimitText.setTextColor(ResourcesCompat.getColor(resources, R.color.colorChipVerySerious, null))
            variableCard.timeLimitAdd.setImageDrawable(ResourcesCompat.getDrawable(resources, R.drawable.detail_arrow_right_red, null))
            variableCard.timeLimit.strokeColor = ResourcesCompat.getColor(resources, R.color.colorChipVerySerious, null)
            variableCard.timeLimitIcon.imageTintList = ResourcesCompat.getColorStateList(resources, R.color.colorChipVerySerious, null)
        }
    }

    private fun setAgeRate(app: InstalledAppEntity) {
        Timber.d("TabletAppsDetailFragment: setAgeRate - Setting age rating for ${app.appName}, rating: ${app.contentRating}")
        if (app.contentRating == null) {
            variableCard.recommendedAge.text = "?+"
            Timber.w("TabletAppsDetailFragment: setAgeRate - No content rating for ${app.appName}")
        } else {
            variableCard.recommendedAge.text = app.contentRating
        }
    }

    private fun toGooglePlay(packageName: String) {
        Timber.d("TabletAppsDetailFragment: toGooglePlay - Opening Google Play for package $packageName")
        GooglePlayLauncher.launchGooglePlayListingPage(requireContext(), packageName)
    }

    private fun blockApp(app: InstalledAppEntity) {
        Timber.d("TabletAppsDetailFragment: blockApp - Blocking app ${app.appName}")
        appProtectionViewModel.blockApp(app)
        blockedApps()
    }

    private fun setAppTimeLimit(app: InstalledAppEntity, limit: Int) {
        Timber.d("TabletAppsDetailFragment: setAppTimeLimit - Setting time limit of $limit seconds for ${app.appName}")
        appProtectionViewModel.setAppTimeLimit(app, limit)
    }

    private fun removeAppTimeLimit(app: InstalledAppEntity) {
        Timber.d("TabletAppsDetailFragment: removeAppTimeLimit - Removing time limit for ${app.appName}")
        appProtectionViewModel.removeAppTimeLimit(app)
    }

    private fun limitTimeDialog(app: InstalledAppEntity) {
        Timber.d("TabletAppsDetailFragment: limitTimeDialog - Showing time limit dialog for ${app.appName}")
        val myDialog = Dialog(requireContext())
        val dialogBinding = DialogTimeLimitAppBinding.inflate(layoutInflater)
        myDialog.setContentView(dialogBinding.root)
        myDialog.window?.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))

        dialogBinding.hoursPicker.maxValue = 23
        dialogBinding.hoursPicker.minValue = 0
        dialogBinding.hoursPicker.value = (app.limit) / 3600

        dialogBinding.minutesPicker.maxValue = 59
        dialogBinding.minutesPicker.minValue = 0
        dialogBinding.minutesPicker.value = ((app.limit) % 3600) / 60

        with(dialogBinding) {
            buttonCancel.setOnClickListener {
                Timber.d("TabletAppsDetailFragment: limitTimeDialog - Canceling time limit for ${app.appName}")
                removeAppTimeLimit(app)
                myDialog.dismiss()
            }

            buttonSave.setOnClickListener {
                val limit = dialogBinding.hoursPicker.value * 3600 + dialogBinding.minutesPicker.value * 60
                Timber.d("TabletAppsDetailFragment: limitTimeDialog - Saving time limit of $limit seconds for ${app.appName}")
                setAppTimeLimit(app, limit)
                myDialog.dismiss()
            }
        }

        myDialog.show()
    }
}