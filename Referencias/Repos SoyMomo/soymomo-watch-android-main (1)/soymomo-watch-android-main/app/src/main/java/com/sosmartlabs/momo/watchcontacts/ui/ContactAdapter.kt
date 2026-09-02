package com.sosmartlabs.momo.watchcontacts.ui

import android.animation.ObjectAnimator
import android.content.Context
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.bumptech.glide.request.RequestOptions
import com.parse.ParseCloud
import com.parse.ParseObject
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.ItemContactBinding
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.interfaces.DragAndDropListener
import com.sosmartlabs.momo.interfaces.ItemTouchHelperViewHolder
import com.sosmartlabs.momo.utils.DisplayUtils
import com.sosmartlabs.momo.utils.ui.DefaultIcons
import com.sosmartlabs.momo.watchcontacts.WatchContactsActivity
import com.sosmartlabs.momo.watchcontacts.model.Contact
import java.util.*

/**
 * RecyclerView adapter for watch contacts with drag & drop support
 * @author mrgcl
 */
class ContactAdapter(
    private var contacts: MutableList<Contact>,
    private val context: Context
) : RecyclerView.Adapter<ContactAdapter.ContactViewHolder>(), DragAndDropListener {
    
    private var isDirty = false
    private var sosCount = 0
    
    init {
        countSOS()
    }
    
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ContactViewHolder {
        val binding = ItemContactBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return ContactViewHolder(binding)
    }
    
    override fun onBindViewHolder(holder: ContactViewHolder, position: Int) {
        holder.setIsRecyclable(false)
        val contact = contacts[position]
        
        with(holder.binding) {
            // Load contact image
            if (contact.has("picture")) {
                Glide.with(context)
                    .load(contact.picture?.url)
                    .apply(RequestOptions.circleCropTransform())
                    .into(contactImage)
            } else {
                contactImage.setImageResource(DefaultIcons.PROFILE_MOMO_CLASSIC)
            }
            
            // Set contact info
            contactName.text = contact.getString("name")
            contactPhone.text = contact.getString("phone")
            
            // SOS switch handling
            val sos = contact.has("sos") && contact.getBoolean("sos")
            watchSosSwitch.isChecked = sos
            sosLabel.isEnabled = sos
            watchSosSwitch.setOnCheckedChangeListener { _, isChecked ->
                if (isChecked && sosCount >= 1) {
                    (context as WatchContactsActivity).showSnackbar(context.getString(R.string.snackbar_sos_only_one_contact))
                    watchSosSwitch.isChecked = false
                } else {
                    sosCount += if (isChecked) 1 else -1
                    contact.put("sos", isChecked)
                    contact.saveInBackground { e ->
                        if (e != null) {
                            CrashlyticsLog.recordNonFatalError(e, "Error on saving SOS in contact")
                        }
                    }
                    sosLabel.isEnabled = isChecked
                    isDirty = true
                }
            }
            
            // Chat switch handling (hidden for now)
            val chatEnabled = contact.has("chatEnabled") && contact.getBoolean("chatEnabled")
            watchChatSwitch.isChecked = chatEnabled
            chatLabel.isEnabled = chatEnabled
            watchChatSwitch.setOnCheckedChangeListener { _, isChecked ->
                contact.put("chatEnabled", isChecked)
                contact.saveInBackground { e ->
                    if (e != null) {
                        CrashlyticsLog.recordNonFatalError(e, "Error on enabling chat in contact")
                    }
                }
                chatLabel.isEnabled = isChecked
                isDirty = true
            }
            watchChatSwitch.visibility = View.GONE
            chatLabel.visibility = View.GONE
            
            // Delete button
            buttonDeleteContact.setOnClickListener {
                val toBeDeleted = contacts[holder.adapterPosition]
                if (toBeDeleted.has("sos") && toBeDeleted.getBoolean("sos")) {
                    sosCount--
                }
                toBeDeleted.deleteInBackground { e ->
                    if (e != null) {
                        (context as WatchContactsActivity).showSnackbar(context.getString(R.string.snackbar_contact_error_deleting))
                        CrashlyticsLog.recordNonFatalError(e, "Could not delete SOS contact")
                    } else {
                        (context as WatchContactsActivity).showSnackbar(context.getString(R.string.snackbar_contact_deleted))
                        if (holder.adapterPosition != RecyclerView.NO_POSITION) {
                            contacts.removeAt(holder.adapterPosition)
                        }
                        isDirty = true
                        notifyDataSetChanged()
                    }
                }
            }
            
            // Edit button
            buttonEditContact.setOnClickListener {
                (context as WatchContactsActivity).createEditContactDialog(contact, position)
                isDirty = true
            }
            
            // Contact image click
            contactImage.setOnClickListener {
                (context as WatchContactsActivity).createEditContactDialog(contact, position)
                isDirty = true
            }
            contactImage.visibility = View.GONE
        }
    }
    
    override fun getItemCount(): Int = contacts.size
    
    fun updateData(newData: List<Contact>) {
        contacts = newData.toMutableList()
        isDirty = false
        countSOS()
        notifyDataSetChanged()
    }
    
    fun addContact(contact: Contact) {
        contacts.add(contact)
        if (contact.has("sos") && contact.getBoolean("sos")) {
            sosCount++
        }
        notifyItemInserted(contacts.size - 1)
        isDirty = true
    }
    
    private fun countSOS() {
        sosCount = 0
        for (contact in contacts) {
            if (contact.has("sos") && contact.getBoolean("sos")) {
                sosCount++
            }
        }
    }
    
    fun sendContacts() {
        if (isDirty) {
            val needToSave = ArrayList<ParseObject>()
            for (i in contacts.indices) {
                val contact = contacts[i]
                contact.put("position", i)
                if (contact.isDirty) {
                    needToSave.add(contact)
                }
            }
            
            if (needToSave.isNotEmpty()) {
                ParseObject.saveAllInBackground(needToSave) { e ->
                    if (e == null) {
                        val params = hashMapOf("deviceId" to (context as WatchContactsActivity).getWearerDeviceId())
                        ParseCloud.callFunctionInBackground<Any>("wContacts", params) { _, e1 ->
                            if (e1 != null) {
                                CrashlyticsLog.recordNonFatalError(e1, "Error in wContacts cloud function")
                            }
                        }
                    } else {
                        CrashlyticsLog.recordNonFatalError(e, "Error on saving contacts")
                    }
                }
            } else {
                val params = hashMapOf("deviceId" to (context as WatchContactsActivity).getWearerDeviceId())
                ParseCloud.callFunctionInBackground<Any>("wContacts", params) { _, e ->
                    if (e != null) {
                        CrashlyticsLog.recordNonFatalError(e, "Error in wContacts cloud function")
                    }
                }
            }
            isDirty = false
        }
    }
    
    override fun onViewMoved(oldPosition: Int, newPosition: Int) {
        isDirty = true
        Collections.swap(contacts, oldPosition, newPosition)
        notifyItemMoved(oldPosition, newPosition)
    }
    
    override fun onDragAndDropEnded() {
        // Do nothing
    }
    
    inner class ContactViewHolder(val binding: ItemContactBinding) : 
        RecyclerView.ViewHolder(binding.root), ItemTouchHelperViewHolder {
        
        override fun onItemSelected() {
            val animator = ObjectAnimator.ofFloat(
                binding.card, 
                "cardElevation", 
                binding.card.cardElevation, 
                DisplayUtils.dpToPx(8F, context)
            )
            animator.start()
        }
        
        override fun onItemCleared() {
            val animator = ObjectAnimator.ofFloat(
                binding.card, 
                "cardElevation", 
                binding.card.cardElevation, 
                DisplayUtils.dpToPx(1F, context)
            )
            animator.start()
        }
    }
}
