package com.sosmartlabs.momo.watchcontacts.ui

import android.content.Context
import android.content.DialogInterface
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import android.widget.ViewFlipper
import androidx.appcompat.app.AlertDialog
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.bumptech.glide.request.RequestOptions
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.watchcontacts.WatchContactsActivity

class ContactAvatarAdapter(
    private val mContext: Context,
    private val mViewFlipper: ViewFlipper,
    private val mImage: ImageView
) : RecyclerView.Adapter<ContactAvatarAdapter.ContactAvatarViewHolder>() {

    private val avatars = arrayOf(
        R.drawable.avatar_person
    )

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ContactAvatarViewHolder {
        val v = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_contact_avatar, parent, false)
        return ContactAvatarViewHolder(v)
    }

    override fun onBindViewHolder(holder: ContactAvatarViewHolder, position: Int) {
        val avatar = avatars[position]

        // Glide replacing Picasso
        Glide.with(holder.itemView)
            .load(avatar)
            .into(holder.vContactAvatar)

        if (position == 0) {
            holder.vContactAvatarText.visibility = View.VISIBLE

            holder.vContactAvatar.setOnClickListener {
                val activity = mContext as WatchContactsActivity

                val items = arrayOf(
                    mContext.getString(R.string.photo_take_new),
                    mContext.getString(R.string.photo_select_from_gallery)
                )

                val builder = AlertDialog.Builder(mContext)
                builder.setTitle(mContext.getString(R.string.change_photo))

                builder.setItems(items) { _, item ->
                    when (item) {
                        0 -> {
                            if (activity.hasPermissions()) {
                                activity.takePicture()
                            } else {
                                activity.askForPermissions()
                            }
                        }

                        1 -> {
                            activity.selectPicture()
                        }
                    }
                }

                builder.setNegativeButton(R.string.button_cancel) { dialogInterface: DialogInterface, _ ->
                    dialogInterface.dismiss()
                }

                builder.show()
            }

        } else {

            holder.vContactAvatarText.visibility = View.INVISIBLE

            holder.vContactAvatar.setOnClickListener {

                Glide.with(mContext)
                    .load(avatar)
                    .apply(RequestOptions.circleCropTransform())
                    .into(mImage)

                mViewFlipper.displayedChild = 0
            }
        }
    }

    override fun getItemCount(): Int {
        return avatars.size
    }

    class ContactAvatarViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        val vContactAvatar: ImageView = itemView.findViewById(R.id.avatar)
        val vContactAvatarText: TextView = itemView.findViewById(R.id.avatar_text)
    }
}