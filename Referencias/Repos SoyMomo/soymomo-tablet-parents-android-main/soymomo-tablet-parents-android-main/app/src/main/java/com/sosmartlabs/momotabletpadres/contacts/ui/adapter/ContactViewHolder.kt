package com.sosmartlabs.momotabletpadres.contacts.ui.adapter

import android.widget.TextView
import androidx.appcompat.widget.SwitchCompat
import androidx.cardview.widget.CardView
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.imageview.ShapeableImageView
import com.google.android.material.progressindicator.CircularProgressIndicator
import com.sosmartlabs.momotabletpadres.databinding.ItemContactBinding

class ContactViewHolder(binding: ItemContactBinding): RecyclerView.ViewHolder(binding.root){

    // View Bindings
    val contactCard : CardView = binding.contactCard
    val contactIcon : ShapeableImageView = binding.contactIcon
    val contactName : TextView = binding.contactName
    val contactPhone : TextView = binding.contactPhone
    val contactSwitch : SwitchCompat = binding.contactSwitch
    val contactProgress: CircularProgressIndicator = binding.contactProgress

}