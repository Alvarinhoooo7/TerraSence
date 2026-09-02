package com.sosmartlabs.momo.linkwatch.ui.fragments

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.activity.addCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.Toolbar
import androidx.core.content.ContextCompat
import androidx.core.os.bundleOf
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.LinkwatchFragmentMainviewBinding
import com.sosmartlabs.momo.linkwatch.ui.LinkWatchViewModel
import com.sosmartlabs.momo.main.MainActivity
import com.sosmartlabs.momo.utils.ui.activityindicator.ActivityIndicatorDialogFragment
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import timber.log.Timber

@AndroidEntryPoint
class MainViewFragment : Fragment() {

    private lateinit var binding: LinkwatchFragmentMainviewBinding

    private val linkWatchViewModel: LinkWatchViewModel by activityViewModels()

    val toolbar: Toolbar get() = binding.toolbar

    private val toolbarTitle: String get() = getString(R.string.add_soymomo_title)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        binding = LinkwatchFragmentMainviewBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupToolbar()
        setupListeners()
        observeViewModel()
    }

    override fun onResume() {
        super.onResume()
        Timber.d("onResume")
        linkWatchViewModel.loadCompletedSteps()
        linkWatchViewModel.loadCurrentWearerFromSharedPrefs()
    }

    private fun setupToolbar() {
        Timber.d("setupToolbar")
        with(activity as AppCompatActivity) {
            setSupportActionBar(toolbar)
            supportActionBar?.apply {
                title = toolbarTitle
                setDisplayShowTitleEnabled(true)
                setDisplayHomeAsUpEnabled(true)
                setDisplayShowHomeEnabled(true)
            }
            window.statusBarColor = ContextCompat.getColor(requireContext(), R.color.background_sim_step_card_title)
            window.navigationBarColor = ContextCompat.getColor(requireContext(), R.color.white)
            toolbar.setNavigationOnClickListener { onBackPressed() }
        }
    }

    private fun navigateToMainActivity() {
        Timber.d("navigateToMainActivity")
        val intent = Intent(requireContext(), MainActivity::class.java)
        startActivity(intent)
        requireActivity().finish()
    }

    private fun observeViewModel() {
        linkWatchViewModel.completedSteps.observe(viewLifecycleOwner) { step ->
            setCheckStatus(step)
            setCardClickStatus(step)
            val drawableResource = getDrawableResourceForStep(step)
            val drawable = ContextCompat.getDrawable(requireContext(), drawableResource)
            binding.mainviewCard.verticalDivider.setImageDrawable(drawable)
        }

        binding.mainviewCard.linkButton.alpha = if (linkAvailable()) 1f else 0.25f
    }

    private fun setCheckStatus(step: Int) {
        binding.mainviewCard.linkstepCardview.root.isChecked = step >= 1
        binding.mainviewCard.admindataCardview.root.isChecked = step >= 2
        binding.mainviewCard.childdataCardview.root.isChecked = step >= 3
        binding.mainviewCard.simcardCardview.root.isChecked = step >= 4
    }

    private fun setCardClickStatus(step: Int) {
        binding.mainviewCard.linkstepCardview.root.isClickable = step >= 0
        binding.mainviewCard.admindataCardview.root.isClickable = step >= 1
        binding.mainviewCard.childdataCardview.root.isClickable = step >= 2
        binding.mainviewCard.simcardCardview.root.isClickable = step >= 3
    }

    private fun getDrawableResourceForStep(step: Int): Int {
        val drawableMap = mapOf(
            0 to R.drawable.vertical_divider_linkwatch_state0,
            1 to R.drawable.vertical_divider_linkwatch_state1,
            2 to R.drawable.vertical_divider_linkwatch_state2,
            3 to R.drawable.vertical_divider_linkwatch_state3,
            4 to R.drawable.vertical_divider_linkwatch_state4
        )
        return drawableMap[step] ?: R.drawable.vertical_divider_linkwatch_state0
    }

    private fun setupListeners() {
        setCardsListeners()
        setAddLinkWatchListener()
        setOnBackPressedDispatcherCallback()
    }

    private fun setCardsListeners() {
        val cardToActionMap = mapOf(
            binding.mainviewCard.linkstepCardview.root to R.id.action_mainViewFragment_to_linkStepFragment,
            binding.mainviewCard.admindataCardview.root to R.id.action_mainViewFragment_to_adminDataFragment,
            binding.mainviewCard.childdataCardview.root to R.id.action_mainViewFragment_to_childDataFragment,
            binding.mainviewCard.simcardCardview.root to R.id.action_mainViewFragment_to_addSIMFragment
        )

        cardToActionMap.entries.forEachIndexed { index, entry ->
            entry.key.setOnClickListener {
                val previousCardChecked = cardToActionMap.entries
                    .elementAtOrNull(index - 1)?.key?.isChecked ?: true

                // First time steps.
                if (previousCardChecked && !entry.key.isChecked) {
                    entry.value.let {
                        if (it == R.id.action_mainViewFragment_to_childDataFragment) {
                            navigateById(it, bundleOf("wearer" to linkWatchViewModel.currentWearer.value))
                        } else {
                            navigateById(it)
                        }
                    }
                // Repeatable Steps.
                } else if (entry.key.isChecked) {
                    if (entry.value == R.id.action_mainViewFragment_to_adminDataFragment) {
                        navigateById(R.id.action_mainViewFragment_to_adminDataFragment)
                    } else if (entry.value == R.id.action_mainViewFragment_to_childDataFragment) {
                        navigateById(R.id.action_mainViewFragment_to_childDataFragment,
                            bundleOf("wearer" to linkWatchViewModel.currentWearer.value))
                    }
                }
            }
        }
    }

    private fun setAddLinkWatchListener() {
        if (linkAvailable()) {
            binding.mainviewCard.linkButton.setOnClickListener {
                linkCompleteNavigation()
            }
        }
    }

    private fun setOnBackPressedDispatcherCallback() {
        requireActivity().onBackPressedDispatcher.addCallback(viewLifecycleOwner) {
            requireActivity().finish()
        }
    }


    private fun navigateById(navId: Int, bundle: Bundle = bundleOf()) {
        val navController = findNavController()
        if (navController.currentDestination?.getAction(navId) != null) {
            navController.navigate(navId, bundle)
        } else {
            Timber.w("Skipping stale navigation to $navId from ${navController.currentDestination?.label}")
        }
    }

    private fun linkCompleteNavigation() {
        ActivityIndicatorDialogFragment.show(parentFragmentManager)
        CoroutineScope(Dispatchers.IO).launch {
            linkWatchViewModel.finalLinkWatch {
                requireActivity().runOnUiThread {
                    linkWatchViewModel.resetCompletedSteps()
                    ActivityIndicatorDialogFragment.hide()
                    navigateToMainActivity()
                }
            }
        }
    }

    private fun linkAvailable(): Boolean {
        val totalSteps = linkWatchViewModel.completedSteps.value ?: 0
        return totalSteps >= 4
    }

}