package com.sosmartlabs.momotabletpadres.settings.ui

import android.content.Intent
import android.graphics.Color
import android.graphics.Paint
import android.graphics.PorterDuff
import android.graphics.PorterDuffXfermode
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.Toolbar
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import com.androidplot.pie.PieRenderer
import com.androidplot.pie.Segment
import com.androidplot.pie.SegmentFormatter
import com.bumptech.glide.Glide
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.adapters.CompletableViewListener
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.tablet.model.TabletModel
import com.sosmartlabs.momotabletpadres.core.settings.dug.common.SettingsConstants
import com.sosmartlabs.momotabletpadres.databinding.FragmentTabletDetailBinding
import com.sosmartlabs.momotabletpadres.link.UnlinkDeviceViewModel
import com.sosmartlabs.momotabletpadres.tabletsettings.TabletActivity
import com.sosmartlabs.momotabletpadres.utils.Constants
import com.sosmartlabs.momotabletpadres.utils.WindowInsetsUtils
import com.sosmartlabs.momotabletpadres.tablet.TabletViewModel
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.ExperimentalCoroutinesApi
import timber.log.Timber

@OptIn(ExperimentalCoroutinesApi::class)
@AndroidEntryPoint
class TabletDetailFragment : Fragment() {

    private lateinit var fragmentBinding: FragmentTabletDetailBinding
    private lateinit var currentTablet: Tablet
    
    private val unlinkDeviceViewModel: UnlinkDeviceViewModel by activityViewModels()
    private val tabletViewModel: TabletViewModel by activityViewModels()
    
    val toolbar: Toolbar get() = fragmentBinding.toolbar

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        fragmentBinding = FragmentTabletDetailBinding.inflate(inflater, container, false)
        return fragmentBinding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        // Push the purple header clear of the status bar (status-bar + 8dp, matching
        // MainActivity) and pad the content card clear of the navigation bar.
        WindowInsetsUtils.applyEdgeToEdgeInsets(
            root = fragmentBinding.root,
            topView = fragmentBinding.appBarLayoutBlocks,
            bottomView = fragmentBinding.variableCard,
            extraTopPx = resources.getDimensionPixelSize(R.dimen.horizontal_margin_small),
        )
        setupToolbar()
        setListeners()
        observeViewModel()
        unlinkDeviceViewModel.unlinkListener = UnlinkTabletViewListener()
    }

    private fun setupToolbar() {
        Timber.d("setupToolbar")
        with(activity as AppCompatActivity) {
            setSupportActionBar(toolbar)
            supportActionBar?.apply {
                title = null
                setDisplayShowTitleEnabled(true)
                setDisplayHomeAsUpEnabled(true)
                setDisplayShowHomeEnabled(true)
            }
            toolbar.setNavigationOnClickListener { onBackPressed() }
        }
    }

    private fun setListeners() {
        with(fragmentBinding) {
            parentalControlCard.setOnClickListener {
                navigateToTabletActivity()
            }

            editInformationCard.setOnClickListener {
                navigateToTabletActivity(Constants.TABLET_KID_PROFILE_EDIT)
            }

            safetyCard.setOnClickListener {
                navigateToTabletActivity(Constants.TABLET_SAFETY)
            }

            unlinkCard.setOnClickListener {
                showUnlinkDialog()
            }
        }
    }

    private fun navigateToTabletActivity(fragmentQuickAccess: String? = null) {
        val thisTablet = tabletViewModel.currentTablet.value
        val intent = Intent(context, TabletActivity::class.java).apply {
            putExtra(SettingsConstants.TABLET_OBJECT_EXTRA, thisTablet)
            fragmentQuickAccess?.let {
                putExtra(Constants.FRAGMENT_QUICK_ACCESS, it)
            }
        }
        requireContext().startActivity(intent)
    }

    private fun showUnlinkDialog() {
        Timber.d("onRemoveTablet")
        AlertDialog.Builder(requireContext()).apply {
            setTitle(getString(R.string.dialog_remove_tablet_title))
            setMessage(getString(R.string.dialog_remove_tablet_description))
            setPositiveButton(getString(R.string.accept)) { _, _ ->
                tabletViewModel.currentTablet.value?.let { tablet ->
                    unlinkDeviceViewModel.unlinkTablet(tablet)
                }
            }
        }.create().show()
    }

    private fun observeViewModel() {
        tabletViewModel.currentTablet.observe(viewLifecycleOwner) { tablet ->
            updateTabletInfo(tablet)
            updateTabletImage(tablet)
            updateBatteryInfo(tablet)
            currentTablet = tablet
        }
    }

    private fun updateTabletInfo(tablet: Tablet) {
        with(fragmentBinding) {
            tabletName.text = tablet.profileName ?: getString(R.string.unknown_tablet_name)
            tabletModel.text = "Tablet ${getModelName(tablet.model)}"
            
            tablet.profilePicture?.let { picture ->
                Glide.with(requireContext())
                    .load(picture.url)
                    .centerCrop()
                    .placeholder(R.drawable.default_profile_pic)
                    .error(R.drawable.default_profile_pic)
                    .into(tabletProfilePicture)
            }
        }
    }

    private fun getModelName(model: TabletModel?): String {
        return when (model) {
            TabletModel.LITE -> getString(R.string.lite_model_name)
            TabletModel.LITE_2 -> getString(R.string.lite_2_model_name)
            TabletModel.LITE_3 -> getString(R.string.lite_3_model_name)
            TabletModel.PRO, TabletModel.PRO_EU -> getString(R.string.pro_model_name)
            TabletModel.PRO_2 -> getString(R.string.pro_2_model_name)
            TabletModel.PHONE_1 -> getString(R.string.momophone_1_model_name)
            TabletModel.UNO -> getString(R.string.uno_model_name)
            else -> getString(R.string.unknown_model_name)
        }
    }

    private fun updateTabletImage(tablet: Tablet) {
        val imageResource = when (tablet.model) {
            TabletModel.PHONE_1 -> R.drawable.momophone_v1_black
            TabletModel.LITE, TabletModel.LITE_2 -> R.drawable.lite_v1_pink
            TabletModel.LITE_3 -> R.drawable.lite_v3_pink
            TabletModel.PRO, TabletModel.PRO_EU -> R.drawable.pro_v1_pink
            TabletModel.PRO_2 -> R.drawable.pro_v2_pink
            else -> R.drawable.pro_v1_black
        }
        fragmentBinding.userTablet.setImageResource(imageResource)
    }

    private fun updateBatteryInfo(tablet: Tablet) {
        tablet.batteryPercentage?.let { percentage ->
            generateDonutChart(percentage, R.color.normal_battery_color)
            fragmentBinding.watchNormalBattery.text = getString(R.string.item_device_battery, percentage)
        }
    }

    private fun generateDonutChart(batteryPercentage: Int, colorId: Int) {
        with(fragmentBinding.batteryChart) {
            clear()
            
            val batteryLeft = Segment("", batteryPercentage / 100f)
            val emptySpace = Segment("", 1 - (batteryPercentage / 100f))
            
            val batteryColor = createSegmentFormatter(ContextCompat.getColor(requireContext(), colorId))
            val emptyColor = createSegmentFormatter(Color.WHITE)

            addSegment(batteryLeft, batteryColor)
            addSegment(emptySpace, emptyColor)

            getRenderer(PieRenderer::class.java).setDonutSize(0.67f, PieRenderer.DonutMode.PERCENT)
            rotation = -90f
            redraw()
        }
    }

    private fun createSegmentFormatter(color: Int): SegmentFormatter {
        return SegmentFormatter(color).apply {
            val transparentPaint = createPaint(Color.TRANSPARENT)
            val whitePaint = createPaint(Color.WHITE)
            
            innerEdgePaint = transparentPaint
            outerEdgePaint = transparentPaint
            radialEdgePaint = whitePaint
        }
    }

    private fun createPaint(color: Int): Paint {
        return Paint(Paint.ANTI_ALIAS_FLAG).apply {
            this.color = color
            xfermode = PorterDuffXfermode(PorterDuff.Mode.SRC_OVER)
            isAntiAlias = true
        }
    }

    inner class UnlinkTabletViewListener: CompletableViewListener {
        override fun showLoading() = Timber.d("showLoading")
        override fun hideLoading() = Timber.d("hideLoading")
        override fun showErrorMessage(message: String) = Timber.d("showErrorMessage $message")
        override fun showRetry() = Timber.d("showRetry")
        override fun hideRetry() = Timber.d("hideRetry")
        override fun showComplete() {
            Timber.d("showComplete")
            activity?.onBackPressed()
        }
    }
}