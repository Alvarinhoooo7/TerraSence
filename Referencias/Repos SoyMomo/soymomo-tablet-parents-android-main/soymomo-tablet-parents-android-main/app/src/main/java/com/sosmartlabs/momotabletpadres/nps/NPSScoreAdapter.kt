package com.sosmartlabs.momotabletpadres.nps

import android.content.Context
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.BaseAdapter
import androidx.lifecycle.MutableLiveData
import com.sosmartlabs.momotabletpadres.databinding.GridcellScoreBinding

class NPSScoreAdapter internal constructor(
    private val context: Context,
    initialSelectedScore: Int = NO_SELECTION,
) : BaseAdapter() {

    private val scores = (MIN_SCORE..MAX_SCORE).toList()

    /** 1-based selected score, or [NO_SELECTION] when nothing is picked yet. */
    var selectedPosition: MutableLiveData<Int> = MutableLiveData()

    init {
        if (initialSelectedScore in MIN_SCORE..MAX_SCORE) {
            selectedPosition.value = initialSelectedScore
        }
    }

    override fun getCount(): Int = scores.size

    override fun getItem(position: Int): Any = scores[position]

    override fun getItemId(position: Int): Long = (position + 1).toLong()

    override fun getView(position: Int, convertView: View?, parent: ViewGroup?): View {
        // Reuse the recycled cell's binding via its tag, and re-bind content and
        // selection visuals on EVERY call so GridView recycling can never leave a
        // cell showing a stale number or a stale selection highlight.
        val binding = (convertView?.tag as? GridcellScoreBinding)
            ?: GridcellScoreBinding.inflate(LayoutInflater.from(context)).also { it.root.tag = it }

        val score = scores[position]
        binding.number.text = score.toString()
        bindSelectionState(binding, score)
        binding.button.setOnClickListener { selectRating(score) }
        return binding.root
    }

    private fun bindSelectionState(binding: GridcellScoreBinding, score: Int) {
        val isSelected = selectedPosition.value == score
        binding.notSelected.visibility = if (isSelected) View.GONE else View.VISIBLE
        binding.selectedLower.visibility =
            if (isSelected && score <= DETRACTOR_MAX) View.VISIBLE else View.GONE
        binding.selectedMid.visibility =
            if (isSelected && score in (DETRACTOR_MAX + 1)..PASSIVE_MAX) View.VISIBLE else View.GONE
        binding.selectedUpper.visibility =
            if (isSelected && score > PASSIVE_MAX) View.VISIBLE else View.GONE
    }

    private fun selectRating(score: Int) {
        selectedPosition.value = score
        notifyDataSetChanged()
    }

    companion object {
        const val NO_SELECTION = -1
        private const val MIN_SCORE = 1
        private const val MAX_SCORE = 10
        private const val DETRACTOR_MAX = 4
        private const val PASSIVE_MAX = 8
    }
}
