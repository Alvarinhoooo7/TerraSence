package com.sosmartlabs.momo.reminders.ui

import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.drawable.ColorDrawable
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.ItemTouchHelper
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.FragmentRemindersListBinding
import com.sosmartlabs.momo.reminders.model.Reminder
import com.sosmartlabs.momo.utils.Resource
import com.sosmartlabs.momo.utils.ui.toolbar.ToolbarConstructor
import timber.log.Timber
import androidx.core.graphics.drawable.toDrawable
import androidx.core.graphics.toColorInt
import com.sosmartlabs.momo.databinding.DialogConfirmDeleteBinding
import kotlin.math.abs
import kotlin.math.min

class RemindersListFragment : Fragment() {

    private lateinit var binding: FragmentRemindersListBinding
    private lateinit var recyclerView: RecyclerView
    private lateinit var adapter: RemindersAdapter

    private lateinit var swipeRefreshLayout: SwipeRefreshLayout

    private val viewModel: RemindersViewModel by activityViewModels()

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        // Inflate the layout for this fragment
        binding = FragmentRemindersListBinding.inflate(inflater, container, false)
        return binding.root

    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupEdgeToEdge()
        setToolbar()
        initViewAdapter()
        setSwipeRefreshLayout()
        addNewReminderFloatingButtonListener()
        observeViewModel()
    }

    private fun setupEdgeToEdge() {
        Timber.d("RemindersListFragment: setupEdgeToEdge")

        ViewCompat.setOnApplyWindowInsetsListener(binding.gpsModeLayout) { view, windowInsets ->
            val systemBars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars())
            val displayCutout = windowInsets.getInsets(WindowInsetsCompat.Type.displayCutout())

            Timber.d("RemindersListFragment: systemBars $systemBars")
            Timber.d("RemindersListFragment: displayCutout $displayCutout")

            // Apply top padding to AppBarLayout to extend colorPrimary background into status bar area
            binding.contentAppBar.setPadding(
                systemBars.left.coerceAtLeast(displayCutout.left),
                systemBars.top.coerceAtLeast(displayCutout.top),
                systemBars.right.coerceAtLeast(displayCutout.right),
                binding.contentAppBar.paddingBottom
            )

            windowInsets
        }
    }

    private fun setToolbar() {
        // Set up toolbar manually for consistent navigation
        (requireActivity() as AppCompatActivity).setSupportActionBar(binding.toolbar)
        (requireActivity() as AppCompatActivity).supportActionBar?.apply {
            title = getString(R.string.reminders)
            setDisplayShowTitleEnabled(true)
            setDisplayHomeAsUpEnabled(true)
            setDisplayShowHomeEnabled(true)
        }
        
        binding.toolbar.setNavigationOnClickListener {
            requireActivity().supportFinishAfterTransition()
        }
    }

    private fun initViewAdapter() {
        recyclerView = binding.reminderListRecyclerView
        adapter = RemindersAdapter(requireContext())
        recyclerView.adapter = adapter
        recyclerView.layoutManager = LinearLayoutManager(requireContext())

        adapter.setListener(object : RemindersAdapter.Listener {
            override fun onItemClickListener(reminder: Reminder) {
                viewModel.setCurrentReminder(reminder)
                val action =
                    RemindersListFragmentDirections.actionRemindersListFragmentToEditReminderDetailsFragment()
                findNavController().navigate(action)
            }

            override fun onItemEnabledChanged(reminder: Reminder, enable: Boolean) {
                viewModel.updateReminderState(reminder, enable)
            }
        })

        val itemTouchHelper = ItemTouchHelper(object : ItemTouchHelper.SimpleCallback(0, ItemTouchHelper.LEFT) {
            val deleteIcon = ContextCompat.getDrawable(requireContext(), R.drawable.ic_trash_white_24dp)!!
            val cornerRadius = 36f

            override fun onMove(
                recyclerView: RecyclerView,
                viewHolder: RecyclerView.ViewHolder,
                target: RecyclerView.ViewHolder
            ): Boolean = false

            override fun getSwipeThreshold(viewHolder: RecyclerView.ViewHolder): Float {
                return 0.3f // Only delete if swiped 30% of width
            }

            override fun onSwiped(viewHolder: RecyclerView.ViewHolder, direction: Int) {
                val position = viewHolder.adapterPosition
                val reminder = adapter.getReminderAt(position)

                val binding = DialogConfirmDeleteBinding.inflate(LayoutInflater.from(requireContext()))
                val dialog = AlertDialog.Builder(requireContext())
                    .setView(binding.root)
                    .setCancelable(false)
                    .create()

                binding.cancelButton.setOnClickListener {
                    adapter.notifyItemChanged(position) // Snap item back
                    dialog.dismiss()
                }

                binding.deleteButton.setOnClickListener {
                    viewModel.removeReminder(reminder)
                    dialog.dismiss()
                }

                dialog.window?.setBackgroundDrawable(Color.TRANSPARENT.toDrawable())
                dialog.show()
            }

            override fun onChildDraw(
                c: Canvas,
                recyclerView: RecyclerView,
                viewHolder: RecyclerView.ViewHolder,
                dX: Float,
                dY: Float,
                actionState: Int,
                isCurrentlyActive: Boolean
            ) {
                val itemView = viewHolder.itemView
                val iconMargin = (itemView.height - deleteIcon.intrinsicHeight) / 2
                val iconTop = itemView.top + iconMargin
                val iconBottom = iconTop + deleteIcon.intrinsicHeight

                // Draw red background with corner radius
                val path = Path().apply {
                    val rect = RectF(itemView.right + dX, itemView.top.toFloat(), itemView.right.toFloat(), itemView.bottom.toFloat())
                    addRoundRect(rect, cornerRadius, cornerRadius, Path.Direction.CW)
                }
                val paint = Paint().apply {
                    color = "#E81E63".toColorInt()
                    style = Paint.Style.FILL
                    isAntiAlias = true
                }
                c.drawPath(path, paint)

                // Fade-in effect based on swipe distance
                val alpha = min(1f, abs(dX) / (itemView.width * 0.3f))
                deleteIcon.alpha = (alpha * 255).toInt()

                // Draw delete icon aligned to the end
                val iconLeft = itemView.right - iconMargin - deleteIcon.intrinsicWidth
                val iconRight = itemView.right - iconMargin
                deleteIcon.setBounds(iconLeft, iconTop, iconRight, iconBottom)
                deleteIcon.draw(c)

                super.onChildDraw(c, recyclerView, viewHolder, dX, dY, actionState, isCurrentlyActive)
            }
        })
        itemTouchHelper.attachToRecyclerView(recyclerView)
    }

    private fun setSwipeRefreshLayout() {
        swipeRefreshLayout = binding.swipeRefreshLayout
        swipeRefreshLayout.setOnRefreshListener {
            viewModel.getReminders()
        }
    }

    private fun observeViewModel() {
        viewModel.reminderList.observe(viewLifecycleOwner) { resource ->
            when (resource.status) {
                Resource.Status.LOADING -> {
                    Timber.d("Loading data")
                    binding.mainViewFlipper.displayedChild = 0
                }
                Resource.Status.LOAD_SUCCESS, Resource.Status.ADDING_SUCCESS, Resource.Status.UPDATING_SUCCESS, Resource.Status.DELETING_SUCCESS -> {
                    Timber.d("Data loaded successfully")
                    if (resource.data.isNullOrEmpty()) {
                        binding.mainViewFlipper.displayedChild = 3
                        swipeRefreshLayout.isRefreshing = false
                        return@observe
                    }
                    adapter.setData(resource.data.asReversed())
                    binding.mainViewFlipper.displayedChild = 1
                    swipeRefreshLayout.isRefreshing = false
                }
                Resource.Status.LOAD_ERROR -> {
                    Timber.e("Error loading data")
                    binding.mainViewFlipper.displayedChild = 2
                    swipeRefreshLayout.isRefreshing = false
                }
                else -> {
                    // NO-OP
                }
            }
        }
        viewModel.currentReminder.observe(viewLifecycleOwner) {
            if (it == null) return@observe
            if (it.status == Resource.Status.UPDATING_SUCCESS || it.status == Resource.Status.DELETING_SUCCESS) {
                // This observer replays a sticky success on every activity restart (rotation),
                // when the reminder list is back to LOADING and the adapter is empty again.
                // There is nothing to refresh then: the LOAD_SUCCESS delivery to the
                // reminderList observer repaints the whole list anyway.
                val reminder = it.data ?: return@observe
                val itemIndex = adapter.indexOf(reminder)
                if (itemIndex < 0) return@observe
                adapter.notifyItemChanged(itemIndex)
            }
        }
    }

    private fun addNewReminderFloatingButtonListener() {
        binding.buttonAddReminderFloating.setOnClickListener {
            val action =
                RemindersListFragmentDirections.actionRemindersListFragmentToReminderDetailsFragment()
            findNavController().navigate(action)
        }
    }
}