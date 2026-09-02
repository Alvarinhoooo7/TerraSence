package com.sosmartlabs.momo.watchlock.ui

import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.PorterDuff
import android.graphics.PorterDuffColorFilter
import android.graphics.RectF
import android.graphics.drawable.Drawable
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.ItemTouchHelper
import androidx.recyclerview.widget.RecyclerView
import com.sosmartlabs.momo.R

/**
 * Reveals a circular red trash chip behind a row as the user swipes left.
 * The chip scales up + fades in proportionally to swipe progress, so the
 * affordance feels closer to a floating button than a full-bleed bar.
 *
 * Actual deletion is delegated to [onSwiped] via the host activity, which
 * shows a confirmation dialog before mutating the list.
 */
class SilenceTimeSwipeCallback(
    private val context: android.content.Context,
    private val onSwiped: (position: Int) -> Unit,
) : ItemTouchHelper.SimpleCallback(0, ItemTouchHelper.LEFT) {

    private val accent = ContextCompat.getColor(context, R.color.colorAccent)
    private val trashIcon: Drawable? = ContextCompat.getDrawable(context, R.drawable.ic_trash_white_24dp)?.mutate()?.apply {
        colorFilter = PorterDuffColorFilter(Color.WHITE, PorterDuff.Mode.SRC_IN)
    }
    private val chipPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = accent }
    private val shadowPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = (accent and 0x00FFFFFF) or 0x55000000
    }

    private val chipDiameterPx = dp(52f)
    private val trailingMarginPx = dp(20f)

    override fun isLongPressDragEnabled(): Boolean = false

    override fun getSwipeThreshold(viewHolder: RecyclerView.ViewHolder): Float = 0.45f

    override fun onMove(
        recyclerView: RecyclerView,
        viewHolder: RecyclerView.ViewHolder,
        target: RecyclerView.ViewHolder,
    ): Boolean = false

    override fun onSwiped(viewHolder: RecyclerView.ViewHolder, direction: Int) {
        onSwiped(viewHolder.bindingAdapterPosition)
    }

    override fun onChildDraw(
        canvas: Canvas,
        recyclerView: RecyclerView,
        viewHolder: RecyclerView.ViewHolder,
        dX: Float,
        dY: Float,
        actionState: Int,
        isCurrentlyActive: Boolean,
    ) {
        super.onChildDraw(canvas, recyclerView, viewHolder, dX, dY, actionState, isCurrentlyActive)
        if (dX >= 0f) return

        val itemView = viewHolder.itemView
        val rowCenterY = (itemView.top + itemView.bottom) / 2f

        val maxReveal = chipDiameterPx + trailingMarginPx * 2f
        val progress = (-dX / maxReveal).coerceIn(0f, 1f)
        val scale = 0.7f + 0.3f * progress
        val alpha = (255f * progress).toInt().coerceIn(0, 255)

        val chipHalf = (chipDiameterPx / 2f) * scale
        val chipCx = itemView.right.toFloat() - trailingMarginPx - chipHalf
        // Rounded-square (squircle) action chip — sits in the same M3 corner family
        // as the row cards instead of a plain circle.
        val cornerRadius = chipHalf * 0.55f

        chipPaint.alpha = alpha
        shadowPaint.alpha = (alpha * 0.5f).toInt()

        val chipRect = RectF(chipCx - chipHalf, rowCenterY - chipHalf, chipCx + chipHalf, rowCenterY + chipHalf)
        val shadowRect = RectF(chipRect.left, chipRect.top + dp(2f), chipRect.right, chipRect.bottom + dp(2f))
        canvas.drawRoundRect(shadowRect, cornerRadius, cornerRadius, shadowPaint)
        canvas.drawRoundRect(chipRect, cornerRadius, cornerRadius, chipPaint)

        trashIcon?.let { icon ->
            val iconHalf = (dp(18f) * scale).toInt()
            icon.alpha = alpha
            icon.setBounds(
                (chipCx - iconHalf).toInt(),
                (rowCenterY - iconHalf).toInt(),
                (chipCx + iconHalf).toInt(),
                (rowCenterY + iconHalf).toInt(),
            )
            icon.draw(canvas)
        }
    }

    private fun dp(value: Float): Float = value * context.resources.displayMetrics.density
}
