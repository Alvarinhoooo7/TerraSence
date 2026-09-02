package com.sosmartlabs.momo.lingo.svg

import android.graphics.Picture
import android.graphics.drawable.Drawable
import android.graphics.drawable.PictureDrawable
import android.util.LruCache
import android.view.View
import android.widget.ImageView
import androidx.lifecycle.findViewTreeLifecycleOwner
import androidx.lifecycle.lifecycleScope
import com.bumptech.glide.Glide
import com.bumptech.glide.request.target.CustomTarget
import com.bumptech.glide.request.transition.Transition
import com.caverock.androidsvg.SVG
import com.sosmartlabs.momo.R
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import timber.log.Timber
import java.io.File

// Rendered SVG pictures keyed by URL. Parsing/rendering an SVG is CPU work; caching
// the immutable Picture lets repeated binds (e.g. during scroll) skip it entirely.
// A fresh PictureDrawable wraps the cached Picture per use so bounds/callbacks are
// never shared across ImageViews.
private val svgPictureCache = LruCache<String, Picture>(64)

/**
 * Loads an SVG from [url] into this ImageView.
 *
 * The file download is delegated to Glide (disk-cached); the SVG parse + render is
 * done off the main thread on [Dispatchers.Default] and applied back on the main
 * thread. A per-view generation token guards against RecyclerView recycling so a
 * slow async result never lands on a row that has since been rebound.
 */
fun ImageView.loadLingoSvg(url: String?) {
    // Bump the generation token; any in-flight async result for a previous bind on
    // this recycled view will see a mismatch and bail.
    val token = (getTag(R.id.lingo_svg_token) as? Int ?: 0) + 1
    setTag(R.id.lingo_svg_token, token)

    // PictureDrawable requires a software rendering layer.
    setLayerType(View.LAYER_TYPE_SOFTWARE, null)

    if (url == null) {
        setImageResource(R.drawable.ic_lingo_word_placeholder)
        return
    }

    // Fast path: already-rendered picture, set synchronously (cheap).
    svgPictureCache.get(url)?.let { cached ->
        setImageDrawable(PictureDrawable(cached))
        return
    }

    setImageResource(R.drawable.ic_lingo_word_placeholder)

    val imageView = this
    Glide.with(this)
        .download(url)
        .into(object : CustomTarget<File>() {
            override fun onResourceReady(resource: File, transition: Transition<in File>?) {
                val owner = imageView.findViewTreeLifecycleOwner() ?: return
                owner.lifecycleScope.launch {
                    val picture = withContext(Dispatchers.Default) {
                        runCatching {
                            resource.inputStream().use { SVG.getFromInputStream(it).renderToPicture() }
                        }.onFailure {
                            Timber.w(it, "SvgImageLoader: failed to render SVG for $url")
                        }.getOrNull()
                    }
                    picture?.let { svgPictureCache.put(url, it) }
                    // Discard if this view was recycled onto a different word.
                    if (imageView.getTag(R.id.lingo_svg_token) != token) return@launch
                    if (picture != null) {
                        imageView.setImageDrawable(PictureDrawable(picture))
                    } else {
                        imageView.setImageResource(R.drawable.ic_lingo_word_placeholder)
                    }
                }
            }

            override fun onLoadCleared(placeholder: Drawable?) {
                setImageResource(R.drawable.ic_lingo_word_placeholder)
            }

            override fun onLoadFailed(errorDrawable: Drawable?) {
                if (imageView.getTag(R.id.lingo_svg_token) == token) {
                    setImageResource(R.drawable.ic_lingo_word_placeholder)
                }
            }
        })
}
