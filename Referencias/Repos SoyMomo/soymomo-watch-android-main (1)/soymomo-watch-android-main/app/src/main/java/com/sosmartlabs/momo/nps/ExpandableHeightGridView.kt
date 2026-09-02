package com.sosmartlabs.momo.nps

import android.content.Context
import android.util.AttributeSet
import android.widget.GridView

/**
 * GridView that measures tall enough to show all rows when placed inside a
 * NestedScrollView or other container that passes UNSPECIFIED for height.
 * The default GridView only measures one row's worth of height in that case.
 */
class ExpandableHeightGridView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0,
) : GridView(context, attrs, defStyleAttr) {

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        val expandSpec = MeasureSpec.makeMeasureSpec(
            Int.MAX_VALUE shr 2,
            MeasureSpec.AT_MOST,
        )
        super.onMeasure(widthMeasureSpec, expandSpec)
        layoutParams.height = measuredHeight
    }
}
