package com.sosmartlabs.momo.db

import android.os.Parcel
import android.os.Parcelable
import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Ignore
import androidx.room.PrimaryKey

/**
 * @author mrg
 * @date 11/13/17
 */

@Entity(tableName = "ContactRequest")
data class ContactRequest(@ColumnInfo(name = "watch_id") val watchId: String): Parcelable {
    @PrimaryKey(autoGenerate = true)
    var id: Int = 0

    @Ignore
    constructor(parcel: Parcel) : this(parcel.readString()!!) {
        id = parcel.readInt()
    }

    override fun writeToParcel(parcel: Parcel, flags: Int) {
        parcel.writeString(watchId)
        parcel.writeInt(id)
    }

    override fun describeContents(): Int {
        return 0
    }

    companion object CREATOR : Parcelable.Creator<ContactRequest> {
        override fun createFromParcel(parcel: Parcel): ContactRequest {
            return ContactRequest(parcel)
        }

        override fun newArray(size: Int): Array<ContactRequest?> {
            return arrayOfNulls(size)
        }
    }
}