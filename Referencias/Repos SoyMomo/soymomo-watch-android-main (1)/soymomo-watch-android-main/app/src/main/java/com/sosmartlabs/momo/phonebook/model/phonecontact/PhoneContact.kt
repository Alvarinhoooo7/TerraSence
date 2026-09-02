package com.sosmartlabs.momo.phonebook.model.phonecontact

import com.parse.ParseClassName
import com.parse.ParseFile
import com.parse.ParseObject
import com.parse.ktx.delegates.ParseDelegate
import com.sosmartlabs.momo.models.Wearer

/**
 * Class that represents a Phone Contact in Parse database
 */
@ParseClassName("PhoneContact")
class PhoneContact: ParseObject() {
    /**
     * Position of contact in contact list.
     * Nullable: rows created by other writers (watch firmware, iOS, legacy versions)
     * may lack the field, and a non-null Int would NPE on unboxing when read.
     */
    var position by ParseDelegate<Int?>(null)

    /**
     * Name of contact
     */
    var name by ParseDelegate<String>(null)

    /**
     * Phone number of contact
     */
    var phone by ParseDelegate<String>(null)

    /**
     * SoyMomo watch this contact belongs
     */
    var watch by ParseDelegate<Wearer>(null)

    /**
     * Indicates if this contact is a SOS contact
     */
    var sos by ParseDelegate<Boolean>(null)

    /**
     * Image associated to contact, if any
     */
    var image by ParseDelegate<ParseFile?>(null)

    /**
     * Indicates if this contact is a favorite
     */
    var isFamily by ParseDelegate<Boolean?>(null)
}