package com.sosmartlabs.momo.chat.presentation.activity

import android.content.Intent
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import androidx.activity.addCallback
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.os.bundleOf
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.navigation.NavController
import androidx.navigation.findNavController
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.chat.presentation.viewmodel.SharedChatListViewModel
import com.sosmartlabs.momo.databinding.ActivityChatListBinding
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.firebase.FirebaseRemoteConfigRepository
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.utils.Constants
import com.sosmartlabs.momo.utils.EdgeToEdgeUtils
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber

@AndroidEntryPoint
class ChatListActivity : AppCompatActivity() {

    private lateinit var binding: ActivityChatListBinding
    private val sharedChatListViewModel: SharedChatListViewModel by viewModels()
    private var launchMode: ChatListLaunchMode = ChatListLaunchMode.LIST_ALLOWED

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Timber.d("ChatListActivity: onCreate() - Starting activity creation")
        CrashlyticsLog.log("ChatListActivity: Starting activity creation")

        launchMode = resolveLaunchMode(intent)
        enableEdgeToEdge()
        binding = ActivityChatListBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setupEdgeToEdge()
        setupBackHandling()

        if (launchMode == ChatListLaunchMode.LIST_BLOCKED) {
            Timber.d("ChatListActivity: Blocking chat list launch because list is hidden and no chat target was provided")
            finish()
            return
        }

        if (savedInstanceState == null) {
            openUnifiedChatFromIntent(intent)
        }

        sharedChatListViewModel.loadWatchUsers()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        launchMode = resolveLaunchMode(intent)
        if (launchMode == ChatListLaunchMode.LIST_BLOCKED) {
            Timber.d("ChatListActivity: Blocking chat list launch on new intent because list is hidden and no chat target was provided")
            finish()
            return
        }
        openUnifiedChatFromIntent(intent)
    }

    private fun openUnifiedChatFromIntent(sourceIntent: Intent?) {
        if (launchMode == ChatListLaunchMode.LIST_BLOCKED) {
            finish()
            return
        }

        val groupId = sourceIntent?.getStringExtra(Constants.EXTRA_GROUP_ID)
        val groupName = sourceIntent?.getStringExtra(Constants.EXTRA_GROUP_NAME)
        if (!groupId.isNullOrBlank()) {
            binding.navHostFragmentChatGroups.post {
                runCatching {
                    navController().navigate(
                        R.id.unifiedChatFragment,
                        bundleOf(
                            "wearer" to null,
                            "groupId" to groupId,
                            "groupName" to groupName
                        )
                    )
                }.onFailure { throwable ->
                    Timber.e(throwable, "ChatListActivity: Failed to navigate to unified group chat from intent")
                    CrashlyticsLog.recordNonFatalError(
                        throwable,
                        "ChatListActivity: Failed to navigate to unified group chat from intent"
                    )
                    blockListFallbackAfterDirectChatFailure()
                }
            }
            return
        }

        val wearer = try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                sourceIntent?.getParcelableExtra(Constants.EXTRA_WATCH, Wearer::class.java)
            } else {
                @Suppress("DEPRECATION")
                sourceIntent?.getParcelableExtra(Constants.EXTRA_WATCH)
            }
        } catch (e: Exception) {
            Timber.e(e, "ChatListActivity: Failed to extract wearer from notification intent")
            null
        }

        if (wearer == null) {
            blockListFallbackAfterDirectChatFailure()
            return
        }

        binding.navHostFragmentChatGroups.post {
            runCatching {
                navController().navigate(
                    R.id.unifiedChatFragment,
                    bundleOf(
                        "wearer" to wearer,
                        "groupId" to null,
                        "groupName" to null
                    )
                )
            }.onFailure { throwable ->
                Timber.e(throwable, "ChatListActivity: Failed to navigate to unified chat from intent")
                CrashlyticsLog.recordNonFatalError(
                    throwable,
                    "ChatListActivity: Failed to navigate to unified chat from intent"
                )
                blockListFallbackAfterDirectChatFailure()
            }
        }
    }

    private fun setupEdgeToEdge() {
        Timber.d("ChatListActivity: setupEdgeToEdge")

        // Set status bar and window background color to match AppBarLayout background
        val purpleColor = ContextCompat.getColor(this, R.color.background_sim_step_card_title)
        window.statusBarColor = purpleColor
        window.navigationBarColor = Color.TRANSPARENT
        WindowCompat.getInsetsController(window, window.decorView).isAppearanceLightStatusBars = false
        WindowCompat.getInsetsController(window, window.decorView).isAppearanceLightNavigationBars = true

        ViewCompat.setOnApplyWindowInsetsListener(binding.root) { view, windowInsets ->
            val systemBars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars())
            val displayCutout = windowInsets.getInsets(WindowInsetsCompat.Type.displayCutout())
            val navigationBars = windowInsets.getInsets(WindowInsetsCompat.Type.navigationBars())

            Timber.d("ChatListActivity: systemBars $systemBars")
            Timber.d("ChatListActivity: displayCutout $displayCutout")
            Timber.d("ChatListActivity: navigationBars $navigationBars")

            // Don't apply top padding to NavHostFragment - let fragments handle their own AppBarLayout insets
            // Only apply side padding for display cutouts
            binding.navHostFragmentChatGroups.setPadding(
                systemBars.left.coerceAtLeast(displayCutout.left),
                0, // No top padding - fragments will handle AppBarLayout extension
                systemBars.right.coerceAtLeast(displayCutout.right),
                0
            )

            // Apply bottom insets conditionally based on navigation type
            val shouldApplyBottomInsets = EdgeToEdgeUtils.hasButtonNavigation(applicationContext)
            val bottomPadding = if (shouldApplyBottomInsets) {
                navigationBars.bottom.coerceAtLeast(displayCutout.bottom)
            } else {
                0
            }

            Timber.d("ChatListActivity: shouldApplyBottomInsets $shouldApplyBottomInsets, bottomPadding $bottomPadding")

            // Apply bottom padding to NavHostFragment for navigation bar
            binding.navHostFragmentChatGroups.setPadding(
                binding.navHostFragmentChatGroups.paddingLeft,
                binding.navHostFragmentChatGroups.paddingTop,
                binding.navHostFragmentChatGroups.paddingRight,
                bottomPadding
            )

            windowInsets
        }
    }

    private fun setupBackHandling() {
        onBackPressedDispatcher.addCallback(this) {
            handleBackNavigation()
        }
    }

    fun handleBackNavigation(): Boolean {
        Timber.d("ChatListActivity: handleBackNavigation() mode=$launchMode")
        CrashlyticsLog.log("ChatListActivity: Handling back navigation for mode=$launchMode")

        val navController = navController()
        val shouldFinishDirectChat =
            launchMode == ChatListLaunchMode.DIRECT_CHAT_NO_LIST_FALLBACK &&
                navController.currentDestination?.id == R.id.unifiedChatFragment

        if (shouldFinishDirectChat) {
            Timber.d("ChatListActivity: Finishing activity instead of revealing hidden chat list")
            finish()
            return true
        }

        val navigated = navController.navigateUp()
        Timber.d("ChatListActivity: navigateUp() result=$navigated")
        CrashlyticsLog.log("ChatListActivity: navigateUp() result=$navigated")
        if (!navigated) {
            finish()
        }
        return true
    }

    // Temporary rollout bridge:
    // while the chat list is hidden for part of the audience, direct chat entry points still need
    // special back behavior. Remove this mode resolution and the related fallback paths once the
    // chat-group rollout reaches 100% and the chat list is always available.
    private fun resolveLaunchMode(sourceIntent: Intent?): ChatListLaunchMode {
        val isListHidden = FirebaseRemoteConfigRepository.chatGroupListIsHidden
        if (!isListHidden) {
            return ChatListLaunchMode.LIST_ALLOWED
        }

        return when {
            !sourceIntent?.getStringExtra(Constants.EXTRA_GROUP_ID).isNullOrBlank() -> ChatListLaunchMode.DIRECT_CHAT_NO_LIST_FALLBACK
            sourceIntent?.hasExtra(Constants.EXTRA_WATCH) == true -> ChatListLaunchMode.DIRECT_CHAT_NO_LIST_FALLBACK
            else -> ChatListLaunchMode.LIST_BLOCKED
        }
    }

    private fun blockListFallbackAfterDirectChatFailure() {
        if (launchMode == ChatListLaunchMode.DIRECT_CHAT_NO_LIST_FALLBACK) {
            Timber.d("ChatListActivity: Finishing after direct chat launch failure to avoid exposing hidden chat list")
            finish()
        }
    }

    private fun navController(): NavController = findNavController(R.id.nav_host_fragment_chat_groups)

    override fun onSupportNavigateUp(): Boolean {
        Timber.d("ChatListActivity: onSupportNavigateUp() - Attempting navigation up")
        CrashlyticsLog.log("ChatListActivity: Attempting navigation up")

        return handleBackNavigation()
    }

}
