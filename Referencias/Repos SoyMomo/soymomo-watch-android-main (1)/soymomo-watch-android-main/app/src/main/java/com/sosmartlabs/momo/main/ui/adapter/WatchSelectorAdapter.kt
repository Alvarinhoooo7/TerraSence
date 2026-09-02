package com.sosmartlabs.momo.main.ui.adapter

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.bumptech.glide.load.resource.drawable.DrawableTransitionOptions
import com.sosmartlabs.momo.R
import jp.wasabeef.glide.transformations.BlurTransformation
import com.sosmartlabs.momo.databinding.ItemWatchMainSelectorBinding
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.main.model.MainCardWatchUser
import com.sosmartlabs.momo.utils.ui.DefaultIcons
import timber.log.Timber

/**
 * Strip of profile-picture "selectors". The highlight is derived purely from a
 * single [selectedIndex] in [applyHighlight] — there is intentionally NO
 * position→holder map (the previous `boundHolders` set was re-highlighted on
 * every scroll/bind and could repaint stale, recycled holders). Selection changes
 * repaint only the two affected positions via a [SELECTION_PAYLOAD] bind, so the
 * avatar image is not reloaded on a highlight-only change.
 *
 * Coordination (which avatar is selected, panning this strip with the pager, the
 * ring cross-fade) lives in MainActivity; this adapter just renders and reports
 * taps via [onWatchSelected]. The selector list mirrors the card list 1:1, so a
 * position here maps directly to a card position.
 */
class WatchSelectorAdapter :
    ListAdapter<MainCardWatchUser, WatchSelectorViewHolder>(WatchUserDiffCallback()) {

    /** Invoked when an avatar is tapped, with its live binding position. */
    var onWatchSelected: ((Int) -> Unit)? = null

    private var selectedIndex = RecyclerView.NO_POSITION

    companion object {
        private val SELECTION_PAYLOAD = Any()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): WatchSelectorViewHolder {
        return try {
            val binding = ItemWatchMainSelectorBinding.inflate(
                LayoutInflater.from(parent.context), parent, false
            )
            WatchSelectorViewHolder(binding)
        } catch (e: Exception) {
            Timber.e(e, "WatchSelectorAdapter: Error creating ViewHolder")
            CrashlyticsLog.recordNonFatalError(e, "WatchSelectorAdapter: Error creating ViewHolder")
            throw e
        }
    }

    override fun onBindViewHolder(holder: WatchSelectorViewHolder, position: Int) {
        try {
            val mainCardWatchUser = getItem(position)
            setImage(holder, mainCardWatchUser, position)
            setListener(holder)
            applyHighlight(holder, position)
        } catch (e: Exception) {
            Timber.e(e, "WatchSelectorAdapter: Error binding ViewHolder at position $position")
            CrashlyticsLog.recordNonFatalError(e, "WatchSelectorAdapter: Error binding ViewHolder at position $position")
        }
    }

    override fun onBindViewHolder(
        holder: WatchSelectorViewHolder,
        position: Int,
        payloads: MutableList<Any>
    ) {
        // Highlight-only update: repaint stroke/alpha without touching the image.
        // The Unit payload from updateElement() must fall through to a full rebind
        // so a live watch-data change still refreshes the avatar image.
        if (payloads.contains(SELECTION_PAYLOAD)) {
            applyHighlight(holder, position)
        } else {
            super.onBindViewHolder(holder, position, payloads)
        }
    }

    override fun onCurrentListChanged(
        previousList: MutableList<MainCardWatchUser>,
        currentList: MutableList<MainCardWatchUser>
    ) {
        super.onCurrentListChanged(previousList, currentList)
        // Keep the selected index in range if the list shrank, so a stale index
        // from a larger list can never trigger an out-of-range bind.
        if (currentList.isEmpty()) {
            selectedIndex = RecyclerView.NO_POSITION
        } else if (selectedIndex != RecyclerView.NO_POSITION && selectedIndex !in currentList.indices) {
            selectedIndex = selectedIndex.coerceIn(0, currentList.lastIndex)
        }
    }

    fun updateElement(cardWatchUser: MainCardWatchUser) {
        val watch = cardWatchUser.watchUser.watch
        val index = currentList.indexOfFirst { current ->
            val currentWatch = current.watchUser.watch ?: return@indexOfFirst false
            currentWatch.objectId == watch?.objectId || currentWatch.deviceId == watch?.deviceId
        }
        if (index >= 0) {
            notifyItemChanged(index, Unit)
        } else {
            Timber.w("WatchSelectorAdapter: updateElement() - Skipping update, watch not found in currentList")
        }
    }

    /**
     * Moves the highlight to [index], repainting only the previously- and
     * newly-selected positions via a payload bind (no image reload). Both
     * notifications are bounds-checked so a stale index can never trigger an
     * out-of-range bind.
     */
    fun setSelectedIndex(index: Int) {
        if (index == selectedIndex) return
        val old = selectedIndex
        selectedIndex = index
        if (old in 0 until itemCount) notifyItemChanged(old, SELECTION_PAYLOAD)
        if (index in 0 until itemCount) notifyItemChanged(index, SELECTION_PAYLOAD)
    }

    /**
     * Re-asserts the discrete highlight on every bound position via a payload bind,
     * wiping any transient cross-fade stroke/alpha the live drag tracking left on
     * the avatars. Called when a user drag ends so an incomplete swipe (one that
     * snapped back to the same card) never leaves the selected avatar dimmed.
     */
    fun refreshHighlight() {
        if (itemCount > 0) notifyItemRangeChanged(0, itemCount, SELECTION_PAYLOAD)
    }

    private fun setImage(holder: WatchSelectorViewHolder, mainCardWatchUser: MainCardWatchUser, position: Int) {
        try {
            val isActive = mainCardWatchUser.watchUser.active
            val wearer = mainCardWatchUser.watchUser.watch ?: run {
                loadImageWithBlur(holder, DefaultIcons.PROFILE_MOMO_SPACE, isActive)
                return
            }

            val imageUrl = try {
                when {
                    wearer.has("image") -> wearer.getParseFile("image")?.url
                    else -> null
                } ?: DefaultIcons.PROFILE_MOMO_SPACE
            } catch (e: IllegalStateException) {
                Timber.e(e, "WatchSelectorAdapter: Error getting image for wearer at position $position")
                CrashlyticsLog.recordNonFatalError(e, "WatchSelectorAdapter: Error getting image for wearer at position $position")
                DefaultIcons.PROFILE_MOMO_SPACE
            }

            loadImageWithBlur(holder, imageUrl, isActive)
        } catch (e: Exception) {
            Timber.e(e, "WatchSelectorAdapter: Error setting image for position $position")
            CrashlyticsLog.recordNonFatalError(e, "WatchSelectorAdapter: Error setting image for position $position")
        }
    }

    private fun loadImageWithBlur(holder: WatchSelectorViewHolder, imageUrl: Any, isActive: Boolean) {
        val glideRequest = Glide.with(holder.vProfilePicture.context)
            .load(imageUrl)
            .fallback(DefaultIcons.PROFILE_MOMO_SPACE)
            .transition(DrawableTransitionOptions.withCrossFade())

        if (!isActive) {
            glideRequest.transform(BlurTransformation(25, 3))
        }

        glideRequest.into(holder.vProfilePicture)
    }

    private fun setListener(holder: WatchSelectorViewHolder) {
        holder.vProfilePicture.setOnClickListener {
            // Use the live binding position, never the bound-time position, so a
            // tap on a recycled holder selects what the user actually sees.
            val pos = holder.bindingAdapterPosition
            if (pos == RecyclerView.NO_POSITION || pos !in currentList.indices) {
                Timber.w("WatchSelectorAdapter: Ignoring click with invalid adapter position")
                return@setOnClickListener
            }
            onWatchSelected?.invoke(pos)
        }
    }

    private fun applyHighlight(holder: WatchSelectorViewHolder, position: Int) {
        if (position !in 0 until itemCount) return
        val item = getItem(position)
        val watch = item.watchUser.watch
        val avatar = holder.vProfilePicture

        val isSelected = position == selectedIndex
        val isConnected = watch?.isConnected() == true
        val strokeColor = when {
            isSelected && isConnected -> R.color.momo_background
            isSelected -> R.color.momo_error_background
            else -> R.color.white
        }
        avatar.setStrokeColorResource(strokeColor)
        avatar.imageAlpha = if (isSelected) 255 else 127

        // Accessibility: name the avatar and expose its selected state to TalkBack
        // (so selection isn't conveyed by colour alone). Set here — not only in the
        // full bind — so the payload-only selection update keeps it in sync.
        avatar.contentDescription = watch?.name().orEmpty()
        avatar.isSelected = isSelected
    }
}
