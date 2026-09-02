package com.sosmartlabs.momotabletpadres.sharedprefs

import android.content.Context
import android.content.SharedPreferences
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Parks the tablet object id parsed from an incoming deep link
 * (soymomo-tablet://link/<id> or https://soymomo.com/link/tablet/<id>)
 * so it survives the auth-routing dance in DispatchActivity, the login
 * flow when the user isn't signed in, and process recreation while the
 * parent navigates back to MainActivity.
 *
 * Drained by MainActivity.onResume which then launches LinkDeviceActivity
 * with the id prefilled into the input field.
 *
 * Single-purpose intentionally: the existing kitchen-sink SharedPrefs
 * class is full of bitmap helpers and would obscure intent here.
 */
@Singleton
class LinkInvitationPrefs @Inject constructor(
    @ApplicationContext context: Context
) {

    private val preferences: SharedPreferences =
        context.getSharedPreferences(FILE, Context.MODE_PRIVATE)

    fun setPendingTabletId(tabletId: String?) {
        // Guard against garbage. Crucially this does NOT clear an existing
        // value on invalid input, so a malformed link can never wipe an
        // already-parked valid invitation.
        if (!isValidTabletId(tabletId)) return
        preferences.edit().putString(KEY_PENDING_TABLET_ID, tabletId).apply()
    }

    /** Reads and clears the pending id. Returns null if nothing was parked. */
    fun consumePendingTabletId(): String? {
        val id = preferences.getString(KEY_PENDING_TABLET_ID, null)
        if (id != null) {
            preferences.edit().remove(KEY_PENDING_TABLET_ID).apply()
        }
        return id
    }

    companion object {
        private const val FILE = "link_invitation_prefs"
        private const val KEY_PENDING_TABLET_ID = "pending_tablet_id"

        // Same shape as the cloud-side / soymomo-com validation: Parse object
        // ids are alphanumeric, typically 10 chars. We accept 6..32 to be
        // tolerant of future schema changes while still rejecting garbage.
        private val TABLET_ID_REGEX = Regex("^[A-Za-z0-9]{6,32}$")

        /**
         * True if [id] matches the expected tablet object-id shape. This is the
         * single source of truth for id validation; the deep-link parser uses
         * it too, so garbage is rejected before it is ever logged or parked.
         */
        fun isValidTabletId(id: String?): Boolean =
            !id.isNullOrBlank() && TABLET_ID_REGEX.matches(id)
    }
}
