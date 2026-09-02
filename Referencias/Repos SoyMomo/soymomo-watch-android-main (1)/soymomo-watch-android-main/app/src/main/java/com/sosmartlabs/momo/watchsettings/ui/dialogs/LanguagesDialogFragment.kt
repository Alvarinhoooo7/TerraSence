package com.sosmartlabs.momo.watchsettings.ui.dialogs

import android.app.Dialog
import android.content.Context
import android.os.Bundle
import android.view.LayoutInflater
import android.widget.ArrayAdapter
import androidx.core.os.BundleCompat
import androidx.fragment.app.DialogFragment
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.DialogLanguagesBinding
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.utils.MomoLanguage
import com.sosmartlabs.momo.models.WatchSettings

class LanguagesDialogFragment : DialogFragment() {

    interface LanguagesDialogListener {
        fun onLanguageChanged(settings: WatchSettings)
        fun onLanguagesDialogCanceled()
    }

    private lateinit var listener: LanguagesDialogListener
    private lateinit var watch: Wearer
    private lateinit var settings: WatchSettings

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val args = requireArguments()
        watch = requireNotNull(
            BundleCompat.getParcelable(args, ARG_WATCH, Wearer::class.java)
        ) { "LanguagesDialogFragment requires a Wearer." }
        settings = requireNotNull(
            BundleCompat.getParcelable(args, ARG_SETTINGS, WatchSettings::class.java)
        ) { "LanguagesDialogFragment requires WatchSettings." }
    }

    override fun onCreateDialog(savedInstanceState: Bundle?): Dialog {
        val materialContext = MaterialAlertDialogBuilder(requireContext()).context
        val binding = DialogLanguagesBinding.inflate(LayoutInflater.from(materialContext))
        val languages = MomoLanguage.getLanguages(watch.model)

        val adapter = ArrayAdapter(
            requireContext(),
            android.R.layout.simple_dropdown_item_1line,
            languages.map { it.toString() }
        )
        binding.languageDropdown.setAdapter(adapter)

        // Set current selection
        val currentLanguage = if (settings.has("language")) settings.getString("language") else null
        for (i in languages.indices) {
            if (currentLanguage == languages[i].value) {
                binding.languageDropdown.setText(languages[i].toString(), false)
                break
            }
        }

        binding.languageDropdown.setOnItemClickListener { _, _, position, _ ->
            settings.put("language", languages[position].value)
        }

        return MaterialAlertDialogBuilder(requireContext())
            .setTitle(R.string.dialog_language)
            .setView(binding.root)
            .setPositiveButton(R.string.button_save) { _, _ -> listener.onLanguageChanged(settings) }
            .setNegativeButton(R.string.button_cancel) { _, _ -> listener.onLanguagesDialogCanceled() }
            .create()
    }

    override fun onAttach(context: Context) {
        super.onAttach(context)
        listener = context as? LanguagesDialogListener
            ?: throw ClassCastException("$context must implement LanguagesDialogListener")
    }

    companion object {
        private const val ARG_WATCH = "arg_watch"
        private const val ARG_SETTINGS = "arg_settings"

        fun newInstance(watch: Wearer, settings: WatchSettings) = LanguagesDialogFragment().apply {
            arguments = Bundle().apply {
                putParcelable(ARG_WATCH, watch)
                putParcelable(ARG_SETTINGS, settings)
            }
        }
    }
}
