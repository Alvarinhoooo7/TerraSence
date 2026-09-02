package com.sosmartlabs.momo.newowner.ui

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.parse.ParseObject
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.ItemUserBinding

/**
 * Lists the watch's co-managers so the admin can hand ownership to one of them.
 * @author mrgcl — modernized to ListAdapter + ViewBinding + DiffUtil.
 */
class UserAdapter(
    private val onUserSelected: (ParseObject) -> Unit
) : ListAdapter<ParseObject, UserAdapter.UserViewHolder>(DiffCallback()) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): UserViewHolder {
        val binding = ItemUserBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return UserViewHolder(binding)
    }

    override fun onBindViewHolder(holder: UserViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    inner class UserViewHolder(private val binding: ItemUserBinding) :
        RecyclerView.ViewHolder(binding.root) {

        fun bind(watchUser: ParseObject) = with(binding) {
            val user = watchUser.getParseUser("user")
            val firstName = if (user?.has("firstName") == true) user.getString("firstName").orEmpty() else ""
            val lastName = if (user?.has("lastName") == true) user.getString("lastName").orEmpty() else ""
            userName.text = root.context.getString(R.string.item_watch_name, firstName, lastName)

            Glide.with(root.context)
                .load(user?.getParseFile("image")?.url)
                .placeholder(R.drawable.ic_default_avatar)
                .error(R.drawable.ic_default_avatar)
                .into(userAvatar)

            containerCard.setOnClickListener { onUserSelected(watchUser) }
        }
    }

    private class DiffCallback : DiffUtil.ItemCallback<ParseObject>() {
        override fun areItemsTheSame(oldItem: ParseObject, newItem: ParseObject): Boolean =
            oldItem.objectId == newItem.objectId

        override fun areContentsTheSame(oldItem: ParseObject, newItem: ParseObject): Boolean =
            oldItem.objectId == newItem.objectId
    }
}
