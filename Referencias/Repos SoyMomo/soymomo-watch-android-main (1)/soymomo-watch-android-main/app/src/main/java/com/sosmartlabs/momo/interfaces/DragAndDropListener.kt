package com.sosmartlabs.momo.interfaces

interface DragAndDropListener {
    fun onViewMoved(oldPosition: Int, newPosition: Int)
    fun onDragAndDropEnded()
}