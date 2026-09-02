package com.sosmartlabs.momo.phonebook.ui

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.ContactsContract
import androidx.activity.result.contract.ActivityResultContract

/**
 * ActivityResultContact for selecting a phone contact from device phonebook.
 * Based in [androidx.activity.result.contract.ActivityResultContracts.PickContact] implementation
 */
class PickPhoneContact: ActivityResultContract<Void?, Uri?>() {
    override fun createIntent(context: Context, input: Void?): Intent {
        return Intent(Intent.ACTION_PICK)
            .setType(ContactsContract.CommonDataKinds.Phone.CONTENT_TYPE)
    }

    override fun parseResult(resultCode: Int, intent: Intent?): Uri? {
        return if (resultCode == Activity.RESULT_OK && intent != null) intent.data!! else null
    }
}