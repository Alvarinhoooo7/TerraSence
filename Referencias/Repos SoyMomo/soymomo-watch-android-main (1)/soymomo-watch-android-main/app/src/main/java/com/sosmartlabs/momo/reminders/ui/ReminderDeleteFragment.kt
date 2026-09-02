package com.sosmartlabs.momo.reminders.ui

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.FragmentReminderDeleteBinding
import timber.log.Timber

class ReminderDeleteFragment : Fragment() {

    private lateinit var binding: FragmentReminderDeleteBinding

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        // Inflate the layout for this fragment
        binding = FragmentReminderDeleteBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupToolbar()
        binding.toolbar.setNavigationOnClickListener {
            findNavController().navigate(R.id.action_reminderDeleteFragment_to_remindersListFragment)
        }

        binding.buttonBackTo.setOnClickListener {
            findNavController().navigate(R.id.action_reminderDeleteFragment_to_remindersListFragment)
        }

    }

    private fun setupToolbar() {
        Timber.d("setupToolbar")
        (activity as AppCompatActivity).setSupportActionBar(binding.toolbar)
        (activity as AppCompatActivity).supportActionBar?.apply {
            title = getString(R.string.reminder_app_bar_title)
            setDisplayShowTitleEnabled(true)
            setDisplayHomeAsUpEnabled(true)
            setDisplayShowHomeEnabled(true)
        }
        setHasOptionsMenu(true)
    }
}