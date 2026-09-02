package com.sosmartlabs.momo.reminders.ui

import android.app.ProgressDialog
import android.content.res.ColorStateList
import android.graphics.Color
import android.os.Bundle
import android.text.TextUtils
import android.view.*
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.graphics.drawable.toDrawable
import androidx.core.text.bold
import androidx.core.text.buildSpannedString
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import com.google.android.material.appbar.AppBarLayout
import com.google.android.material.button.MaterialButton
import com.google.android.material.chip.Chip
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.DialogSelectRangeBinding
import com.sosmartlabs.momo.databinding.DialogSelectTimeBinding
import com.sosmartlabs.momo.databinding.FragmentEditReminderDetailsBinding
import com.sosmartlabs.momo.reminders.model.Reminder
import com.sosmartlabs.momo.reminders.model.Reminder.Companion.POSTPONE_10
import com.sosmartlabs.momo.utils.DateUtil
import com.sosmartlabs.momo.utils.Resource
import com.sosmartlabs.momo.utils.ValidationToUserProfile
import com.sosmartlabs.momo.utils.ValidationToUserProfile.isValidData
import com.sosmartlabs.momo.utils.ui.toolbar.ToolbarConstructor
import timber.log.Timber
import java.util.*

class EditReminderDetailsFragment : Fragment() {

    private lateinit var binding: FragmentEditReminderDetailsBinding

    private lateinit var fromDate: Date
    private lateinit var toDate: Date
    private lateinit var atDate: Date

    private val viewModel: RemindersViewModel by activityViewModels()

    private var currentSelectedChipItem = Reminder.TYPE_ALERT

    lateinit var currentReminder: Reminder

    private lateinit var progressDialog: ProgressDialog

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        viewModel.changeReminderType(currentSelectedChipItem)
        atDate = Calendar.getInstance().time
        fromDate = Calendar.getInstance().time
        toDate = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, (get(Calendar.HOUR_OF_DAY) + 1) % 24)
        }.time
    }

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        // Inflate the layout for this fragment
        binding = FragmentEditReminderDetailsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupEdgeToEdge()
        setToolbar()
        initDayButtons()
        setDayButtonsListeners()
        setEmojiDialogListener()
        setButtonAcceptListener()
        setReminderTypeChipListener()
        setTimeDialogsListeners()
        observeViewModel()
        binding.root.setOnClickListener {
            ValidationToUserProfile.hideKeyboard(requireView(), requireContext())
        }
    }

    private fun AppBarLayout.disableCollapse(disable: Boolean) {
        val lp = binding.collapsingToolbar.layoutParams as AppBarLayout.LayoutParams
        if (disable) {
            lp.scrollFlags = 0
            setExpanded(true, false)     // keep it fully visible
        } else {
            lp.scrollFlags =
                AppBarLayout.LayoutParams.SCROLL_FLAG_SCROLL or
                        AppBarLayout.LayoutParams.SCROLL_FLAG_EXIT_UNTIL_COLLAPSED
        }
        binding.collapsingToolbar.layoutParams = lp
    }

    private fun setupEdgeToEdge() {
        Timber.d("EditReminderDetailsFragment: setupEdgeToEdge")

        ViewCompat.setOnApplyWindowInsetsListener(binding.root) { view, windowInsets ->
            val systemBars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars())
            val displayCutout = windowInsets.getInsets(WindowInsetsCompat.Type.displayCutout())

            Timber.d("EditReminderDetailsFragment: systemBars $systemBars")
            Timber.d("EditReminderDetailsFragment: displayCutout $displayCutout")

            // Apply top padding to AppBarLayout to extend colorPrimary background into status bar area
            binding.contentAppBar.setPadding(
                systemBars.left.coerceAtLeast(displayCutout.left),
                systemBars.top.coerceAtLeast(displayCutout.top),
                systemBars.right.coerceAtLeast(displayCutout.right),
                binding.contentAppBar.paddingBottom
            )

            windowInsets
        }
    }

    private fun setToolbar() {
        // Set up toolbar manually for consistent navigation
        (requireActivity() as AppCompatActivity).setSupportActionBar(binding.toolbar)
        (requireActivity() as AppCompatActivity).supportActionBar?.apply {
            title = getString(R.string.reminder_app_bar_title)
            setDisplayShowTitleEnabled(true)
            setDisplayHomeAsUpEnabled(true)
            setDisplayShowHomeEnabled(true)
        }
        
        binding.toolbar.setNavigationOnClickListener {
            findNavController().navigateUp()
        }
    }

    private fun hoursAndMinutesOf(date: Date): Pair<Int, Int> {
        val cal = Calendar.getInstance().apply { time = date }
        return cal.get(Calendar.HOUR_OF_DAY) to cal.get(Calendar.MINUTE)
    }

    private fun setReminderChipView() {
        binding.reminder.setChipBackgroundColorResource(R.color.colorPrimary)
        binding.task.setChipBackgroundColorResource(R.color.colorGrey)
        binding.reminder.setTextColor(requireContext().getColor(R.color.white))
        binding.task.setTextColor(requireContext().getColor(R.color.video_call_history_time_card_data))
    }

    private fun setTaskChipView() {
        binding.reminder.setChipBackgroundColorResource(R.color.colorGrey)
        binding.task.setChipBackgroundColorResource(R.color.colorPrimary)
        binding.reminder.setTextColor(requireContext().getColor(R.color.video_call_history_time_card_data))
        binding.task.setTextColor(requireContext().getColor(R.color.white))
    }

    private fun setReminderTypeChipListener() {

        binding.reminder.setOnClickListener {
            if (currentSelectedChipItem == Reminder.TYPE_ALERT) return@setOnClickListener
            setReminderChipView()
            viewModel.changeReminderType(Reminder.TYPE_ALERT)
            currentSelectedChipItem = Reminder.TYPE_ALERT

            val (h, m) = hoursAndMinutesOf(atDate)
            val formattedTime = String.format("%02d:%02d", h, m)
            updateTimeText(formattedTime)
        }
        binding.task.setOnClickListener {
            if (currentSelectedChipItem == Reminder.TYPE_TASK) return@setOnClickListener
            setTaskChipView()
            viewModel.changeReminderType(Reminder.TYPE_TASK)
            currentSelectedChipItem = Reminder.TYPE_TASK

            val (fromH, fromM) = hoursAndMinutesOf(fromDate)
            val (toH, toM)   = hoursAndMinutesOf(toDate)
            val fromFormatted = String.format("%02d:%02d", fromH, fromM)
            val toFormatted   = String.format("%02d:%02d", toH, toM)
            updateRangeText(fromFormatted, toFormatted)
        }
    }

    private fun initDayButtons() {
        getDaysButtons().forEach { button ->
            button.isChecked = false
            updateDayButtonAppearance(button)

            // receive real state changes
            button.addOnCheckedChangeListener { _, isChecked ->
                updateDayButtonAppearance(button)
            }
        }
    }

    private fun setDayButtonsListeners() {
        val buttons = getDaysButtons()
        buttons.forEachIndexed { index, button ->
            button.setOnClickListener {
                toggleDayButton(button)
            }
        }
    }

    private fun getDaysButtons(): Array<MaterialButton> {
        return arrayOf(
            binding.buttonMonday,
            binding.buttonTuesday,
            binding.buttonWednesday,
            binding.buttonThursday,
            binding.buttonFriday,
            binding.buttonSaturday,
            binding.buttonSunday
        )
    }

    private fun toggleDayButton(button: MaterialButton) {
        // Update the button appearance based on checked state
        updateDayButtonAppearance(button)
    }

    private fun updateDayButtonAppearance(button: MaterialButton) {
        val colorRes = if (button.isChecked)
            R.color.button_positive      // selected
        else
            R.color.button_neutral       // un-selected

        button.backgroundTintList = ColorStateList.valueOf(ContextCompat.getColor(requireContext(), colorRes))
    }

    private var emojiPageVisible = false   // keeps current state

    private fun setEmojiDialogListener() = with(binding) {

        newEmojiButton.setOnClickListener {
            emojiPageVisible = !emojiPageVisible          // toggle flag

            if (emojiPageVisible) {
                viewFlipperReminder.displayedChild = 1    // show picker
                contentAppBar.disableCollapse(true)
                newEmojiButton.setIconResource(R.drawable.ic_baseline_close_24)
                newEmojiButton.backgroundTintList =
                    ColorStateList.valueOf(
                        ContextCompat.getColor(requireContext(), R.color.button_negative)
                    )
            } else {
                viewFlipperReminder.displayedChild = 0    // show main page
                contentAppBar.disableCollapse(false)
                newEmojiButton.setIconResource(R.drawable.ic_add_24)
                newEmojiButton.backgroundTintList =
                    ColorStateList.valueOf(
                        ContextCompat.getColor(requireContext(), R.color.button_positive)
                    )
            }
        }

        binding.emojiPicker.apply {
            isNestedScrollingEnabled = false
        }

        emojiPicker.setOnEmojiPickedListener { result ->
            reminderEmoji.text = result.emoji
            reminderEmoji.translationZ = -10f

            emojiPageVisible = false
            viewFlipperReminder.displayedChild = 0
            contentAppBar.disableCollapse(false)
            newEmojiButton.setIconResource(R.drawable.ic_add_24)
            newEmojiButton.backgroundTintList =
                ColorStateList.valueOf(
                    ContextCompat.getColor(requireContext(), R.color.button_positive)
                )
        }
    }

    private fun setButtonAcceptListener() {
        binding.buttonAccept.setOnClickListener {
            ValidationToUserProfile.hideKeyboard(requireView(), requireContext())
            with(binding) {
                val iconReminder = reminderEmoji.text.toString()
                val titleReminder = titleReminder.text.toString()
                val anyDaySelected = getDaysButtons().any { it.isChecked }
                val daysMapped = getDaysButtons().map { if (it.isChecked) 1 else 0 }

                val at = DateUtil.get24HoursFormattedTimeNoLocale(atDate)
                val from = DateUtil.get24HoursFormattedTimeNoLocale(fromDate)
                val to = DateUtil.get24HoursFormattedTimeNoLocale(toDate)

                val isEnabled = iconReminder.isValidData() && titleReminder.isValidData() && anyDaySelected

                if (!isEnabled) {
                    // create a snack bar or dialog to inform the user that he must select and emoji and name the reminder
                    createMissingInformationDialog()
                    return@setOnClickListener
                }

                when (viewModel.currentReminderType.value) {
                    Reminder.TYPE_ALERT ->
                        updateAlertReminder(titleReminder, at, daysMapped, iconReminder)
                    Reminder.TYPE_TASK ->
                        updateTaskReminder(titleReminder, from, to, daysMapped, iconReminder)
                }
            }
        }
    }

    private fun createMissingInformationDialog() {
        MaterialAlertDialogBuilder(requireContext())
            .setTitle(
                resources.getString(
                    R.string.lack_information_title_dialog
                )
            )
            .setMessage(
                resources.getString(
                    R.string.complete_lack_information_message_dialog
                )
            )
            .setNegativeButton(resources.getString(R.string.button_accept)) { dialog, which ->
                dialog.dismiss()
            }
            .show()
    }

    private fun updateAlertReminder(titleReminder: String, at: String, daysMapped: List<Int>, iconReminder: String) {
        viewModel.updateAlertReminder(
            titleReminder,
            notify = true,
            at,
            daysMapped,
            true,
            false,
            false,
            null,
            iconReminder
        )
    }

    private fun updateTaskReminder(titleReminder: String, from: String, to: String, daysMapped: List<Int>, iconReminder: String) {
        viewModel.updateTaskReminder(
            titleReminder,
            notify = true,
            from, to,
            POSTPONE_10,
            daysMapped,
            true,
            false,
            false,
            null,
            iconReminder
        )
    }

    private fun setTimeDialogsListeners() {
        binding.reminderTime.setOnClickListener {
            when (currentSelectedChipItem) {
                Reminder.TYPE_ALERT -> {
                    showSelectTimeDialog()
                }
                Reminder.TYPE_TASK -> {
                    showSelectRangeDialog()
                }
            }
        }
    }

    private fun showSelectTimeDialog() {
        val dialogBinding = DialogSelectTimeBinding.inflate(LayoutInflater.from(requireContext()))
        val dialog = AlertDialog.Builder(requireContext())
            .setView(dialogBinding.root)
            .setCancelable(true)
            .create()

        // Setup pickers
        val (h, m) = hoursAndMinutesOf(atDate)
        dialogBinding.hoursPicker.minValue = 0
        dialogBinding.hoursPicker.maxValue = 23
        dialogBinding.hoursPicker.value = h

        dialogBinding.minutesPicker.minValue = 0
        dialogBinding.minutesPicker.maxValue = 59
        dialogBinding.minutesPicker.value = m

        // Update preview text
        fun updatePreview() {
            val h = dialogBinding.hoursPicker.value
            val m = dialogBinding.minutesPicker.value
            dialogBinding.textTimePreview.text = String.format("%02d:%02d", h, m)
        }

        updatePreview()
        dialogBinding.hoursPicker.setOnValueChangedListener { _, _, _ -> updatePreview() }
        dialogBinding.minutesPicker.setOnValueChangedListener { _, _, _ -> updatePreview() }

        dialogBinding.buttonSave.setOnClickListener {
            val h = dialogBinding.hoursPicker.value
            val m = dialogBinding.minutesPicker.value
            atDate = Calendar.getInstance().apply {
                set(Calendar.HOUR_OF_DAY, h)
                set(Calendar.MINUTE, m)
            }.time

            val formattedTime = String.format("%02d:%02d", h, m)
            updateTimeText(formattedTime)
            dialog.dismiss()
        }

        dialog.window?.setBackgroundDrawable(Color.TRANSPARENT.toDrawable())
        dialog.show()
    }

    private fun showSelectRangeDialog() {
        val dialogBinding = DialogSelectRangeBinding.inflate(LayoutInflater.from(requireContext()))
        val dialog = AlertDialog.Builder(requireContext())
            .setView(dialogBinding.root)
            .setCancelable(true)
            .create()

        val (fromH, fromM) = hoursAndMinutesOf(fromDate)
        val (toH, toM)   = hoursAndMinutesOf(toDate)

        with(dialogBinding) {
            hoursPickerFrom.minValue = 0
            hoursPickerFrom.maxValue = 23
            hoursPickerFrom.value = fromH

            minutesPickerFrom.minValue = 0
            minutesPickerFrom.maxValue = 59
            minutesPickerFrom.value = fromM

            hoursPickerTo.minValue = 0
            hoursPickerTo.maxValue = 23
            hoursPickerTo.value = toH

            minutesPickerTo.minValue = 0
            minutesPickerTo.maxValue = 59
            minutesPickerTo.value = toM

            fun updateRangePreview() {
                val fromText = String.format("%02d:%02d", hoursPickerFrom.value, minutesPickerFrom.value)
                val toText = String.format("%02d:%02d", hoursPickerTo.value, minutesPickerTo.value)
                textRangePreview.text = "$fromText - $toText"
            }

            updateRangePreview()

            hoursPickerFrom.setOnValueChangedListener { _, _, _ -> updateRangePreview() }
            minutesPickerFrom.setOnValueChangedListener { _, _, _ -> updateRangePreview() }
            hoursPickerTo.setOnValueChangedListener { _, _, _ -> updateRangePreview() }
            minutesPickerTo.setOnValueChangedListener { _, _, _ -> updateRangePreview() }

            buttonSave.setOnClickListener {
                val fromH = dialogBinding.hoursPickerFrom.value
                val fromM = dialogBinding.minutesPickerFrom.value
                val toH = dialogBinding.hoursPickerTo.value
                val toM = dialogBinding.minutesPickerTo.value

                fromDate = Calendar.getInstance().apply {
                    set(Calendar.HOUR_OF_DAY, fromH)
                    set(Calendar.MINUTE, fromM)
                }.time

                toDate = Calendar.getInstance().apply {
                    set(Calendar.HOUR_OF_DAY, toH)
                    set(Calendar.MINUTE, toM)
                }.time

                val fromFormatted = String.format("%02d:%02d", fromH, fromM)
                val toFormatted = String.format("%02d:%02d", toH, toM)
                updateRangeText(fromFormatted, toFormatted)

                dialog.dismiss()
            }
        }

        dialog.window?.setBackgroundDrawable(Color.TRANSPARENT.toDrawable())
        dialog.show()
    }

    private fun updateTimeText(formattedTime: String) {
        val boldLabel = buildSpannedString { bold { append(getString(R.string.time_label)) } }

        val finalText: CharSequence = TextUtils.expandTemplate(
            getText(R.string.time_single_format),   // keeps spans
            boldLabel,                              // ^1
            formattedTime                           // %2$s → second arg
        )
        binding.reminderTimeText.text = finalText
    }

    private fun updateRangeText(from: String, to: String) {
        val boldLabel = buildSpannedString { bold { append(getString(R.string.range_label)) } }

        val finalText: CharSequence = TextUtils.expandTemplate(
            getText(R.string.time_range_format),    // ^1
            boldLabel,                              // ^1
            from,                                   // %2$s
            to                                      // %3$s
        )
        binding.reminderTimeText.text = finalText
    }

    private fun showProgress(messageRes: Int) {
        progressDialog.setMessage(getString(messageRes))
        progressDialog.show()
    }

    private fun observeViewModel() {
        progressDialog = ProgressDialog(requireContext())
        viewModel.currentReminder.observe(viewLifecycleOwner) {
            if (it == null) return@observe
            when (it.status) {
                Resource.Status.LOAD_SUCCESS -> {
                    currentReminder = it.data!!
                    currentSelectedChipItem = currentReminder.type
                    viewModel.changeReminderType(currentReminder.type)
                    binding.reminderEmoji.text = currentReminder.emoji
                    binding.reminderEmoji.translationZ = -10f
                    binding.titleReminder.setText(currentReminder.name)

                    val buttons = getDaysButtons()
                    for (i in buttons.indices) {
                        buttons[i].isChecked = currentReminder.days[i] == 1
                    }

                    when (currentReminder.type) {
                        Reminder.TYPE_ALERT -> {
                            setReminderChipView()
                            atDate = DateUtil.getDateFromString(currentReminder.from)
                            val (h, m) = hoursAndMinutesOf(atDate)
                            val formattedTime = String.format("%02d:%02d", h, m)
                            updateTimeText(formattedTime)
                        }
                        Reminder.TYPE_TASK -> {
                            setTaskChipView()
                            fromDate = DateUtil.getDateFromString(currentReminder.from)
                            toDate = DateUtil.getDateFromString(currentReminder.to)
                            val (fromH, fromM) = hoursAndMinutesOf(fromDate)
                            val (toH, toM)   = hoursAndMinutesOf(toDate)

                            val fromFormatted = String.format("%02d:%02d", fromH, fromM)
                            val toFormatted   = String.format("%02d:%02d", toH, toM)
                            updateRangeText(fromFormatted, toFormatted)
                        }
                    }

                    binding.buttonDelete.setOnClickListener {
                        val reminderType =
                            getString(if (currentSelectedChipItem == Reminder.TYPE_ALERT) R.string.alert_type else R.string.task_type)
                        MaterialAlertDialogBuilder(requireContext())
                            .setTitle(
                                resources.getString(
                                    R.string.delete_reminder_title_dialog, reminderType
                                )
                            )
                            .setMessage(
                                resources.getString(
                                    R.string.delete_reminder_message_dialog, reminderType
                                )
                            )
                            .setNegativeButton(resources.getString(R.string.button_back)) { dialog, which ->
                                dialog.dismiss()
                            }
                            .setPositiveButton(resources.getString(R.string.button_delete)) { dialog, which ->
                                viewModel.removeReminder(currentReminder)
                            }
                            .show()
                    }
                }
                Resource.Status.UPDATING -> showProgress(R.string.progress_loading_save_reminder)
                Resource.Status.UPDATING_SUCCESS -> {
                    progressDialog.dismiss()
                    viewModel.setCurrentReminder(null)
                    findNavController().navigateUp()
                }
                Resource.Status.UPDATING_ERROR -> {
                    progressDialog.dismiss()
                    Toast.makeText(
                        requireContext(),
                        getString(R.string.error_save_reminder),
                        Toast.LENGTH_SHORT
                    ).show()
                }
                Resource.Status.DELETING -> showProgress(R.string.progress_removing_reminder)
                Resource.Status.DELETING_SUCCESS -> {
                    progressDialog.dismiss()
                    viewModel.setCurrentReminder(null)
                    val action =
                        EditReminderDetailsFragmentDirections.actionEditReminderDetailsFragmentToReminderDeleteFragment()
                    findNavController().navigate(action)
                }
                Resource.Status.DELETING_ERROR -> {
                    progressDialog.dismiss()
                    Toast.makeText(
                        requireContext(),
                        getString(R.string.error_delete_reminder),
                        Toast.LENGTH_SHORT
                    ).show()
                }
                else -> { /* Do nothing in any other case */}
            }
        }
    }


}
