package com.sosmartlabs.momo.watchsettings.ui.dialogs

import android.app.Dialog
import android.content.Context
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import androidx.core.os.BundleCompat
import androidx.fragment.app.DialogFragment
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.DialogSoundBinding
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.models.WatchSettings

class SoundDialogFragment : DialogFragment() {

    interface SoundDialogListener {
        fun onSoundModeChanged(settings: WatchSettings)
        fun onSoundDialogCanceled()
    }

    private lateinit var listener: SoundDialogListener
    private lateinit var watch: Wearer
    private lateinit var settings: WatchSettings

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val args = requireArguments()
        watch = requireNotNull(
            BundleCompat.getParcelable(args, ARG_WATCH, Wearer::class.java)
        ) { "SoundDialogFragment requires a Wearer." }
        settings = requireNotNull(
            BundleCompat.getParcelable(args, ARG_SETTINGS, WatchSettings::class.java)
        ) { "SoundDialogFragment requires WatchSettings." }
    }

    override fun onCreateDialog(savedInstanceState: Bundle?): Dialog {
        val materialContext = MaterialAlertDialogBuilder(requireContext()).context
        val binding = DialogSoundBinding.inflate(LayoutInflater.from(materialContext))

        if (!watch.model.hasVibration()) {
            binding.radioButtonSoundVibrate.visibility = View.GONE
            binding.radioButtonVibrate.visibility = View.GONE
        }

        val currentMode = if (settings.has("soundMode")) settings.getInt("soundMode") else 1
        when (currentMode) {
            1 -> binding.radioGroup.check(R.id.radio_button_sound_vibrate)
            2 -> binding.radioGroup.check(R.id.radio_button_sound)
            3 -> binding.radioGroup.check(R.id.radio_button_vibrate)
            4 -> binding.radioGroup.check(R.id.radio_button_silence)
        }

        return MaterialAlertDialogBuilder(requireContext())
            .setTitle(R.string.dialog_sound_title)
            .setView(binding.root)
            .setPositiveButton(R.string.button_save) { _, _ ->
                when (binding.radioGroup.checkedRadioButtonId) {
                    R.id.radio_button_sound_vibrate -> settings.put("soundMode", 1)
                    R.id.radio_button_sound -> settings.put("soundMode", 2)
                    R.id.radio_button_vibrate -> settings.put("soundMode", 3)
                    R.id.radio_button_silence -> settings.put("soundMode", 4)
                }
                listener.onSoundModeChanged(settings)
            }
            .setNegativeButton(R.string.button_cancel) { _, _ -> listener.onSoundDialogCanceled() }
            .create()
    }

    override fun onAttach(context: Context) {
        super.onAttach(context)
        listener = context as? SoundDialogListener
            ?: throw ClassCastException("$context must implement SoundDialogListener")
    }

    companion object {
        private const val ARG_WATCH = "arg_watch"
        private const val ARG_SETTINGS = "arg_settings"

        fun newInstance(watch: Wearer, settings: WatchSettings) = SoundDialogFragment().apply {
            arguments = Bundle().apply {
                putParcelable(ARG_WATCH, watch)
                putParcelable(ARG_SETTINGS, settings)
            }
        }
    }
}
