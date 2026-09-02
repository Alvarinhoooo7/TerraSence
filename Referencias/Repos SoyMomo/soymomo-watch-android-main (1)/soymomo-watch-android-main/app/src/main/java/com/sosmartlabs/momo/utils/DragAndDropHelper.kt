package com.sosmartlabs.momo.utils

import androidx.recyclerview.widget.ItemTouchHelper
import androidx.recyclerview.widget.RecyclerView
import com.sosmartlabs.momo.interfaces.DragAndDropListener
import com.sosmartlabs.momo.interfaces.ItemTouchHelperViewHolder

class DragAndDropHelper(private val listener: DragAndDropListener): ItemTouchHelper.Callback(){
    override fun getMovementFlags(p0: RecyclerView, p1: RecyclerView.ViewHolder): Int {
        val dragFlags = ItemTouchHelper.UP or ItemTouchHelper.DOWN or ItemTouchHelper.LEFT or ItemTouchHelper.RIGHT
        return makeMovementFlags(dragFlags, 0)
    }

    override fun onMove(recyclerView: RecyclerView, viewHolder1: RecyclerView.ViewHolder, viewHolder2: RecyclerView.ViewHolder): Boolean {
        listener.onViewMoved(viewHolder1.adapterPosition, viewHolder2.adapterPosition)
        return true
    }

    override fun onSwiped(p0: RecyclerView.ViewHolder, p1: Int) {
        // Do nothing
    }

    override fun onSelectedChanged(viewHolder: RecyclerView.ViewHolder?, actionState: Int) {
        if (actionState != ItemTouchHelper.ACTION_STATE_IDLE) {
            (viewHolder as? ItemTouchHelperViewHolder)?.onItemSelected()
        }
        super.onSelectedChanged(viewHolder, actionState)
    }

    override fun clearView(recyclerView: RecyclerView, viewHolder: RecyclerView.ViewHolder) {
        super.clearView(recyclerView, viewHolder)
        (viewHolder as? ItemTouchHelperViewHolder)?.onItemCleared()
        listener.onDragAndDropEnded()
    }
}