package com.sosmartlabs.momo.phonebook.ui

import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Path
import android.graphics.Typeface
import android.util.AttributeSet
import android.view.View

private enum class FavoriteState {
    SAVED,
    NOT_SAVED,
}

class CustomFavoriteView constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
): View(context, attrs, defStyleAttr) {

    private var state: FavoriteState = FavoriteState.NOT_SAVED

    private val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
        textAlign = Paint.Align.CENTER
        textSize = 55.0f
        typeface = Typeface.create( "", Typeface.BOLD)
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)

        val path = createHeartPath(canvas.clipBounds.right, canvas.clipBounds.bottom)
        canvas.drawPath(path, paint)
    }

    private fun createHeartPath(width: Int, height: Int): Path {
        val path = Path()
        val pX = width / 2f
        val pY = height / 100f * 33.33f
        var x1 = width / 100f * 50
        var y1 = height / 100f * 5
        var x2 = width / 100f * 90
        var y2 = height / 100f * 10
        var x3 = width / 100f * 90
        var y3 = height / 100f * 33.33f
        path.moveTo(pX, pY)
        path.cubicTo(x1, y1, x2, y2, x3, y3)
        path.moveTo(x3, pY)
        x1 = width / 100f * 90
        y1 = height / 100f * 55f
        x2 = width / 100f * 65
        y2 = height / 100f * 60f
        x3 = width / 100f * 50
        y3 = height / 100f * 90f
        path.cubicTo(x1, y1, x2, y2, x3, y3)
        path.lineTo(pX, pY)
        x1 = width / 100f * 50
        y1 = height / 100f * 5
        x2 = width / 100f * 10
        y2 = height / 100f * 10
        x3 = width / 100f * 10
        y3 = height / 100f * 33.33f
        path.moveTo(pX, pY)
        path.cubicTo(x1, y1, x2, y2, x3, y3)
        path.moveTo(x3, pY)
        x1 = width / 100f * 10
        y1 = height / 100f * 55f
        x2 = width / 100f * 35f
        y2 = height / 100f * 60f
        x3 = width / 100f * 50f
        y3 = height / 100f * 90f
        path.cubicTo(x1, y1, x2, y2, x3, y3)
        path.lineTo(pX, pY)
        path.moveTo(x3, y3)
        path.close()
        return path
    }
}