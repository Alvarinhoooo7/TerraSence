package com.sosmartlabs.momotabletpadres.main.ui.adapter

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.databinding.ItemTabletMainSelectorBinding
import com.sosmartlabs.momotabletpadres.models.MainCardTabletUser
import com.bumptech.glide.Glide
import com.sosmartlabs.momotabletpadres.glide.loadEncryptedProfilePicture
import timber.log.Timber

/**
 * Strip of profile-picture "selectors". The highlight is derived purely from a
 * single [selectedIndex] in [onBindViewHolder] — there is intentionally NO
 * position→holder map (the previous one was keyed by position and never
 * cleared, so under recycling/onResume it highlighted the wrong avatars and
 * could go out of bounds). Selection changes repaint only the two affected
 * positions via a payload bind, so the avatar image is not reloaded on a
 * highlight-only change.
 *
 * Selection coordination (which avatar is selected, scrolling the main pager,
 * recentering this strip) lives in MainActivity; this adapter just renders and
 * reports clicks.
 */
class TabletSelectorAdapter :
    ListAdapter<MainCardTabletUser, TabletSelectorViewHolder>(TabletUserDiffCallback()) {

    /** Invoked when a real (non-add) avatar is tapped, with its tablet objectId.
     *  Identity (not position) so the caller resolves it against the main list and
     *  can't pick the wrong device during a reload's two-submitList window. */
    var onTabletSelected: ((String?) -> Unit)? = null

    /** Invoked when the trailing "add tablet" avatar is tapped. */
    var onAddClicked: (() -> Unit)? = null

    private var selectedIndex = RecyclerView.NO_POSITION

    companion object {
        private val SELECTION_PAYLOAD = Any()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): TabletSelectorViewHolder {
        val binding = ItemTabletMainSelectorBinding.inflate(
            LayoutInflater.from(parent.context), parent, false)
        return TabletSelectorViewHolder(binding)
    }

    override fun onBindViewHolder(holder: TabletSelectorViewHolder, position: Int) {
        val item = getItem(position)
        setImage(holder, item)
        if (item.tablet == null) {
            holder.vProfilePicture.setOnClickListener {
                Timber.d("TabletSelectorAdapter: Add tablet button clicked")
                onAddClicked?.invoke()
            }
        } else {
            holder.vProfilePicture.setOnClickListener {
                // Use the live binding position, never the bound-time position,
                // so a tap on a recycled holder selects what the user sees.
                val pos = holder.bindingAdapterPosition
                if (pos != RecyclerView.NO_POSITION) {
                    val tabletId = getItem(pos).tablet?.objectId
                    Timber.d("TabletSelectorAdapter: Tablet selected id=$tabletId")
                    onTabletSelected?.invoke(tabletId)
                }
            }
        }
        applyHighlight(holder, position)
    }

    override fun onBindViewHolder(
        holder: TabletSelectorViewHolder,
        position: Int,
        payloads: MutableList<Any>
    ) {
        // Highlight-only update: repaint stroke/alpha without touching the image.
        if (payloads.contains(SELECTION_PAYLOAD)) {
            applyHighlight(holder, position)
        } else {
            super.onBindViewHolder(holder, position, payloads)
        }
    }

    private fun setImage(holder: TabletSelectorViewHolder, item: MainCardTabletUser) {
        val tablet = item.tablet
        if (tablet == null) {
            holder.vProfilePicture.setImageResource(R.drawable.ic_add_tablet_button)
        } else {
            // Match the main card: load the encrypted picture (with unencrypted
            // URL and default-avatar fallbacks) so the selector stays in sync
            // instead of only ever showing the unencrypted/placeholder image.
            Glide.with(holder.vProfilePicture)
                .loadEncryptedProfilePicture(tablet)
                .error(R.drawable.default_profile_pic)
                .into(holder.vProfilePicture)
        }
    }

    private fun applyHighlight(holder: TabletSelectorViewHolder, position: Int) {
        if (position !in 0 until itemCount) return
        val item = getItem(position)
        val avatar = holder.vProfilePicture

        // The add button is always full-opacity with the default (white) stroke
        // and can never carry a selection ring.
        if (item.tablet == null) {
            avatar.setStrokeColorResource(R.color.white)
            avatar.imageAlpha = 255
            avatar.contentDescription = avatar.context.getString(R.string.main_selector_add_device)
            return
        }

        val isSelected = position == selectedIndex
        val strokeColor = when {
            isSelected && item.isConnected -> R.color.colorPrimary
            isSelected -> R.color.momo_error_background
            else -> R.color.white
        }
        avatar.setStrokeColorResource(strokeColor)
        avatar.imageAlpha = if (isSelected) 255 else 127

        // Accessibility: announce the device name, and that it is the selected
        // one. Set here (not just in the full bind) so the payload-only
        // selection update keeps the description in sync.
        val name = item.tablet.profileName.orEmpty()
        avatar.contentDescription = if (isSelected) {
            avatar.context.getString(R.string.main_selector_selected_device, name)
        } else {
            name
        }
    }

    /**
     * Moves the highlight to [index], repainting only the previously- and
     * newly-selected positions. Both notifications are bounds-checked so a stale
     * index left over from a larger list (after the list shrinks) can never
     * trigger an out-of-range bind.
     */
    fun setSelectedIndex(index: Int) {
        if (index == selectedIndex) return
        val old = selectedIndex
        selectedIndex = index
        if (old in 0 until itemCount) notifyItemChanged(old, SELECTION_PAYLOAD)
        if (index in 0 until itemCount) notifyItemChanged(index, SELECTION_PAYLOAD)
    }
}
