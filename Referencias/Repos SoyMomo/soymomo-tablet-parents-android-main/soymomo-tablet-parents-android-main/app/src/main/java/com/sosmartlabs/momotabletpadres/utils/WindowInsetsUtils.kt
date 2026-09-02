package com.sosmartlabs.momotabletpadres.utils

import android.view.View
import android.view.ViewGroup
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

/**
 * Edge-to-edge window-inset helpers.
 *
 * The app targets SDK 36 and runs on Android 15+ where edge-to-edge is
 * system-enforced: the status and navigation bars are ALWAYS transparent and
 * content is laid out behind them. `window.statusBarColor` /
 * `window.navigationBarColor` are deprecated no-ops on these versions. These
 * helpers re-apply the system-bar insets as padding / margin so content, lists
 * and buttons are never hidden behind a system bar — in both gesture and
 * 3-button navigation.
 *
 * Each helper captures the view's ORIGINAL padding / margin once (at call time,
 * i.e. the value declared in XML) and always recomputes from that constant, so
 * repeated inset dispatches (rotation, multi-window, IME) never accumulate.
 *
 * Note: for these helpers to receive insets, no ancestor on the path may consume
 * them first — remove any `android:fitsSystemWindows="true"` from the activity /
 * fragment root and let these listeners distribute the insets explicitly.
 */
object WindowInsetsUtils {

    /**
     * Distributes the system-bar insets from a SINGLE listener attached to [root]:
     *
     *  - [topView] (e.g. a Toolbar / AppBarLayout / colored header) receives the
     *    top status-bar (and display-cutout) inset as TOP PADDING. Because the
     *    inset is applied as padding, the view's background still extends behind
     *    the status bar while its content is pushed clear of it. Set
     *    [topAsMargin] = true to apply it as TOP MARGIN instead — required for a
     *    FIXED-HEIGHT header, where padding would compress its content; the
     *    status-bar strip then shows the root background (so the root should be the
     *    same color as the header).
     *  - [bottomView] (e.g. a ScrollView / NestedScrollView / RecyclerView, or a
     *    button pinned to the bottom) receives the bottom navigation-bar (and
     *    cutout) inset. By default it is applied as BOTTOM PADDING; set
     *    [bottomAsMargin] = true to apply it as BOTTOM MARGIN instead, which suits
     *    buttons positioned by margin / constraints (so the button height is not
     *    altered).
     *
     * Pass null for a side that should be left untouched (e.g. screens whose top
     * already reserves space via a guideline).
     *
     * Set [includeImeBottom] = true on form screens so the bottom view also clears
     * the soft keyboard: the bottom inset becomes max(navigation-bar, IME). The
     * host activity must use `android:windowSoftInputMode="adjustResize"` for the
     * IME inset to be dispatched here (rather than the window panning).
     */
    fun applyEdgeToEdgeInsets(
        root: View,
        topView: View? = null,
        bottomView: View? = null,
        topAsMargin: Boolean = false,
        bottomAsMargin: Boolean = false,
        extraTopPx: Int = 0,
        extraBottomPx: Int = 0,
        includeImeBottom: Boolean = false,
    ) {
        val topPaddingOriginal = topView?.paddingTop ?: 0
        val topMarginOriginal =
            (topView?.layoutParams as? ViewGroup.MarginLayoutParams)?.topMargin ?: 0
        val bottomPaddingOriginal = bottomView?.paddingBottom ?: 0
        val bottomMarginOriginal =
            (bottomView?.layoutParams as? ViewGroup.MarginLayoutParams)?.bottomMargin ?: 0

        ViewCompat.setOnApplyWindowInsetsListener(root) { _, insets ->
            val bars = insets.getInsets(
                WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout()
            )

            topView?.let { tv ->
                if (topAsMargin) {
                    // For a FIXED-HEIGHT colored header, push the whole view below the
                    // status bar via TOP MARGIN instead of padding (padding would
                    // compress its fixed-height content). The status-bar strip then
                    // shows the root background, so this suits a header drawn over a
                    // same-colored root.
                    (tv.layoutParams as? ViewGroup.MarginLayoutParams)?.let { lp ->
                        lp.topMargin = topMarginOriginal + bars.top + extraTopPx
                        tv.layoutParams = lp
                    }
                } else {
                    tv.setPadding(
                        tv.paddingLeft,
                        topPaddingOriginal + bars.top + extraTopPx,
                        tv.paddingRight,
                        tv.paddingBottom
                    )
                }
            }

            // Keep the bottom view above whichever is taller: the navigation bar or
            // the soft keyboard (when [includeImeBottom] is set on a form screen).
            val imeBottom = if (includeImeBottom) {
                insets.getInsets(WindowInsetsCompat.Type.ime()).bottom
            } else 0
            val bottomInset = maxOf(bars.bottom, imeBottom)

            bottomView?.let { bv ->
                if (bottomAsMargin) {
                    (bv.layoutParams as? ViewGroup.MarginLayoutParams)?.let { lp ->
                        lp.bottomMargin = bottomMarginOriginal + bottomInset + extraBottomPx
                        bv.layoutParams = lp
                    }
                } else {
                    bv.setPadding(
                        bv.paddingLeft,
                        bv.paddingTop,
                        bv.paddingRight,
                        bottomPaddingOriginal + bottomInset + extraBottomPx
                    )
                }
            }

            insets
        }
        ViewCompat.requestApplyInsets(root)
    }

    /**
     * Convenience for the most common case: add the bottom navigation-bar inset as
     * BOTTOM PADDING to a single scrollable / content view (ScrollView,
     * NestedScrollView, RecyclerView, …). The listener is attached to the view
     * itself, so the view must receive un-consumed insets (see class note).
     */
    fun applyBottomInsetAsPadding(view: View, extraPx: Int = 0, includeImeBottom: Boolean = false) =
        applyEdgeToEdgeInsets(
            root = view,
            bottomView = view,
            extraBottomPx = extraPx,
            includeImeBottom = includeImeBottom,
        )

    /**
     * Convenience: add the bottom navigation-bar inset as BOTTOM MARGIN to a
     * button (or any view) pinned to the bottom edge. [listenerRoot] is the view
     * the inset listener is attached to — pass the fragment / activity root so the
     * inset is observed even though the margin is applied to [view].
     */
    fun applyBottomInsetAsMargin(
        listenerRoot: View,
        view: View,
        extraPx: Int = 0,
        includeImeBottom: Boolean = false,
    ) =
        applyEdgeToEdgeInsets(
            root = listenerRoot,
            bottomView = view,
            bottomAsMargin = true,
            extraBottomPx = extraPx,
            includeImeBottom = includeImeBottom,
        )

    /**
     * Variant of [applyBottomInsetAsMargin] for SEVERAL bottom-pinned views that
     * share one [listenerRoot] (e.g. a row of buttons). Calling the single-view
     * overload once per view on the SAME root does NOT work:
     * [ViewCompat.setOnApplyWindowInsetsListener] keeps a single listener per view,
     * so each call overwrites the previous one and only the last view is ever
     * lifted. This registers ONE listener that updates the bottom margin of every
     * view in [views] from its own captured original margin.
     */
    fun applyBottomInsetAsMargin(
        listenerRoot: View,
        views: List<View>,
        extraPx: Int = 0,
        includeImeBottom: Boolean = false,
    ) {
        val originalMargins = views.map {
            (it.layoutParams as? ViewGroup.MarginLayoutParams)?.bottomMargin ?: 0
        }
        ViewCompat.setOnApplyWindowInsetsListener(listenerRoot) { _, insets ->
            val bars = insets.getInsets(
                WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout()
            )
            val imeBottom = if (includeImeBottom) {
                insets.getInsets(WindowInsetsCompat.Type.ime()).bottom
            } else 0
            val bottomInset = maxOf(bars.bottom, imeBottom)

            views.forEachIndexed { i, view ->
                (view.layoutParams as? ViewGroup.MarginLayoutParams)?.let { lp ->
                    lp.bottomMargin = originalMargins[i] + bottomInset + extraPx
                    view.layoutParams = lp
                }
            }

            insets
        }
        ViewCompat.requestApplyInsets(listenerRoot)
    }
}
