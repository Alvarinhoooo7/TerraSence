package com.sosmartlabs.momo.watchsettings.ui.dialogs

import android.app.Dialog
import android.content.Context
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.widget.ArrayAdapter
import androidx.core.os.BundleCompat
import androidx.fragment.app.DialogFragment
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.DialogSetTimeBinding
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.utils.MomoTimeZone
import com.sosmartlabs.momo.models.WatchSettings

class SetTimeDialogFragment : DialogFragment() {

    interface SetTimeDialogListener {
        fun onSaveTime(settings: WatchSettings)
        fun onSetTimeCancel()
    }

    private lateinit var watch: Wearer
    private lateinit var settings: WatchSettings
    private lateinit var listener: SetTimeDialogListener

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val args = requireArguments()
        watch = requireNotNull(
            BundleCompat.getParcelable(args, ARG_WATCH, Wearer::class.java)
        ) { "SetTimeDialogFragment requires a Wearer." }
        settings = requireNotNull(
            BundleCompat.getParcelable(args, ARG_SETTINGS, WatchSettings::class.java)
        ) { "SetTimeDialogFragment requires WatchSettings." }
    }

    override fun onCreateDialog(savedInstanceState: Bundle?): Dialog {
        val materialContext = MaterialAlertDialogBuilder(requireContext()).context
        val binding = DialogSetTimeBinding.inflate(LayoutInflater.from(materialContext))

        // AM/PM section
        if (watch.model.hasAmPmTime()) {
            binding.layoutAmPm.visibility = View.VISIBLE
        }

        val textClock = binding.textClock
        binding.radioGroup.setOnCheckedChangeListener { _, checkedId ->
            val amPm = checkedId == R.id.radio_button_12_hours
            val format = if (amPm) "hh:mm" else "HH:mm"
            textClock.format12Hour = format
            textClock.format24Hour = format
            settings.put("amPm", amPm)
        }

        val isAmPm = settings.has("amPm") && settings.getBoolean("amPm")
        val format = if (isAmPm) "hh:mm" else "HH:mm"
        textClock.format24Hour = format
        textClock.format12Hour = format
        binding.radioGroup.check(if (isAmPm) R.id.radio_button_12_hours else R.id.radio_button_24_hours)

        // Timezone dropdown
        val timeZones = MomoTimeZone.getTimeZones()
        val adapter = ArrayAdapter(
            requireContext(),
            android.R.layout.simple_dropdown_item_1line,
            timeZones.map { it.toString() }
        )
        binding.timezoneDropdown.setAdapter(adapter)

        binding.timezoneDropdown.setOnItemClickListener { _, _, position, _ ->
            textClock.timeZone = timeZones[position].name
            settings.put("timeZone", timeZones[position].value)
        }

        // Set current timezone selection
        val currentTz = if (settings.has("timeZone")) settings.getString("timeZone") else null
        for (i in timeZones.indices) {
            if (currentTz == timeZones[i].value) {
                binding.timezoneDropdown.setText(timeZones[i].toString(), false)
                textClock.timeZone = timeZones[i].name
                break
            }
        }

        return MaterialAlertDialogBuilder(requireContext())
            .setTitle(R.string.dialog_time_title)
            .setView(binding.root)
            .setPositiveButton(R.string.button_save) { _, _ -> listener.onSaveTime(settings) }
            .setNegativeButton(R.string.button_cancel) { _, _ -> listener.onSetTimeCancel() }
            .create()
    }

    override fun onAttach(context: Context) {
        super.onAttach(context)
        listener = context as? SetTimeDialogListener
            ?: throw ClassCastException("$context must implement SetTimeDialogListener")
    }

    companion object {
        private const val ARG_WATCH = "arg_watch"
        private const val ARG_SETTINGS = "arg_settings"

        fun newInstance(watch: Wearer, settings: WatchSettings) = SetTimeDialogFragment().apply {
            arguments = Bundle().apply {
                putParcelable(ARG_WATCH, watch)
                putParcelable(ARG_SETTINGS, settings)
            }
        }
    }
}
