package com.sosmartlabs.momo.watchcontacts.model

import android.graphics.Bitmap
import com.parse.ParseFile
import com.parse.ParseObject
import com.parse.coroutines.suspendFind
import com.parse.coroutines.suspendSave
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.phonebook.model.phonecontact.PhoneContact
import java.io.ByteArrayOutputStream
import javax.inject.Inject

class WatchContactsRepository @Inject constructor() {
    suspend fun getContacts(watch: Wearer) = watch.getRelation<Contact>("contacts").query
        .addAscendingOrder("position")
        .suspendFind()

    /**
     * TODO: Use these functions for handle Parse queries
     */
    suspend fun saveContact(watch: Wearer, contact: Contact) {
        with(contact) {
            if (isDirty) suspendSave()
        }
    }

    /**
     * TODO: Use these functions for handle Parse queries
     */
    suspend fun addNewContact(watch: Wearer, name: String, phone: String, bitmap: Bitmap?, sos: Boolean, chatEnabled: Boolean): Contact {
        var imageFile: ParseFile? = null
        bitmap?.let {
            val stream = ByteArrayOutputStream()
            it.compress(Bitmap.CompressFormat.PNG, 50, stream)
            val data = stream.toByteArray()
            imageFile = ParseFile(data)
            imageFile?.save()
        }
        return Contact().apply {
            this.name = name
            this.phone = phone
            this.sos = sos
            this.chatEnabled = chatEnabled
            this.watch = watch
            this.picture = imageFile
            suspendSave()
            with(watch) {
                getRelation<Contact>("contacts").add(this@apply)
                suspendSave()
            }
        }
    }

    suspend fun addNewContactSpace(watch: Wearer, name: String, phone: String, bitmap: Bitmap?, sos: Boolean) {
        var imageFile: ParseFile? = null
        bitmap?.let {
            val stream = ByteArrayOutputStream()
            it.compress(Bitmap.CompressFormat.PNG, 50, stream)
            val data = stream.toByteArray()
            imageFile = ParseFile(data)
            imageFile?.save()
        }
        PhoneContact().apply {
            this.position = 0
            this.name = name
            this.phone = phone
            this.sos = sos
            this.image = imageFile
            this.watch = ParseObject.createWithoutData("Wearer", watch.objectId) as Wearer
            suspendSave()
        }
    }


}