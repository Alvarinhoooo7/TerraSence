package com.sosmartlabs.momo.reminders.ui

import android.app.Dialog
import android.os.Bundle
import androidx.fragment.app.DialogFragment
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.sosmartlabs.momo.databinding.DialogEmojisBinding

class EmojisDialogFragment(private val listener: Listener) : DialogFragment() {

    interface Listener {
        fun onEmojiSelected(emoji: String)
    }

    override fun onCreateDialog(savedInstanceState: Bundle?): Dialog {
        val binding = DialogEmojisBinding.inflate(layoutInflater)

        binding.emojiPicker.setOnEmojiPickedListener {
            listener.onEmojiSelected(it.emoji)
            dismiss()
        }

        binding.buttonBack.setOnClickListener { dismiss() }

        return MaterialAlertDialogBuilder(requireContext())
            .setView(binding.root)
            .create()
    }


}