package com.sosmartlabs.momo.watchrequests.ui.adapter

import android.content.Context
import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.bumptech.glide.load.resource.bitmap.RoundedCorners
import com.bumptech.glide.request.RequestOptions
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.ItemPendingRequestBinding
import com.sosmartlabs.momo.models.WatchUser

class PendingRequestAdapter(private val context: Context) :
    ListAdapter<WatchUser, PendingRequestAdapter.PendingViewHolder>(WatchUserDiffCallback()) {

    interface Listener {
        fun onAcceptClickListener(user: WatchUser)
        fun onRejectClickListener(user: WatchUser)
    }

    var listener: Listener? = null

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): PendingViewHolder {
        val binding = ItemPendingRequestBinding.inflate(
            LayoutInflater.from(parent.context), parent, false
        )
        return PendingViewHolder(binding)
    }

    override fun onBindViewHolder(holder: PendingViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    inner class PendingViewHolder(private val binding: ItemPendingRequestBinding) :
        RecyclerView.ViewHolder(binding.root) {

        fun bind(request: WatchUser) = with(binding) {
            val user = request.user
            val firstName = if (user?.has("firstName") == true) {
                user.getString("firstName")
            } else {
                context.getString(R.string.user_no_name)
            }
            val lastName = if (user?.has("lastName") == true) user.getString("lastName") else ""
            val displayName = context.getString(R.string.item_watch_name, firstName, lastName)

            userName.text = displayName
            requestSubtitle.text = user?.email?.takeIf { it.isNotBlank() }
                ?: context.getString(R.string.watch_request_pending_subtitle)

            val image = user?.getParseFile("image")
            if (image != null) {
                Glide.with(contactImage.context)
                    .load(image.url)
                    .apply(RequestOptions.bitmapTransform(RoundedCorners(8)))
                    .placeholder(R.drawable.ic_default_avatar)
                    .into(contactImage)
            } else {
                contactImage.setImageResource(R.drawable.ic_default_avatar)
            }

            buttonAccept.contentDescription =
                context.getString(R.string.watch_request_accept_description, displayName)
            buttonReject.contentDescription =
                context.getString(R.string.watch_request_reject_description, displayName)

            buttonAccept.setOnClickListener { listener?.onAcceptClickListener(request) }
            buttonReject.setOnClickListener { listener?.onRejectClickListener(request) }
        }
    }
}
