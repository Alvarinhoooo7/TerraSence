package com.sosmartlabs.momo.chat.presentation.fragment

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.SearchView
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.fragment.app.viewModels
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import androidx.navigation.fragment.findNavController
import com.sosmartlabs.momo.R
import kotlinx.coroutines.launch
import androidx.recyclerview.widget.LinearLayoutManager
import com.google.android.material.snackbar.Snackbar
import com.sosmartlabs.momo.chat.presentation.adapter.ChatListAdapter
import com.sosmartlabs.momo.chat.presentation.model.ChatListItem
import com.sosmartlabs.momo.chat.presentation.viewmodel.ChatListViewModel
import com.sosmartlabs.momo.chat.presentation.viewmodel.SharedChatListViewModel
import com.sosmartlabs.momo.databinding.ChatListFragmentBinding
import com.sosmartlabs.momo.utils.ui.setupFragmentEdgeToEdge
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber

@AndroidEntryPoint
class ChatListFragment : Fragment() {

    private var _binding: ChatListFragmentBinding? = null
    private val binding get() = _binding!!

    private val viewModel: ChatListViewModel by viewModels()
    private val sharedViewModel: SharedChatListViewModel by activityViewModels()
    private lateinit var adapter: ChatListAdapter
    private var allChats: List<ChatListItem> = emptyList()
    private var hasLoadedChats = false

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        Timber.d("ChatListFragment: onCreateView")
        _binding = ChatListFragmentBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Timber.d("ChatListFragment: onViewCreated")
        
        setupEdgeToEdge()
        setupToolbar()
        setupRecyclerView()
        setupClickListeners()
        setupSearchView()
        setupObservers()
    }

    private fun setupEdgeToEdge() {
        setupFragmentEdgeToEdge(binding.appBarLayout)
    }

    private fun setupToolbar() {
        Timber.d("ChatListFragment: setupToolbar")
        (activity as? AppCompatActivity)?.let { activity ->
            activity.setSupportActionBar(binding.toolbar)
            activity.supportActionBar?.apply {
                title = getString(R.string.chat_list_title)
                setDisplayShowTitleEnabled(true)
                setDisplayHomeAsUpEnabled(true)
                setDisplayShowHomeEnabled(true)
            }
            activity.window.statusBarColor = ContextCompat.getColor(requireContext(), R.color.background_sim_step_card_title)
            activity.window.navigationBarColor = ContextCompat.getColor(requireContext(), R.color.white)
            binding.toolbar.setNavigationOnClickListener {
                requireActivity().finish()
            }
        }
    }

    private fun setupRecyclerView() {
        Timber.d("ChatListFragment: setupRecyclerView")
        adapter = ChatListAdapter { chatItem ->
            onChatItemClicked(chatItem)
        }
        
        binding.chatsRecyclerView.apply {
            layoutManager = LinearLayoutManager(requireContext())
            adapter = this@ChatListFragment.adapter
        }
    }

    private fun setupClickListeners() {
        Timber.d("ChatListFragment: setupClickListeners")
        
        binding.fabNewChat.setOnClickListener {
            Timber.d("ChatListFragment: FAB clicked - navigating to NewChatFragment")
            findNavController().navigate(
                ChatListFragmentDirections.actionChatListToNewChat()
            )
        }
        
        binding.swipeRefreshLayout.setOnRefreshListener {
            Timber.d("ChatListFragment: Swipe refresh triggered")
            sharedViewModel.watchUsers.value?.let { watchUsers ->
                if (watchUsers.isNotEmpty()) {
                    viewModel.loadChats(watchUsers)
                }
            }
        }
    }

    private fun setupSearchView() {
        binding.searchView.setOnQueryTextListener(object : SearchView.OnQueryTextListener {
            override fun onQueryTextSubmit(query: String?): Boolean {
                return false
            }

            override fun onQueryTextChange(newText: String?): Boolean {
                // SearchView forwards its EditText's TextWatcher here, and the IME
                // commits text through a runnable posted to the main looper, so a
                // change can land after onDestroyView has nulled _binding (same
                // race as UnifiedChatFragment's watcher, #277).
                if (_binding == null) return true
                Timber.d("ChatListFragment: Search query changed: $newText")
                filterChats(newText ?: "")
                return true
            }
        })
    }

    private fun filterChats(query: String) {
        val filtered = if (query.isBlank()) {
            allChats
        } else {
            val lowerQuery = query.lowercase()
            allChats.filter { chat ->
                chat.name.lowercase().contains(lowerQuery) ||
                chat.lastMessage.lowercase().contains(lowerQuery)
            }
        }
        adapter.submitList(filtered)
        updateEmptyState(filtered.isEmpty())
    }

    private fun setupObservers() {
        Timber.d("ChatListFragment: setupObservers")
        observeWatchUsers()
        observeActiveChats()
        observeLoadingState()
        //observeErrors()
    }

    private fun observeWatchUsers() {
        sharedViewModel.watchUsers.observe(viewLifecycleOwner) { watchUsers ->
            Timber.d("ChatListFragment: Observed ${watchUsers.size} watch users, hasLoadedChats=$hasLoadedChats")
            if (watchUsers.isNotEmpty() && !hasLoadedChats) {
                hasLoadedChats = true
                viewModel.loadChats(watchUsers)
                // Start LiveQueries bound to the lifecycle
                viewLifecycleOwner.lifecycleScope.launch {
                    viewLifecycleOwner.repeatOnLifecycle(androidx.lifecycle.Lifecycle.State.STARTED) {
                        viewModel.startLiveQueries(watchUsers)
                    }
                }
            }
        }
    }

    private fun observeActiveChats() {
        viewModel.activeChats.observe(viewLifecycleOwner) { chats ->
            Timber.d("ChatListFragment: Received ${chats.size} chats")
            allChats = chats
            // Apply current search filter if any
            val currentQuery = binding.searchView.query?.toString() ?: ""
            filterChats(currentQuery)
        }
    }

    private fun observeLoadingState() {
        viewModel.isLoading.observe(viewLifecycleOwner) { isLoading ->
            Timber.d("ChatListFragment: Observed loading state = $isLoading")
            binding.swipeRefreshLayout.isRefreshing = isLoading
        }
    }

    private fun observeErrors() {
        viewModel.errorMessage.observe(viewLifecycleOwner) { error ->
            error?.let {
                Timber.e("ChatListFragment: Error: $it")
                Snackbar.make(binding.root, it, Snackbar.LENGTH_SHORT).apply {
                    view.setBackgroundColor(ContextCompat.getColor(requireContext(), R.color.colorPrimary))
                    setActionTextColor(ContextCompat.getColor(requireContext(), R.color.white))
                    show()
                }
                viewModel.clearError()
            }
        }
    }

    private fun onChatItemClicked(chatItem: ChatListItem) {
        Timber.d("ChatListFragment: Chat item clicked: ${chatItem.name}, isGroup=${chatItem.isGroup}")

        if (chatItem.isGroup) {
            Timber.d("ChatListFragment: Navigating to unified chat for group ${chatItem.name}")
            findNavController().navigate(
                ChatListFragmentDirections.actionChatListToUnifiedChat(
                    wearer = null,
                    groupId = chatItem.chatId,
                    groupName = chatItem.name
                )
            )
        } else {
            chatItem.watch?.let { wearer ->
                Timber.d("ChatListFragment: Navigating to unified chat for wearer ${chatItem.name}")
                findNavController().navigate(
                    ChatListFragmentDirections.actionChatListToUnifiedChat(
                        wearer = wearer,
                        groupId = null,
                        groupName = null
                    )
                )
            }
        }
    }

    private fun updateEmptyState(isEmpty: Boolean) {
        binding.emptyStateLayout.visibility = if (isEmpty) View.VISIBLE else View.GONE
        binding.chatsRecyclerView.visibility = if (isEmpty) View.GONE else View.VISIBLE
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
