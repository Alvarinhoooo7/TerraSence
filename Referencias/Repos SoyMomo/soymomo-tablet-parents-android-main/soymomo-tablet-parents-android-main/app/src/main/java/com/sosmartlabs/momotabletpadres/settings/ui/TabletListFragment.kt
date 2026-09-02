package com.sosmartlabs.momotabletpadres.settings.ui

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.Toolbar
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
import com.google.firebase.analytics.FirebaseAnalytics
import com.parse.ParseUser
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.adapters.new_designs_adapters.TabletListAdapter
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.core.settings.dug.common.SettingsConstants.TABLET_OBJECT_EXTRA
import com.sosmartlabs.momotabletpadres.databinding.FragmentNewTabletListBinding
import com.sosmartlabs.momotabletpadres.main.ui.MainViewModel
import com.sosmartlabs.momotabletpadres.tabletsettings.TabletActivity
import com.sosmartlabs.momotabletpadres.utils.Constants
import com.sosmartlabs.momotabletpadres.utils.WindowInsetsUtils
import com.sosmartlabs.momotabletpadres.tablet.TabletViewModel
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.ExperimentalCoroutinesApi
import timber.log.Timber

@OptIn(ExperimentalCoroutinesApi::class)
@AndroidEntryPoint
class TabletListFragment : Fragment() {

    private lateinit var binding: FragmentNewTabletListBinding
    private lateinit var tabletListAdapter: TabletListAdapter
    private lateinit var currentParseUser: ParseUser
    private lateinit var firebaseAnalytics: FirebaseAnalytics
    
    private val mainViewModel: MainViewModel by activityViewModels()
    private val tabletViewModel: TabletViewModel by activityViewModels()
    
    val toolbar: Toolbar get() = binding.toolbar

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Timber.d("TabletListFragment: onCreate")
        firebaseAnalytics = FirebaseAnalytics.getInstance(requireContext())
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        Timber.d("TabletListFragment: Creating view")
        binding = FragmentNewTabletListBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Timber.d("TabletListFragment: View created, initializing components")

        currentParseUser = ParseUser.getCurrentUser()

        // Push the purple header clear of the status bar (status-bar + 8dp, matching
        // MainActivity) and pad the list clear of the navigation bar.
        WindowInsetsUtils.applyEdgeToEdgeInsets(
            root = binding.root,
            topView = binding.appBarLayoutBlocks,
            bottomView = binding.recyclerView,
            extraTopPx = resources.getDimensionPixelSize(R.dimen.horizontal_margin_small),
        )
        setupToolbar()
        setupViewModel()
        setupRecyclerView()
        setupDataViews()
    }

    override fun onResume() {
        super.onResume()
        Timber.d("TabletListFragment: Resuming and loading tablet data")
        loadData()
    }

    override fun onPause() {
        super.onPause()
        Timber.d("TabletListFragment: Paused")
    }

    private fun setupToolbar() {
        Timber.d("TabletListFragment: Setting up toolbar")
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

    private fun setupViewModel() {
        Timber.d("TabletListFragment: Setting up view model observers")
        mainViewModel.tabletList.observe(viewLifecycleOwner) {
            Timber.d("TabletListFragment: Received updated tablet list with ${it.size} tablets")
            binding.viewFlipper.displayedChild = 1
            tabletListAdapter.submitList(it.sortedBy { tablet -> tablet.hid })
        }
    }

    private fun setupRecyclerView() {
        Timber.d("TabletListFragment: Setting up recycler view")
        tabletListAdapter = TabletListAdapter(requireContext()).apply {
            listener = object : TabletListAdapter.AdapterListener {
                override fun onClickTablet(tablet: Tablet) {
                    Timber.d("TabletListFragment: Tablet clicked, navigating to details for tablet ${tablet.objectId}")
                    tabletViewModel.setCurrentTablet(tablet)
                    findNavController().navigate(R.id.action_tabletListFragment_to_tabletDetailFragment)
                }

                override fun onClickProfilePicture(tablet: Tablet) {
                    Timber.d("TabletListFragment: Profile picture clicked for tablet ${tablet.objectId}")
                    Intent(context, TabletActivity::class.java).apply {
                        putExtra(TABLET_OBJECT_EXTRA, tablet)
                        putExtra(Constants.FRAGMENT_QUICK_ACCESS, Constants.TABLET_KID_PROFILE_EDIT)
                        context?.startActivity(this)
                    }
                }
            }
        }

        binding.recyclerView.apply {
            layoutManager = LinearLayoutManager(context)
            adapter = tabletListAdapter
        }
    }

    private fun setupDataViews() {
        Timber.d("TabletListFragment: Setting up data views")
    }

    private fun loadData() {
        Timber.d("TabletListFragment: Loading tablets for user ${currentParseUser.objectId}")
        mainViewModel.getTabletsByUser(currentParseUser)
    }

}