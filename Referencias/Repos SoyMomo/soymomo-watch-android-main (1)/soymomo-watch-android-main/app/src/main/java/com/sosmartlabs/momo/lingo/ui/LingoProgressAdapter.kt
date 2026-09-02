package com.sosmartlabs.momo.lingo.ui

import android.content.Context
import android.text.format.DateUtils
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.annotation.StringRes
import androidx.core.content.ContextCompat
import androidx.core.view.isVisible
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.button.MaterialButton
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.lingo.asset.LingoAssetUrl
import com.sosmartlabs.momo.lingo.domain.LingoLevelEntry
import com.sosmartlabs.momo.lingo.domain.LingoMilestone
import com.sosmartlabs.momo.lingo.domain.LingoMilestoneKind
import com.sosmartlabs.momo.lingo.svg.loadLingoSvg
import java.util.Date

sealed class LingoProgressItem {
    data class ActiveLanguageControl(val activeDisplayName: String, val isSaving: Boolean) : LingoProgressItem()
    data object Legend : LingoProgressItem()
    data class LanguageSelector(val currentDisplayName: String) : LingoProgressItem()
    data class TabPicker(val selected: Int) : LingoProgressItem()
    data class LevelCard(val entry: LingoLevelEntry, val expanded: Boolean) : LingoProgressItem()
    data class TimelineDayHeader(val day: Date) : LingoProgressItem()
    data class TimelineRow(val milestone: LingoMilestone) : LingoProgressItem()
    data class Empty(@StringRes val titleRes: Int, @StringRes val bodyRes: Int) : LingoProgressItem()
    data object Loading : LingoProgressItem()
    data object Error : LingoProgressItem()
}

class LingoProgressAdapter(
    var onTabChanged: ((Int) -> Unit)? = null,
    var onExpandToggle: ((String) -> Unit)? = null,
    var onRetry: (() -> Unit)? = null,
    var onChangeLanguage: (() -> Unit)? = null,
    var onSelectViewedLanguage: (() -> Unit)? = null,
) : ListAdapter<LingoProgressItem, RecyclerView.ViewHolder>(DiffCallback) {

    // Shared across every level card's nested word grids so word-card views are
    // recycled across cards instead of re-inflated per card.
    private val wordViewPool = RecyclerView.RecycledViewPool()

    companion object {
        private const val TYPE_LEGEND = 0
        private const val TYPE_TAB_PICKER = 1
        private const val TYPE_LEVEL_CARD = 2
        private const val TYPE_TIMELINE_DAY_HEADER = 3
        private const val TYPE_TIMELINE_ROW = 4
        private const val TYPE_EMPTY = 5
        private const val TYPE_LOADING = 6
        private const val TYPE_ERROR = 7
        private const val TYPE_ACTIVE_LANGUAGE = 8
        private const val TYPE_LANGUAGE_SELECTOR = 9
    }

    private object DiffCallback : DiffUtil.ItemCallback<LingoProgressItem>() {
        override fun areItemsTheSame(old: LingoProgressItem, new: LingoProgressItem): Boolean {
            return when {
                old is LingoProgressItem.ActiveLanguageControl && new is LingoProgressItem.ActiveLanguageControl -> true
                old is LingoProgressItem.Legend && new is LingoProgressItem.Legend -> true
                old is LingoProgressItem.LanguageSelector && new is LingoProgressItem.LanguageSelector -> true
                old is LingoProgressItem.TabPicker && new is LingoProgressItem.TabPicker -> true
                old is LingoProgressItem.LevelCard && new is LingoProgressItem.LevelCard ->
                    old.entry.levelId == new.entry.levelId
                old is LingoProgressItem.TimelineDayHeader && new is LingoProgressItem.TimelineDayHeader ->
                    old.day == new.day
                old is LingoProgressItem.TimelineRow && new is LingoProgressItem.TimelineRow ->
                    old.milestone.date == new.milestone.date && old.milestone.kind == new.milestone.kind
                old is LingoProgressItem.Empty && new is LingoProgressItem.Empty -> true
                old is LingoProgressItem.Loading && new is LingoProgressItem.Loading -> true
                old is LingoProgressItem.Error && new is LingoProgressItem.Error -> true
                else -> false
            }
        }
        override fun areContentsTheSame(old: LingoProgressItem, new: LingoProgressItem) = old == new
    }

    override fun getItemViewType(position: Int): Int = when (getItem(position)) {
        is LingoProgressItem.ActiveLanguageControl -> TYPE_ACTIVE_LANGUAGE
        is LingoProgressItem.Legend -> TYPE_LEGEND
        is LingoProgressItem.LanguageSelector -> TYPE_LANGUAGE_SELECTOR
        is LingoProgressItem.TabPicker -> TYPE_TAB_PICKER
        is LingoProgressItem.LevelCard -> TYPE_LEVEL_CARD
        is LingoProgressItem.TimelineDayHeader -> TYPE_TIMELINE_DAY_HEADER
        is LingoProgressItem.TimelineRow -> TYPE_TIMELINE_ROW
        is LingoProgressItem.Empty -> TYPE_EMPTY
        is LingoProgressItem.Loading -> TYPE_LOADING
        is LingoProgressItem.Error -> TYPE_ERROR
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecyclerView.ViewHolder {
        val inflater = LayoutInflater.from(parent.context)
        return when (viewType) {
            TYPE_ACTIVE_LANGUAGE -> ActiveLanguageControlViewHolder(inflater.inflate(R.layout.item_lingo_active_language, parent, false))
            TYPE_LEGEND -> LegendViewHolder(inflater.inflate(R.layout.view_lingo_legend, parent, false))
            TYPE_LANGUAGE_SELECTOR -> LanguageSelectorViewHolder(inflater.inflate(R.layout.item_lingo_language_selector, parent, false))
            TYPE_TAB_PICKER -> TabPickerViewHolder(inflater.inflate(R.layout.view_lingo_tab_picker, parent, false))
            TYPE_LEVEL_CARD -> LevelCardViewHolder(inflater.inflate(R.layout.item_lingo_level_card, parent, false))
            TYPE_TIMELINE_DAY_HEADER -> DayHeaderViewHolder(inflater.inflate(R.layout.item_lingo_timeline_day_header, parent, false))
            TYPE_TIMELINE_ROW -> TimelineRowViewHolder(inflater.inflate(R.layout.item_lingo_timeline_row, parent, false))
            TYPE_EMPTY -> EmptyViewHolder(inflater.inflate(R.layout.item_lingo_empty, parent, false))
            TYPE_ERROR -> ErrorViewHolder(inflater.inflate(R.layout.item_lingo_error, parent, false))
            else -> LoadingViewHolder(inflater.inflate(R.layout.item_lingo_loading, parent, false))
        }
    }

    override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) {
        when (val item = getItem(position)) {
            is LingoProgressItem.ActiveLanguageControl -> (holder as ActiveLanguageControlViewHolder).bind(item)
            is LingoProgressItem.Legend -> (holder as LegendViewHolder).bind()
            is LingoProgressItem.LanguageSelector -> (holder as LanguageSelectorViewHolder).bind(item)
            is LingoProgressItem.TabPicker -> (holder as TabPickerViewHolder).bind(item.selected)
            is LingoProgressItem.LevelCard -> (holder as LevelCardViewHolder).bind(item)
            is LingoProgressItem.TimelineDayHeader -> (holder as DayHeaderViewHolder).bind(item.day)
            is LingoProgressItem.TimelineRow -> (holder as TimelineRowViewHolder).bind(item.milestone)
            is LingoProgressItem.Empty -> (holder as EmptyViewHolder).bind(item)
            is LingoProgressItem.Error -> (holder as ErrorViewHolder).bind()
            else -> {}
        }
    }

    // MARK: - ViewHolders

    inner class ActiveLanguageControlViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val btnChange: MaterialButton = itemView.findViewById(R.id.btn_change_language)
        private val savingProgress: View = itemView.findViewById(R.id.change_saving_progress)
        private val activeLabel: TextView = itemView.findViewById(R.id.active_language_label)

        fun bind(item: LingoProgressItem.ActiveLanguageControl) {
            val ctx = itemView.context
            activeLabel.text = ctx.getString(R.string.s_lingo_progress_active_language, item.activeDisplayName)
            btnChange.isEnabled = !item.isSaving
            btnChange.text = if (item.isSaving) "" else ctx.getString(R.string.s_lingo_progress_change_language)
            savingProgress.isVisible = item.isSaving
            btnChange.setOnClickListener { onChangeLanguage?.invoke() }
        }
    }

    inner class LanguageSelectorViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val card: View = itemView.findViewById(R.id.selector_card)
        private val name: TextView = itemView.findViewById(R.id.selector_language_name)

        fun bind(item: LingoProgressItem.LanguageSelector) {
            name.text = item.currentDisplayName
            card.setOnClickListener { onSelectViewedLanguage?.invoke() }
        }
    }

    inner class LegendViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        fun bind() {}
    }

    inner class TabPickerViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val btnLevels: MaterialButton = itemView.findViewById(R.id.btn_levels)
        private val btnTimeline: MaterialButton = itemView.findViewById(R.id.btn_timeline)

        fun bind(selected: Int) {
            btnLevels.isChecked = selected == 0
            btnTimeline.isChecked = selected == 1
            btnLevels.setOnClickListener { onTabChanged?.invoke(0) }
            btnTimeline.setOnClickListener { onTabChanged?.invoke(1) }
        }
    }

    inner class LevelCardViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val header: View = itemView.findViewById(R.id.card_header)
        private val levelName: TextView = itemView.findViewById(R.id.level_name)
        private val wordCount: TextView = itemView.findViewById(R.id.word_count)
        private val iconCompleted: ImageView = itemView.findViewById(R.id.icon_completed)
        private val iconReview: ImageView = itemView.findViewById(R.id.icon_review)
        private val iconChallenge: ImageView = itemView.findViewById(R.id.icon_challenge)
        private val expandableSection: View = itemView.findViewById(R.id.expandable_section)
        private val completedLabel: TextView = itemView.findViewById(R.id.completed_label)
        private val learningLabel: TextView = itemView.findViewById(R.id.learning_label)
        private val masteredRecycler: RecyclerView = itemView.findViewById(R.id.mastered_recycler)
        private val learningRecycler: RecyclerView = itemView.findViewById(R.id.learning_recycler)

        fun bind(item: LingoProgressItem.LevelCard) {
            val entry = item.entry
            val ctx = itemView.context

            levelName.text = entry.displayName
            wordCount.text = "${entry.masteredKeys}/${entry.totalKeys} ${ctx.getString(R.string.s_lingo_progress_words_label)}"

            bindMilestoneIcon(iconCompleted, entry.completedAt != null, LingoMilestoneKind.COMPLETED, ctx)
            bindMilestoneIcon(iconReview, entry.reviewCompletedAt != null, LingoMilestoneKind.REVIEW, ctx)
            bindMilestoneIcon(iconChallenge, entry.challengeCompletedAt != null, LingoMilestoneKind.CHALLENGE, ctx)

            expandableSection.visibility = if (item.expanded) View.VISIBLE else View.GONE

            if (item.expanded) {
                val hasCompleted = entry.completedWords.isNotEmpty()
                completedLabel.visibility = if (hasCompleted) View.VISIBLE else View.GONE
                masteredRecycler.visibility = if (hasCompleted) View.VISIBLE else View.GONE
                if (hasCompleted) {
                    completedLabel.text = "${ctx.getString(R.string.s_lingo_progress_completed_label)} ${entry.completedWords.size}"
                    setupWordRecycler(masteredRecycler, entry.completedWords, entry.keyImageMap, ctx)
                }

                val hasLearning = entry.learningWords.isNotEmpty()
                learningLabel.visibility = if (hasLearning) View.VISIBLE else View.GONE
                learningRecycler.visibility = if (hasLearning) View.VISIBLE else View.GONE
                if (hasLearning) {
                    learningLabel.text = "${ctx.getString(R.string.s_lingo_progress_learning_label)} ${entry.learningWords.size}"
                    setupWordRecycler(learningRecycler, entry.learningWords, entry.keyImageMap, ctx)
                }
            }

            header.setOnClickListener { onExpandToggle?.invoke(entry.levelId) }
        }

        private fun bindMilestoneIcon(icon: ImageView, achieved: Boolean, kind: LingoMilestoneKind, ctx: Context) {
            icon.setImageResource(kind.iconRes)
            val color = if (achieved) {
                ContextCompat.getColor(ctx, kind.colorRes)
            } else {
                ContextCompat.getColor(ctx, R.color.momoGreyLight)
            }
            icon.setColorFilter(color)
        }

        private fun setupWordRecycler(
            recycler: RecyclerView,
            words: List<String>,
            keyImageMap: Map<String, String>,
            ctx: Context,
        ) {
            // Configure the nested grid once; on subsequent (recycled) binds we only
            // swap the data, avoiding a fresh LayoutManager + adapter per bind.
            if (recycler.layoutManager == null) {
                recycler.layoutManager = GridLayoutManager(ctx, 3)
                recycler.setRecycledViewPool(wordViewPool)
                recycler.isNestedScrollingEnabled = false
            }
            val wordAdapter = recycler.adapter as? LingoWordAdapter
                ?: LingoWordAdapter().also { recycler.adapter = it }
            wordAdapter.submitList(words.map { LingoWordUi(it, keyImageMap[it] ?: it) })
        }
    }

    inner class DayHeaderViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val dayLabel: TextView = itemView.findViewById(R.id.day_label)

        fun bind(day: Date) {
            val now = System.currentTimeMillis()
            val relativeDate = DateUtils.getRelativeTimeSpanString(
                day.time, now,
                DateUtils.DAY_IN_MILLIS,
                DateUtils.FORMAT_SHOW_DATE or DateUtils.FORMAT_ABBREV_MONTH
            )
            dayLabel.text = relativeDate
        }
    }

    inner class TimelineRowViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val icon: ImageView = itemView.findViewById(R.id.milestone_icon)
        private val levelName: TextView = itemView.findViewById(R.id.milestone_level_name)
        private val kindLabel: TextView = itemView.findViewById(R.id.milestone_kind_label)

        fun bind(milestone: LingoMilestone) {
            val ctx = itemView.context
            icon.setImageResource(milestone.kind.iconRes)
            icon.setColorFilter(ContextCompat.getColor(ctx, milestone.kind.colorRes))
            levelName.text = milestone.levelDisplayName
            kindLabel.text = ctx.getString(milestone.kind.labelRes)
        }
    }

    inner class EmptyViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val title: TextView = itemView.findViewById(R.id.empty_title)
        private val body: TextView = itemView.findViewById(R.id.empty_body)

        fun bind(item: LingoProgressItem.Empty) {
            title.setText(item.titleRes)
            body.setText(item.bodyRes)
        }
    }

    inner class LoadingViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView)

    inner class ErrorViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val retryButton: View = itemView.findViewById(R.id.retry_button)
        fun bind() { retryButton.setOnClickListener { onRetry?.invoke() } }
    }

    // MARK: - Word card adapter

    private data class LingoWordUi(val label: String, val imageName: String)

    private class LingoWordAdapter :
        ListAdapter<LingoWordUi, LingoWordAdapter.WordViewHolder>(WORD_DIFF) {

        inner class WordViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
            val image: ImageView = itemView.findViewById(R.id.word_image)
            val label: TextView = itemView.findViewById(R.id.word_label)
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): WordViewHolder =
            WordViewHolder(LayoutInflater.from(parent.context)
                .inflate(R.layout.item_lingo_word_card, parent, false))

        override fun onBindViewHolder(holder: WordViewHolder, position: Int) {
            val word = getItem(position)
            holder.label.text = word.label
            val url = LingoAssetUrl.drawableUrl(word.imageName)
            holder.image.loadLingoSvg(url)
        }

        companion object {
            private val WORD_DIFF = object : DiffUtil.ItemCallback<LingoWordUi>() {
                override fun areItemsTheSame(oldItem: LingoWordUi, newItem: LingoWordUi) = oldItem.label == newItem.label
                override fun areContentsTheSame(oldItem: LingoWordUi, newItem: LingoWordUi) = oldItem == newItem
            }
        }
    }
}
