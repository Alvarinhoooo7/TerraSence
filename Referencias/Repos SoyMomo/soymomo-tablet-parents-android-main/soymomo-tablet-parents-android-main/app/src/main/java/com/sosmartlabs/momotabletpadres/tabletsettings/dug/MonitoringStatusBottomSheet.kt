package com.sosmartlabs.momotabletpadres.tabletsettings.dug

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import androidx.core.content.ContextCompat
import androidx.core.content.res.ResourcesCompat
import androidx.fragment.app.activityViewModels
import com.google.android.material.bottomsheet.BottomSheetDialogFragment
import com.google.android.material.switchmaterial.SwitchMaterial
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.core.settings.dug.common.model.DugFeature
import com.sosmartlabs.momotabletpadres.core.settings.dug.common.util.DetectionSeverityUtil
import com.sosmartlabs.momotabletpadres.databinding.BottomSheetMonitoringStatusBinding
import com.sosmartlabs.momotabletpadres.viewmodels.DugUnifiedViewModel
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MonitoringStatusBottomSheet : BottomSheetDialogFragment() {

    private lateinit var binding: BottomSheetMonitoringStatusBinding
    private val dugUnifiedViewModel: DugUnifiedViewModel by activityViewModels()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        binding = BottomSheetMonitoringStatusBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        dugUnifiedViewModel.featureStates.observe(viewLifecycleOwner) { features ->
            buildToggleRows(features)
        }
    }

    private fun buildToggleRows(features: List<DugFeature>) {
        binding.togglesContainer.removeAllViews()
        features.forEach { feature ->
            val row = LinearLayout(requireContext()).apply {
                orientation = LinearLayout.HORIZONTAL
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                )
                gravity = android.view.Gravity.CENTER_VERTICAL
                setPadding(0, 12.dpToPx(), 0, 12.dpToPx())
            }

            val icon = android.widget.ImageView(requireContext()).apply {
                layoutParams = LinearLayout.LayoutParams(32.dpToPx(), 32.dpToPx()).apply {
                    marginEnd = 12.dpToPx()
                }
                setImageResource(DetectionSeverityUtil.getCategoryIconRes(feature.featureType))
            }

            val title = android.widget.TextView(requireContext()).apply {
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
                text = feature.title
                setTextColor(ContextCompat.getColor(requireContext(), R.color.dug_text_primary))
                textSize = 15f
                typeface = ResourcesCompat.getFont(requireContext(), R.font.poppins)
            }

            val switch = SwitchMaterial(requireContext()).apply {
                isChecked = feature.enabled
                setOnCheckedChangeListener { _, isChecked ->
                    dugUnifiedViewModel.toggleFeature(feature, isChecked)
                }
            }

            row.addView(icon)
            row.addView(title)
            row.addView(switch)
            binding.togglesContainer.addView(row)
        }
    }

    private fun Int.dpToPx(): Int =
        (this * resources.displayMetrics.density).toInt()

    companion object {
        const val TAG = "MonitoringStatusBottomSheet"
    }
}
