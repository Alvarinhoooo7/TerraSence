package com.sosmartlabs.momo.nps

import android.content.Context
import android.content.res.ColorStateList
import android.graphics.Color
import android.util.TypedValue
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.BaseAdapter
import androidx.core.content.ContextCompat
import androidx.lifecycle.MutableLiveData
import com.google.android.material.button.MaterialButton
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.GridcellScoreBinding
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import timber.log.Timber

class NPSScoreAdapter(
    private val context: Context,
    initialSelectedScore: Int = -1,
) : BaseAdapter() {

    val selectedPosition = MutableLiveData<Int>()

    init {
        if (initialSelectedScore in SCORE_RANGE) {
            selectedPosition.value = initialSelectedScore
        }
    }

    override fun getCount(): Int = SCORE_RANGE.count()

    override fun getItem(position: Int): Any = position + 1

    override fun getItemId(position: Int): Long = (position + 1).toLong()

    override fun getView(position: Int, convertView: View?, parent: ViewGroup?): View {
        val binding: GridcellScoreBinding = try {
            (convertView?.tag as? GridcellScoreBinding)
                ?: GridcellScoreBinding.inflate(LayoutInflater.from(context)).also {
                    it.root.tag = it
                }
        } catch (e: Exception) {
            Timber.e(e, "NPSScoreAdapter: Error inflating GridcellScoreBinding at position $position")
            CrashlyticsLog.recordNonFatalError(e, "NPSScoreAdapter: Error inflating binding at $position")
            throw e
        }

        val score = position + 1
        val button = binding.scoreButton
        val isSelected = selectedPosition.value == score

        button.text = score.toString()
        button.contentDescription =
            context.getString(R.string.nps_score_content_description, score)
        button.isSelected = isSelected
        applyTint(button, score, isSelected)
        button.setOnClickListener { selectRating(score) }

        return binding.root
    }

    private fun selectRating(score: Int) {
        Timber.d("NPSScoreAdapter: User selected score $score")
        CrashlyticsLog.log("NPSScoreAdapter: User selected score $score")
        selectedPosition.value = score
        notifyDataSetChanged()
    }

    private fun applyTint(button: MaterialButton, score: Int, selected: Boolean) {
        val colorRes = when {
            !selected -> R.color.nps_score_default
            score <= DETRACTOR_MAX -> R.color.nps_score_low
            score <= PASSIVE_MAX -> R.color.nps_score_mid
            else -> R.color.nps_score_high
        }
        button.backgroundTintList =
            ColorStateList.valueOf(ContextCompat.getColor(context, colorRes))
        button.strokeColor = ColorStateList.valueOf(Color.WHITE)
        button.strokeWidth = if (selected) selectedStrokeWidthPx else 0
    }

    private val selectedStrokeWidthPx: Int by lazy {
        TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            SELECTED_STROKE_WIDTH_DP,
            context.resources.displayMetrics,
        ).toInt()
    }

    companion object {
        private val SCORE_RANGE = 1..10
        private const val DETRACTOR_MAX = 4
        private const val PASSIVE_MAX = 8
        private const val SELECTED_STROKE_WIDTH_DP = 2f
    }
}
