package com.sosmartlabs.momo.chat.presentation.view

import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.util.AttributeSet
import android.view.View
import com.sosmartlabs.momo.R
import kotlin.math.abs
import kotlin.math.min

class AudioWaveformView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    private var amplitudes: IntArray = IntArray(0)
    private var progress: Float = 0f

    private var barWidth: Float
    private var barGap: Float
    private var barCornerRadius: Float

    private val filledPaint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val unfilledPaint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val barRect = RectF()

    private companion object {
        const val DEFAULT_BAR_WIDTH_DP = 3f
        const val DEFAULT_BAR_GAP_DP = 1.5f
        const val DEFAULT_BAR_CORNER_RADIUS_DP = 1.5f
        const val MIN_BAR_HEIGHT_FRACTION = 0.12f
        const val MAX_AMPLITUDE = 127f
    }

    init {
        val density = context.resources.displayMetrics.density
        val a = context.obtainStyledAttributes(attrs, R.styleable.AudioWaveformView, defStyleAttr, 0)
        barWidth = a.getDimension(R.styleable.AudioWaveformView_waveformBarWidth, DEFAULT_BAR_WIDTH_DP * density)
        barGap = a.getDimension(R.styleable.AudioWaveformView_waveformBarGap, DEFAULT_BAR_GAP_DP * density)
        barCornerRadius = a.getDimension(R.styleable.AudioWaveformView_waveformBarCornerRadius, DEFAULT_BAR_CORNER_RADIUS_DP * density)
        filledPaint.color = a.getColor(R.styleable.AudioWaveformView_waveformFilledColor, 0xFFFFFFFF.toInt())
        unfilledPaint.color = a.getColor(R.styleable.AudioWaveformView_waveformUnfilledColor, 0x66FFFFFF)
        a.recycle()
    }

    fun setAmplitudes(amplitudes: IntArray) {
        this.amplitudes = amplitudes
        invalidate()
    }

    fun setProgress(progress: Float) {
        this.progress = progress.coerceIn(0f, 1f)
        invalidate()
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val w = width - paddingLeft - paddingRight
        val h = height - paddingTop - paddingBottom
        if (w <= 0 || h <= 0) return

        val maxBars = ((w + barGap) / (barWidth + barGap)).toInt()
        if (maxBars <= 0) return

        val barCount: Int
        val displayAmplitudes: IntArray

        if (amplitudes.isNotEmpty()) {
            barCount = min(amplitudes.size, maxBars)
            displayAmplitudes = if (amplitudes.size <= maxBars) {
                amplitudes
            } else {
                resample(amplitudes, barCount)
            }
        } else {
            barCount = maxBars
            displayAmplitudes = IntArray(0)
        }

        val totalBarsWidth = barCount * barWidth + (barCount - 1) * barGap
        val startX = paddingLeft + (w - totalBarsWidth) / 2f
        val centerY = paddingTop + h / 2f
        val maxBarHeight = h.toFloat()

        val progressX = startX + progress * totalBarsWidth

        for (i in 0 until barCount) {
            val amplitude = if (displayAmplitudes.isNotEmpty()) {
                displayAmplitudes[i].coerceIn(0, MAX_AMPLITUDE.toInt())
            } else {
                (MAX_AMPLITUDE * MIN_BAR_HEIGHT_FRACTION).toInt()
            }

            val fraction = (amplitude / MAX_AMPLITUDE).coerceAtLeast(MIN_BAR_HEIGHT_FRACTION)
            val barHeight = fraction * maxBarHeight

            val left = startX + i * (barWidth + barGap)
            val top = centerY - barHeight / 2f
            val right = left + barWidth
            val bottom = centerY + barHeight / 2f

            barRect.set(left, top, right, bottom)
            val paint = if (right <= progressX) filledPaint else unfilledPaint
            canvas.drawRoundRect(barRect, barCornerRadius, barCornerRadius, paint)
        }
    }

    private fun resample(source: IntArray, targetCount: Int): IntArray {
        val result = IntArray(targetCount)
        val ratio = source.size.toFloat() / targetCount
        for (i in 0 until targetCount) {
            val srcStart = (i * ratio).toInt()
            val srcEnd = min(((i + 1) * ratio).toInt(), source.size)
            var sum = 0L
            for (j in srcStart until srcEnd) {
                sum += abs(source[j])
            }
            result[i] = if (srcEnd > srcStart) (sum / (srcEnd - srcStart)).toInt() else 0
        }
        return result
    }
}
