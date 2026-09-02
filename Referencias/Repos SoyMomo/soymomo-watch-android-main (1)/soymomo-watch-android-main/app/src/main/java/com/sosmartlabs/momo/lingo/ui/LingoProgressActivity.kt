package com.sosmartlabs.momo.lingo.ui

import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.recyclerview.widget.LinearLayoutManager
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.ActivityLingoProgressBinding
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.lingo.domain.LingoLevelEntry
import com.sosmartlabs.momo.lingo.domain.LingoMilestone
import com.sosmartlabs.momo.utils.Constants
import com.sosmartlabs.momo.utils.EdgeToEdgeUtils
import com.sosmartlabs.momo.utils.Resource
import com.sosmartlabs.momo.utils.ui.toolbar.ToolbarConstructor
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber
import java.util.Date

@AndroidEntryPoint
class LingoProgressActivity : AppCompatActivity() {

    private lateinit var binding: ActivityLingoProgressBinding
    private val toolbarConstructor by lazy { ToolbarConstructor(this) }
    private val vm: LingoProgressViewModel by viewModels()

    private var wearerId: String? = null
    private val expandedLevelIds = mutableSetOf<String>()
    private lateinit var adapter: LingoProgressAdapter

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Timber.d("LingoProgressActivity: onCreate")

        enableEdgeToEdge()
        binding = ActivityLingoProgressBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setupEdgeToEdge()

        wearerId = intent.getStringExtra(Constants.EXTRA_WEARER_ID)
        if (wearerId.isNullOrEmpty()) {
            CrashlyticsLog.log("LingoProgressActivity: launched without wearerId")
            finish()
            return
        }

        setupToolbar()
        setupRecyclerView()
        observeViewModel()
    }

    override fun onResume() {
        super.onResume()
        // wearerId is null only when launched without the extra, in which case
        // onCreate already called finish(); guard so the (still-invoked) onResume
        // doesn't NPE on wearerId!!.
        val id = wearerId ?: return
        vm.fetchInformation(id)
    }

    private fun setupToolbar() {
        toolbarConstructor
            .setDisplayShowTitle(false)
            .setTitle(R.string.s_lingo_progress_title)
            .build()
    }

    private fun setupRecyclerView() {
        adapter = LingoProgressAdapter(
            onTabChanged = { tab ->
                vm.setTab(tab)
            },
            onExpandToggle = { levelId ->
                if (levelId in expandedLevelIds) expandedLevelIds.remove(levelId)
                else expandedLevelIds.add(levelId)
                rebuildList()
            },
            onRetry = {
                wearerId?.let { vm.fetchInformation(it) }
            },
            onChangeLanguage = { showChangeLanguageDialog() },
            onSelectViewedLanguage = { showViewedLanguagePicker() },
        )
        binding.lingoRecyclerView.layoutManager = LinearLayoutManager(this)
        binding.lingoRecyclerView.adapter = adapter
    }

    private fun observeViewModel() {
        vm.progress.observe(this) { rebuildList() }
        vm.selectedTab.observe(this) { rebuildList() }
        vm.viewedLanguageCode.observe(this) { rebuildList() }
        vm.activeLanguageCode.observe(this) { rebuildList() }
        vm.isSaving.observe(this) { rebuildList() }
        vm.changeLanguageError.observe(this) {
            Toast.makeText(this, R.string.s_lingo_progress_change_error, Toast.LENGTH_LONG).show()
        }
    }

    private fun rebuildList() {
        val resource = vm.progress.value
        val selectedTab = vm.selectedTab.value ?: 0

        val items = mutableListOf<LingoProgressItem>()

        when (resource?.status) {
            null, Resource.Status.LOADING -> {
                items.add(LingoProgressItem.Loading)
            }
            Resource.Status.LOAD_ERROR -> {
                items.add(LingoProgressItem.Error)
            }
            Resource.Status.LOAD_SUCCESS -> {
                items.add(LingoProgressItem.ActiveLanguageControl(vm.activeDisplayName(), vm.isSaving.value == true))
                items.add(LingoProgressItem.Legend)
                items.add(
                    LingoProgressItem.LanguageSelector(
                        vm.viewedProgress()?.displayName ?: vm.activeDisplayName()
                    )
                )
                items.add(LingoProgressItem.TabPicker(selectedTab))

                if (selectedTab == 0) {
                    appendLevelItems(items, vm.viewedProgress()?.levels ?: emptyList())
                } else {
                    appendTimelineItems(items, vm.milestonesGrouped())
                }
            }
            else -> {}
        }

        adapter.submitList(items)
    }

    private fun appendLevelItems(items: MutableList<LingoProgressItem>, levels: List<LingoLevelEntry>) {
        if (levels.isEmpty()) {
            items.add(
                LingoProgressItem.Empty(
                    R.string.s_lingo_progress_empty_title,
                    R.string.s_lingo_progress_empty_body,
                )
            )
            return
        }
        for (entry in levels) {
            items.add(LingoProgressItem.LevelCard(entry, entry.levelId in expandedLevelIds))
        }
    }

    private fun appendTimelineItems(
        items: MutableList<LingoProgressItem>,
        grouped: List<Pair<Date, List<LingoMilestone>>>,
    ) {
        if (grouped.isEmpty()) {
            items.add(
                LingoProgressItem.Empty(
                    R.string.s_lingo_progress_timeline_empty_title,
                    R.string.s_lingo_progress_timeline_empty_body,
                )
            )
            return
        }
        for ((day, milestones) in grouped) {
            items.add(LingoProgressItem.TimelineDayHeader(day))
            for (milestone in milestones) {
                items.add(LingoProgressItem.TimelineRow(milestone))
            }
        }
    }

    // MARK: - Change-language flow

    /** Step 1: pick which supported language to switch the wearer to. */
    private fun showChangeLanguageDialog() {
        val languages = vm.supportedLanguages()
        if (languages.isEmpty()) return
        val names = languages.map { it.displayName }.toTypedArray()
        // Mirrors showViewedLanguagePicker: show which language is already active so the parent has
        // a reference point, and so re-picking it is visibly a no-op.
        val currentIndex = languages.indexOfFirst { it.code == vm.activeLanguageCode.value }
        MaterialAlertDialogBuilder(this)
            .setTitle(R.string.s_lingo_progress_change_language)
            .setSingleChoiceItems(names, currentIndex) { dialog, which ->
                dialog.dismiss()
                val code = languages[which].code
                // Nothing to confirm or save when it is already the active language.
                if (code == vm.activeLanguageCode.value) return@setSingleChoiceItems
                confirmChangeLanguage(code, languages[which].displayName)
            }
            .setNegativeButton(R.string.button_cancel, null)
            .show()
    }

    /** Step 2: confirm before changing what the child is learning. */
    private fun confirmChangeLanguage(code: String, displayName: String) {
        MaterialAlertDialogBuilder(this)
            .setTitle(R.string.s_lingo_progress_change_confirm_title)
            // Name the target language: the picker rows sit next to each other, so a mis-tap is easy
            // and a confirmation step that never says what it is confirming cannot catch it.
            .setMessage(getString(R.string.s_lingo_progress_change_confirm_message, displayName))
            .setPositiveButton(R.string.s_lingo_progress_change_confirm_action) { _, _ ->
                vm.changeLanguage(code)
            }
            .setNegativeButton(R.string.button_cancel, null)
            .show()
    }

    /** Picks which language's progress the switcher shows (does not change the wearer's setting). */
    private fun showViewedLanguagePicker() {
        val languages = vm.allLanguages()
        if (languages.isEmpty()) return
        val names = languages.map { it.displayName }.toTypedArray()
        val currentIndex = languages.indexOfFirst { it.code == vm.viewedLanguageCode.value }
        MaterialAlertDialogBuilder(this)
            .setTitle(R.string.s_lingo_progress_view_language)
            .setSingleChoiceItems(names, currentIndex) { dialog, which ->
                vm.setViewedLanguage(languages[which].code)
                dialog.dismiss()
            }
            .setNegativeButton(R.string.button_cancel, null)
            .show()
    }

    private fun setupEdgeToEdge() {
        WindowCompat.getInsetsController(window, window.decorView).isAppearanceLightStatusBars = false

        ViewCompat.setOnApplyWindowInsetsListener(binding.lingoCoordinator) { _, windowInsets ->
            val systemBars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars())
            val displayCutout = windowInsets.getInsets(WindowInsetsCompat.Type.displayCutout())
            val navigationBars = windowInsets.getInsets(WindowInsetsCompat.Type.navigationBars())

            binding.contentAppBar.setPadding(
                systemBars.left.coerceAtLeast(displayCutout.left),
                systemBars.top.coerceAtLeast(displayCutout.top),
                systemBars.right.coerceAtLeast(displayCutout.right),
                binding.contentAppBar.paddingBottom,
            )

            val bottomPadding = if (EdgeToEdgeUtils.hasButtonNavigation(applicationContext)) {
                navigationBars.bottom.coerceAtLeast(displayCutout.bottom)
            } else {
                0
            }
            binding.lingoRecyclerView.setPadding(
                binding.lingoRecyclerView.paddingLeft,
                binding.lingoRecyclerView.paddingTop,
                binding.lingoRecyclerView.paddingRight,
                bottomPadding,
            )

            windowInsets
        }
    }
}
