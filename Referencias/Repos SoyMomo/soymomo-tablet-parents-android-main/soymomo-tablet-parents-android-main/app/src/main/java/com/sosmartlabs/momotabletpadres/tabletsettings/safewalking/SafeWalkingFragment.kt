package com.sosmartlabs.momotabletpadres.tabletsettings.safewalking

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.fragment.app.viewModels
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.core.common.safewalking.model.NotificationType
import com.sosmartlabs.momotabletpadres.core.common.safewalking.model.SafeWalkingSettings
import com.sosmartlabs.momotabletpadres.core.common.utils.SafeWalkingHelper
import com.sosmartlabs.momotabletpadres.databinding.SettingsFragmentSafeWalkingDetectionBinding
import com.sosmartlabs.momotabletpadres.tablet.TabletViewModel
import com.sosmartlabs.momotabletpadres.utils.WindowInsetsUtils
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import com.sosmartlabs.momotabletpadres.viewmodels.SafeWalkingViewModel
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber

@AndroidEntryPoint
class SafeWalkingFragment : Fragment() {

    private lateinit var binding: SettingsFragmentSafeWalkingDetectionBinding

    private val viewModel: SafeWalkingViewModel by viewModels()
    private val tabletViewModel: TabletViewModel by activityViewModels()

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View {
        Timber.d("SafeWalkingFragment: onCreateView - inflating layout")
        binding = SettingsFragmentSafeWalkingDetectionBinding.inflate(inflater, container, false)
        setupToolbar()
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        Timber.d("SafeWalkingFragment: onViewCreated - view created, setting up listeners and observers")
        super.onViewCreated(view, savedInstanceState)
        WindowInsetsUtils.applyEdgeToEdgeInsets(
            root = binding.root,
            topView = binding.appBarLayout,
            bottomView = binding.contentScrollView
        )
        setupListeners()
        observeData()
    }

    private fun setupToolbar() {
        Timber.d("SafeWalkingFragment: setupToolbar - configuring toolbar")
        (activity as? AppCompatActivity)?.apply {
            setSupportActionBar(binding.toolbar)
            supportActionBar?.apply {
                setDisplayShowTitleEnabled(false)
                setDisplayHomeAsUpEnabled(true)
                setDisplayShowHomeEnabled(true)
            }
            Timber.d("SafeWalkingFragment: setupToolbar - toolbar configured successfully")
        } ?: run {
            Timber.e("SafeWalkingFragment: setupToolbar - Activity is not AppCompatActivity")
            CrashlyticsLog.recordNonFatalError(
                IllegalStateException("Activity is not AppCompatActivity"),
                "SafeWalkingFragment: setupToolbar failed"
            )
        }
        setHasOptionsMenu(true)
    }

    private fun setupListeners() = with(binding) {
        Timber.d("SafeWalkingFragment: setupListeners - setting up switches and notification type listeners")
        safeWalkSwitch.setOnCheckedChangeListener { _, state ->
            Timber.d("SafeWalkingFragment: safeWalkSwitch changed to $state")
            onSafeWalkCheckedChanged(state)
        }
        safeWalkEnabledContent.safeWalkSoundSwitch.setOnCheckedChangeListener { _, state ->
            Timber.d("SafeWalkingFragment: safeWalkSoundSwitch changed to $state")
            onSoundCheckedChanged(state)
        }
        safeWalkEnabledContent.safeWalkVibrationSwitch.setOnCheckedChangeListener { _, state ->
            Timber.d("SafeWalkingFragment: safeWalkVibrationSwitch changed to $state")
            onVibrationCheckedChanged(state)
        }

        safeWalkEnabledContent.bannerNotificationLayout.setOnClickListener {
            Timber.d("SafeWalkingFragment: bannerNotificationLayout clicked")
            onNotificationTypeChanged(it.id)
        }
        safeWalkEnabledContent.windowNotificationLayout.setOnClickListener {
            Timber.d("SafeWalkingFragment: windowNotificationLayout clicked")
            onNotificationTypeChanged(it.id)
        }
        safeWalkEnabledContent.fullScreenNotificationLayout.setOnClickListener {
            Timber.d("SafeWalkingFragment: fullScreenNotificationLayout clicked")
            onNotificationTypeChanged(it.id)
        }
    }

    private fun observeData() {
        Timber.d("SafeWalkingFragment: observeData - observing tablet and safeWalkingSettings LiveData")
        tabletViewModel.tablet.observe(viewLifecycleOwner) { tablet ->
            Timber.d("SafeWalkingFragment: tablet LiveData changed, loading settings for tablet: ${tablet.id}")
            try {
                viewModel.loadSettings(tablet)
            } catch (e: Exception) {
                Timber.e(e, "SafeWalkingFragment: Failed to load settings for tablet: ${tablet.id}")
                CrashlyticsLog.recordNonFatalError(e, "SafeWalkingFragment: Failed to load settings for tablet: ${tablet.id}")
            }
        }

        viewModel.safeWalkingSettings.observe(viewLifecycleOwner) { settings ->
            Timber.d("SafeWalkingFragment: safeWalkingSettings LiveData changed, updating data views")
            try {
                updateDataViews(settings)
            } catch (e: Exception) {
                Timber.e(e, "SafeWalkingFragment: Failed to update data views for settings: $settings")
                CrashlyticsLog.recordNonFatalError(e, "SafeWalkingFragment: Failed to update data views for settings: $settings")
            }
        }
    }

    private fun onSafeWalkCheckedChanged(checked: Boolean) = with(binding) {
        Timber.d("SafeWalkingFragment: onSafeWalkCheckedChanged - checked: $checked")
        safeWalkDisabledContent.root.visibility = if (checked) View.GONE else View.VISIBLE
        safeWalkEnabledContent.root.visibility = if (checked) View.VISIBLE else View.GONE

        val current = viewModel.safeWalkingSettings.value
        if (current == null) {
            Timber.w("SafeWalkingFragment: onSafeWalkCheckedChanged - safeWalkingSettings is null")
            CrashlyticsLog.log("SafeWalkingFragment: onSafeWalkCheckedChanged - safeWalkingSettings is null")
            return@with
        }
        if (current.isEnabled != checked) {
            val tablet = tabletViewModel.tablet.value
            if (tablet == null) {
                Timber.e("SafeWalkingFragment: onSafeWalkCheckedChanged - tablet is null")
                CrashlyticsLog.log("SafeWalkingFragment: onSafeWalkCheckedChanged - tablet is null")
                return@with
            }
            Timber.d("SafeWalkingFragment: onSafeWalkCheckedChanged - updating isEnabled to $checked for tablet: ${tablet.id}")
            viewModel.setIsEnabled(tablet, checked)
        }
    }

    private fun onSoundCheckedChanged(checked: Boolean) {
        Timber.d("SafeWalkingFragment: onSoundCheckedChanged - checked: $checked")
        val current = viewModel.safeWalkingSettings.value
        if (current == null) {
            Timber.w("SafeWalkingFragment: onSoundCheckedChanged - safeWalkingSettings is null")
            CrashlyticsLog.log("SafeWalkingFragment: onSoundCheckedChanged - safeWalkingSettings is null")
            return
        }
        if (current.isSoundEnabled != checked) {
            val tablet = tabletViewModel.tablet.value
            if (tablet == null) {
                Timber.e("SafeWalkingFragment: onSoundCheckedChanged - tablet is null")
                CrashlyticsLog.log("SafeWalkingFragment: onSoundCheckedChanged - tablet is null")
                return
            }
            Timber.d("SafeWalkingFragment: onSoundCheckedChanged - updating isSoundEnabled to $checked for tablet: ${tablet.id}")
            viewModel.setIsSoundEnabled(tablet, checked)
        }
    }

    private fun onVibrationCheckedChanged(checked: Boolean) {
        Timber.d("SafeWalkingFragment: onVibrationCheckedChanged - checked: $checked")
        val current = viewModel.safeWalkingSettings.value
        if (current == null) {
            Timber.w("SafeWalkingFragment: onVibrationCheckedChanged - safeWalkingSettings is null")
            CrashlyticsLog.log("SafeWalkingFragment: onVibrationCheckedChanged - safeWalkingSettings is null")
            return
        }
        if (current.isVibrationEnabled != checked) {
            val tablet = tabletViewModel.tablet.value
            if (tablet == null) {
                Timber.e("SafeWalkingFragment: onVibrationCheckedChanged - tablet is null")
                CrashlyticsLog.log("SafeWalkingFragment: onVibrationCheckedChanged - tablet is null")
                return
            }
            Timber.d("SafeWalkingFragment: onVibrationCheckedChanged - updating isVibrationEnabled to $checked for tablet: ${tablet.id}")
            viewModel.setIsVibrationEnabled(tablet, checked)
        }
    }

    private fun onNotificationTypeChanged(viewId: Int) = with(binding) {
        Timber.d("SafeWalkingFragment: onNotificationTypeChanged - viewId=$viewId")
        when (viewId) {
            safeWalkEnabledContent.bannerNotificationLayout.id -> {
                Timber.d("SafeWalkingFragment: onNotificationTypeChanged - banner selected")
                setBannerNotificationType()
            }
            safeWalkEnabledContent.windowNotificationLayout.id -> {
                Timber.d("SafeWalkingFragment: onNotificationTypeChanged - window selected")
                setWindowNotificationType()
            }
            safeWalkEnabledContent.fullScreenNotificationLayout.id -> {
                Timber.d("SafeWalkingFragment: onNotificationTypeChanged - full screen selected")
                setFullScreenNotificationType()
            }
            else -> {
                Timber.w("SafeWalkingFragment: onNotificationTypeChanged - Unknown notification layout clicked: $viewId")
                CrashlyticsLog.log("SafeWalkingFragment: onNotificationTypeChanged - Unknown notification layout clicked: $viewId")
            }
        }
    }

    private fun setBannerNotificationType() {
        Timber.d("SafeWalkingFragment: setBannerNotificationType - selecting BANNER")
        styleSelectedChip(NotificationType.BANNER)
        pushTypeIfChanged(NotificationType.BANNER)
    }

    private fun setWindowNotificationType() {
        Timber.d("SafeWalkingFragment: setWindowNotificationType - selecting WINDOW")
        styleSelectedChip(NotificationType.WINDOW)
        pushTypeIfChanged(NotificationType.WINDOW)
    }

    private fun setFullScreenNotificationType() {
        Timber.d("SafeWalkingFragment: setFullScreenNotificationType - selecting FULL_SCREEN")
        styleSelectedChip(NotificationType.FULL_SCREEN)
        pushTypeIfChanged(NotificationType.FULL_SCREEN)
    }

    private fun styleSelectedChip(type: NotificationType) = with(binding.safeWalkEnabledContent) {
        Timber.d("SafeWalkingFragment: styleSelectedChip - styling chip for type: $type")
        val primary = ContextCompat.getColor(requireContext(), R.color.momoNewColorPrimary)
        val white   = ContextCompat.getColor(requireContext(), R.color.white)

        fun style(text: View, selected: Boolean) {
            text.setBackgroundResource(
                if (selected) R.drawable.chip_selected_option else 0
            )
            (text as? android.widget.TextView)?.setTextColor(
                if (selected) white else primary
            )
        }

        style(bannerNotificationText, type == NotificationType.BANNER)
        style(windowNotificationText, type == NotificationType.WINDOW)
        style(fullScreenNotificationText, type == NotificationType.FULL_SCREEN)
    }

    private fun pushTypeIfChanged(type: NotificationType) {
        Timber.d("SafeWalkingFragment: pushTypeIfChanged - type: $type")
        val current = viewModel.safeWalkingSettings.value
        if (current == null) {
            Timber.w("SafeWalkingFragment: pushTypeIfChanged - safeWalkingSettings is null")
            CrashlyticsLog.log("SafeWalkingFragment: pushTypeIfChanged - safeWalkingSettings is null")
            return
        }
        val id = SafeWalkingHelper.fromNotificationType(type)
        if (current.notificationType != id) {
            val tablet = tabletViewModel.tablet.value
            if (tablet == null) {
                Timber.e("SafeWalkingFragment: pushTypeIfChanged - tablet is null")
                CrashlyticsLog.log("SafeWalkingFragment: pushTypeIfChanged - tablet is null")
                return
            }
            Timber.d("SafeWalkingFragment: pushTypeIfChanged - updating notificationType to $id for tablet: ${tablet.id}")
            viewModel.setNotificationType(tablet, id)
        }
    }

    private fun updateDataViews(settings: SafeWalkingSettings) = with(binding) {
        Timber.d("SafeWalkingFragment: updateDataViews - updating UI with settings: $settings")

        safeWalkSwitch.isChecked = settings.isEnabled
        safeWalkSwitchText.text = getString(
            if (settings.isEnabled)
                R.string.safe_walking_detection_enabled
            else
                R.string.safe_walking_detection_disabled
        )

        safeWalkEnabledContent.root.visibility = if (settings.isEnabled) View.VISIBLE else View.GONE
        safeWalkDisabledContent.root.visibility = if (settings.isEnabled) View.GONE else View.VISIBLE

        if (settings.isEnabled) {
            safeWalkEnabledContent.safeWalkSoundSwitch.isChecked     = settings.isSoundEnabled
            safeWalkEnabledContent.safeWalkVibrationSwitch.isChecked = settings.isVibrationEnabled
            when (settings.notificationType) {
                1 -> {
                    Timber.d("SafeWalkingFragment: updateDataViews - notificationType is BANNER")
                    setBannerNotificationType()
                }
                2 -> {
                    Timber.d("SafeWalkingFragment: updateDataViews - notificationType is WINDOW")
                    setWindowNotificationType()
                }
                3 -> {
                    Timber.d("SafeWalkingFragment: updateDataViews - notificationType is FULL_SCREEN")
                    setFullScreenNotificationType()
                }
                else -> {
                    Timber.w("SafeWalkingFragment: updateDataViews - Unknown notificationType: ${settings.notificationType}")
                    CrashlyticsLog.log("SafeWalkingFragment: updateDataViews - Unknown notificationType: ${settings.notificationType}")
                }
            }
        }

        viewFlipperSafeWalking.displayedChild = 1
        Timber.d("SafeWalkingFragment: updateDataViews - UI update complete")
    }
}