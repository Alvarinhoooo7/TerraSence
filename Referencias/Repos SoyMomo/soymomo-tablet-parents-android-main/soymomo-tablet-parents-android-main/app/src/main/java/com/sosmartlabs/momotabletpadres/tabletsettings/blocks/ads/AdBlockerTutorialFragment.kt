package com.sosmartlabs.momotabletpadres.tabletsettings.blocks.ads

import android.content.Context
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import com.bumptech.glide.request.RequestOptions
import com.glide.slider.library.SliderLayout
import com.glide.slider.library.indicators.PagerIndicator
import com.glide.slider.library.slidertypes.TextSliderView
import com.glide.slider.library.tricks.ViewPagerEx
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.tablet.model.TabletModel
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.databinding.FragmentGenericTutorialBinding
import com.sosmartlabs.momotabletpadres.utils.LocaleUtils
import com.sosmartlabs.momotabletpadres.tablet.TabletViewModel
import com.sosmartlabs.momotabletpadres.utils.WindowInsetsUtils
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber
import java.util.Locale

@AndroidEntryPoint
class AdBlockerTutorialFragment : Fragment() {

    private lateinit var binding: FragmentGenericTutorialBinding
    private lateinit var currentTablet: Tablet
    private val tabletViewModel: TabletViewModel by activityViewModels()

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?
    ): View {
        Timber.d("AdBlockerTutorialFragment: onCreateView started")
        binding = FragmentGenericTutorialBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Timber.d("AdBlockerTutorialFragment: onViewCreated started")
        WindowInsetsUtils.applyEdgeToEdgeInsets(
            root = binding.root,
            topView = binding.genericToolbarInclude.ablViewGenericToolbarAppbar,
            bottomView = binding.tvGenericFragmentNumberIndicator,
            bottomAsMargin = true
        )
        setupToolBar()
        observeViewModel()
    }

    override fun onAttach(context: Context) {
        super.onAttach(context)
        Timber.d("AdBlockerTutorialFragment: onAttach started")
    }

    override fun onStop() {
        Timber.d("AdBlockerTutorialFragment: onStop started")
        binding.sliderGenericFragmentTutorialContainer.stopAutoCycle()
        super.onStop()
    }

    override fun onDetach() {
        super.onDetach()
        Timber.d("AdBlockerTutorialFragment: onDetach started")
    }

    override fun onDestroy() {
        super.onDestroy()
        Timber.d("AdBlockerTutorialFragment: onDestroy started")
    }

    private fun setupToolBar() {
        Timber.d("AdBlockerTutorialFragment: Setting up toolbar")
        val toolbar = binding.genericToolbarInclude.tbViewGenericToolbar
        toolbar.setBackgroundResource(R.color.black)
        (activity as AppCompatActivity).setSupportActionBar(toolbar)
        val actionbar = (activity as AppCompatActivity).supportActionBar
        actionbar?.title = getString(R.string.tutorial_feature_title)
        actionbar?.apply {
            setDisplayShowTitleEnabled(true)
            setDisplayHomeAsUpEnabled(true)
            setDisplayShowHomeEnabled(true)
        }
    }

    private fun observeViewModel() {
        Timber.d("AdBlockerTutorialFragment: Setting up ViewModel observer")
        tabletViewModel.currentTablet.observe(viewLifecycleOwner) { tablet ->
            Timber.d("AdBlockerTutorialFragment: Received tablet update: $tablet")
            currentTablet = tablet
            setupSlider()
        }
    }

    private fun setupSlider() {
        Timber.d("AdBlockerTutorialFragment: Setting up tutorial slider")

        binding.tvGenericFragmentNumberIndicator.text = getString(R.string.update_initial_step)
        val requestOptions = RequestOptions().fitCenter()
        var sliderView = TextSliderView(activity)

        val initialDrawable = when (currentTablet.model) {
            TabletModel.LITE, TabletModel.LITE_2 -> R.drawable.lite_init
            TabletModel.PRO, TabletModel.PRO_EU, TabletModel.PRO_2, TabletModel.UNO -> R.drawable.pro_init
            else -> R.drawable.pro_init
        }

        sliderView.image(initialDrawable).setRequestOption(requestOptions)
        binding.sliderGenericFragmentTutorialContainer.addSlider(sliderView)

        val currentLocale = LocaleUtils.getCurrentLocale()
        Timber.d("AdBlockerTutorialFragment: Setting up slider for locale: ${currentLocale.language}")

        val isGerman = currentLocale.language == Locale.GERMAN.language

        // Add tutorial slides
        listOf(
            if (isGerman) R.drawable.de_tutorial_adblocker_1 else R.drawable.es_tutorial_adblocker_1,
            if (isGerman) R.drawable.de_tutorial_adblocker_2 else R.drawable.es_tutorial_adblocker_2,
            if (isGerman) R.drawable.de_tutorial_adblocker_3 else R.drawable.es_tutorial_adblocker_3
        ).forEach { drawable ->
            sliderView = TextSliderView(activity)
            sliderView.image(drawable).setRequestOption(requestOptions)
            binding.sliderGenericFragmentTutorialContainer.addSlider(sliderView)
        }

        with(binding.sliderGenericFragmentTutorialContainer) {
            setPresetTransformer(SliderLayout.Transformer.Default)
            indicatorVisibility = PagerIndicator.IndicatorVisibility.Invisible
            setDuration(4000)
            stopCyclingWhenTouch(true)
            addOnPageChangeListener(object : ViewPagerEx.OnPageChangeListener {
                override fun onPageScrollStateChanged(state: Int) {
                    Timber.d("AdBlockerTutorialFragment: Slider page scroll state changed to: $state")
                    if (state == 0) {
                        Timber.d("AdBlockerTutorialFragment: Current slider position: $currentPosition")
                        binding.tvGenericFragmentNumberIndicator.text = if (currentPosition == 0) {
                            getString(R.string.update_initial_step)
                        } else {
                            getString(R.string.step, currentPosition)
                        }
                    }
                }

                override fun onPageScrolled(
                    position: Int,
                    positionOffset: Float,
                    positionOffsetPixels: Int
                ) {
                    // No-op
                }

                override fun onPageSelected(position: Int) {
                    // No-op
                }
            })
        }
    }
}