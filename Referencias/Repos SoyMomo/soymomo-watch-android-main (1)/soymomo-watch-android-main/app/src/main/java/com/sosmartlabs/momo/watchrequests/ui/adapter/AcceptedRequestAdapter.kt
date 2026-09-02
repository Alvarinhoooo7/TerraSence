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
import com.sosmartlabs.momo.databinding.ItemAcceptedRequestBinding
import com.sosmartlabs.momo.models.WatchUser
import com.sosmartlabs.momo.watchrequests.model.UserPermission

class AcceptedRequestAdapter(private val context: Context) :
    ListAdapter<WatchUser, AcceptedRequestAdapter.AcceptedViewHolder>(WatchUserDiffCallback()) {

    interface Listener {
        fun onItemClickListener(watchUser: WatchUser)
    }

    var listener: Listener? = null

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): AcceptedViewHolder {
        val binding = ItemAcceptedRequestBinding.inflate(
            LayoutInflater.from(parent.context), parent, false
        )
        return AcceptedViewHolder(binding)
    }

    override fun onBindViewHolder(holder: AcceptedViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    private fun buildAccessSummary(permission: UserPermission?): String {
        if (permission == null) return context.getString(R.string.watch_request_access_none)
        val enabled = with(permission) {
            listOf(call, videocall, messages, location, edit).count { it }
        }
        return when (enabled) {
            0 -> context.getString(R.string.watch_request_access_none)
            5 -> context.getString(R.string.watch_request_access_full)
            else -> context.getString(R.string.watch_request_access_limited)
        }
    }

    inner class AcceptedViewHolder(private val binding: ItemAcceptedRequestBinding) :
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
            accessSummary.text = buildAccessSummary(request.userPermission)

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

            containerCard.contentDescription =
                context.getString(R.string.watch_request_edit_description, displayName)
            containerCard.setOnClickListener { listener?.onItemClickListener(request) }
        }
    }
}
