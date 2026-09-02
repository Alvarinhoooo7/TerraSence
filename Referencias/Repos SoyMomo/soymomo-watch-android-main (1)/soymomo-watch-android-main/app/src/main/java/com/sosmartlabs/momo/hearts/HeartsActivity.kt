package com.sosmartlabs.momo.hearts

import android.annotation.SuppressLint
import android.app.ProgressDialog
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.widget.Toast
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.coordinatorlayout.widget.CoordinatorLayout
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import com.bumptech.glide.Glide
import com.parse.ParseException
import com.parse.ParseObject
import com.parse.ParseQuery
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.hearts.ui.HeartRewardDialogFragment
import com.sosmartlabs.momo.hearts.ui.HeartRewardAdapter
import com.sosmartlabs.momo.hearts.ui.HeartsViewModel
import com.sosmartlabs.momo.hearts.ui.HeartRewardAdapterListener
import com.sosmartlabs.momo.hearts.ui.HeartRewardListener
import com.sosmartlabs.momo.databinding.ActivityHeartsBinding
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.utils.Constants
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.utils.DividerItemDecoration
import com.sosmartlabs.momo.utils.EdgeToEdgeUtils
import com.sosmartlabs.momo.utils.Resource
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber

/**
 * @author mrg
 * @date 10/6/17
 */
@AndroidEntryPoint
class HeartsActivity : AppCompatActivity(), HeartRewardListener, HeartRewardAdapterListener {
    val TAG: String = javaClass.simpleName
    var mWearerId: String? = null
    private lateinit var binding: ActivityHeartsBinding
    private lateinit var mWatch: Wearer
    lateinit var mAdapter: HeartRewardAdapter

    private val mViewModel: HeartsViewModel by viewModels()
    private lateinit var progressDialog: ProgressDialog
    
    // Edge-to-edge support
    private var fabOriginalBottomMargin = 0

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Timber.d("HeartsActivity: onCreate")
        
        enableEdgeToEdge()
        binding = ActivityHeartsBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setupEdgeToEdge()
        
        mWearerId = intent.getStringExtra(Constants.EXTRA_WEARER_ID)
        
        binding.toolbar.apply {
            setSupportActionBar(this)
            supportActionBar?.setDisplayHomeAsUpEnabled(true)
            supportActionBar?.setDisplayShowHomeEnabled(true)
            supportActionBar?.setDisplayShowTitleEnabled(true)
            this.setNavigationOnClickListener { finish() }
        }
        
        mAdapter = HeartRewardAdapter(this)
        binding.rewardsRecyclerView.apply {
            adapter = mAdapter
            addItemDecoration(DividerItemDecoration(this@HeartsActivity, null))
            layoutManager = androidx.recyclerview.widget.LinearLayoutManager(this@HeartsActivity)
        }
        
        Glide.with(binding.rewardsGifView.context)
            .load(R.drawable.hearts)
            .into(binding.rewardsGifView)
            
        progressDialog = ProgressDialog(this)
        observeViewModel()
    }

    private fun observeViewModel() {
        mViewModel.watch.observe(this) {
            when(it.status) {
                Resource.Status.LOADING -> with(progressDialog) {
                    setMessage(getString(R.string.progress_loading_momo))
                    show()
                }
                Resource.Status.LOAD_SUCCESS -> {
                    progressDialog.dismiss()
                    mWatch = it.data!!
                    if (mWatch.modelInt!! >= 5) {
                        binding.tvHearts.setBackgroundResource(R.drawable.ic_reward_star)
                        binding.rewardsInfoText.text = getString(R.string.rewards_info_text_space)
                    }

                    progressDialog.setMessage(getString(R.string.progress_loading_rewards))
                    binding.tvHearts.text = if(mWatch.has("hearts")) mWatch.getInt("hearts").toString() else  "0"
                    val query2: ParseQuery<ParseObject> = ParseQuery.getQuery("HeartReward")
                    query2.whereEqualTo("watch", mWatch)
                    query2.whereEqualTo("completed", false)
                    query2.findInBackground { objects, e2 ->
                        if(!isDestroyed && !isFinishing) progressDialog.dismiss()
                        if(e2 != null){
                            Log.d(TAG, "query:findHeartReward", e2)
                            Toast.makeText(this@HeartsActivity, R.string.toast_error_loading_rewards, Toast.LENGTH_LONG).show()
                            CrashlyticsLog.recordNonFatalError(e2, "Error finding SoyMomo rewards")
                            finish()
                        } else {
                            mAdapter.setData(objects, mWatch.getInt("hearts"))
                            checkVisibility()
                        }
                    }
                    setUpListeners()
                }
                Resource.Status.LOAD_ERROR -> {
                    progressDialog.dismiss()
                    Toast.makeText(this@HeartsActivity, R.string.toast_error_loading_momo, Toast.LENGTH_LONG).show()
                    finish()
                }
                else -> { /* Do nothing in any other case */}
            }
        }
    }

    private fun setUpListeners(){
        binding.buttonAddHearts.setOnClickListener {
            mWatch.increment("hearts")
            if(mWatch.getInt("hearts") > 200){
                mWatch.revert()
                if (mWatch.modelInt!! >= 5) {
                    Toast.makeText(this@HeartsActivity, R.string.toast_error_max_hearts_space, Toast.LENGTH_LONG).show()
                } else {
                    Toast.makeText(this@HeartsActivity, R.string.toast_error_max_hearts, Toast.LENGTH_LONG).show()
                }
            } else {
                val progressDialog = ProgressDialog(this@HeartsActivity)
                if (mWatch.modelInt!! >= 5) {
                    progressDialog.setMessage(getString(R.string.progress_saving_hearts_space))
                } else {
                    progressDialog.setMessage(getString(R.string.progress_saving_hearts))
                }
                progressDialog.show()
                mWatch.saveInBackground { e: ParseException? ->
                    if(!isDestroyed && !isFinishing) progressDialog.dismiss()
                    if(e != null){
                        mWatch.revert()
                        Log.d(TAG, "Parse:incrementHearts", e)
                        Toast.makeText(this@HeartsActivity, R.string.toast_error_saving_hearts, Toast.LENGTH_LONG).show()
                        CrashlyticsLog.recordNonFatalError(e, "Error while sending hearts to the SoyMomo")
                    }
                    mAdapter.totalHearts = mWatch.getInt("hearts")
                    binding.tvHearts.text = mWatch.getInt("hearts").toString()
                }
            }
        }
        
        binding.buttonRemoveHearts.setOnClickListener {
            mWatch.increment("hearts", -1)
            if(mWatch.getInt("hearts") < 0){
                mWatch.revert()
                if (mWatch.modelInt!! >= 5) {
                    Toast.makeText(this@HeartsActivity, R.string.toast_error_min_hearts_space, Toast.LENGTH_LONG).show()
                } else {
                    Toast.makeText(this@HeartsActivity, R.string.toast_error_min_hearts, Toast.LENGTH_LONG).show()
                }
            } else {
                val progressDialog: ProgressDialog = ProgressDialog(this@HeartsActivity)
                if (mWatch.modelInt!! >= 5) {
                    progressDialog.setMessage(getString(R.string.progress_saving_hearts_space))
                } else {
                    progressDialog.setMessage(getString(R.string.progress_saving_hearts))
                }
                progressDialog.show()
                mWatch.saveInBackground { e: ParseException? ->
                    if(!isDestroyed && !isFinishing) progressDialog.dismiss()
                    if(e != null){
                        mWatch.revert()
                        Log.d(TAG, "Parse:incrementHearts", e)
                        CrashlyticsLog.recordNonFatalError(e, "Error on sending stars/hearts to the SoyMomo")
                        if (mWatch.modelInt!! >= 5) {
                            Toast.makeText(this@HeartsActivity, R.string.toast_error_saving_hearts_space, Toast.LENGTH_LONG).show()
                        } else {
                            Toast.makeText(this@HeartsActivity, R.string.toast_error_saving_hearts, Toast.LENGTH_LONG).show()
                        }
                    }
                    mAdapter.totalHearts = mWatch.getInt("hearts")
                    binding.tvHearts.text = mWatch.getInt("hearts").toString()
                }
            }
        }
        
        binding.buttonAddEvent.setOnClickListener {
            val heartReward = ParseObject.create("HeartReward")
            heartReward.put("completed", false)
            heartReward.put("watch", mWatch)
            onEditReward(heartReward)
        }
    }

    override fun onResume() {
        super.onResume()
        if(mWearerId == null) finish()
        mViewModel.loadWatch(mWearerId!!)
    }

    override fun onDeleteReward(reward: ParseObject) {
        mAdapter.removeObject(reward)
        checkVisibility()
    }

    private fun checkVisibility() {
        if(mAdapter.itemCount == 0){
            if(binding.viewSwitcher.nextView.id == R.id.layout_empty_rewards) binding.viewSwitcher.showNext()
        } else {
            if(binding.viewSwitcher.nextView.id == R.id.rewards_recycler_view) binding.viewSwitcher.showNext()
        }
    }

    override fun onRewardCompleted() {
        mViewModel.refreshWatch()
    }

    override fun onEditReward(reward: ParseObject) {
        val fragment = HeartRewardDialogFragment.newInstance(reward, mWatch.modelInt!! == 5)
        fragment.show(supportFragmentManager, "HeartReward")
    }

    override fun onHeartReward(reward: ParseObject) {
        mAdapter.addObject(reward)
        checkVisibility()
    }

    private fun setupEdgeToEdge() {
        Timber.d("HeartsActivity: setupEdgeToEdge")

        // Store original FAB margin
        val fabParams = binding.buttonAddEvent.layoutParams as CoordinatorLayout.LayoutParams
        fabOriginalBottomMargin = fabParams.bottomMargin

        // Set dark status bar appearance (colorPrimary is dark purple)
        WindowCompat.getInsetsController(window, window.decorView).isAppearanceLightStatusBars = false

        ViewCompat.setOnApplyWindowInsetsListener(binding.root) { view, windowInsets ->
            val systemBars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars())
            val displayCutout = windowInsets.getInsets(WindowInsetsCompat.Type.displayCutout())
            val navigationBars = windowInsets.getInsets(WindowInsetsCompat.Type.navigationBars())

            Timber.d("HeartsActivity: systemBars $systemBars")
            Timber.d("HeartsActivity: displayCutout $displayCutout")
            Timber.d("HeartsActivity: navigationBars $navigationBars")

            // Apply top padding to AppBarLayout to extend colorPrimary background into status bar area
            binding.appbar.setPadding(
                systemBars.left.coerceAtLeast(displayCutout.left),
                systemBars.top.coerceAtLeast(displayCutout.top),
                systemBars.right.coerceAtLeast(displayCutout.right),
                binding.appbar.paddingBottom
            )

            // Apply bottom insets conditionally based on navigation type
            val shouldApplyBottomInsets = EdgeToEdgeUtils.hasButtonNavigation(applicationContext)
            val bottomPadding = if (shouldApplyBottomInsets) {
                navigationBars.bottom.coerceAtLeast(displayCutout.bottom)
            } else {
                0
            }

            Timber.d("HeartsActivity: shouldApplyBottomInsets $shouldApplyBottomInsets, bottomPadding $bottomPadding")

            // Apply bottom margin to FAB for navigation bar
            fabParams.bottomMargin = fabOriginalBottomMargin + bottomPadding
            binding.buttonAddEvent.layoutParams = fabParams

            windowInsets
        }
    }
}