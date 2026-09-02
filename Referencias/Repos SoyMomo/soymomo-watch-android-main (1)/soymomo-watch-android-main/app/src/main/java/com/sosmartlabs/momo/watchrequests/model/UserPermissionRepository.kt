package com.sosmartlabs.momo.watchrequests.model


import com.parse.ParseException
import javax.inject.Inject

class UserPermissionRepository @Inject constructor() {


    fun saveUserPermission(permission: UserPermission): UserPermission {
        runCatching {
            permission.save()
        }.onFailure {
            permission.revert()
            checkAndThrowConnectionExceptionOrException(it)
        }
        return permission
    }

    fun updateCurrentUserPermission(
        permission: UserPermission,
        call: Boolean, videoCall: Boolean, messages: Boolean, location: Boolean, edit: Boolean
    ) {
        with(permission) {
            this.call = call
            this.videocall = videoCall
            this.messages = messages
            this.location = location
            this.edit = edit
        }
    }


    private fun checkAndThrowConnectionExceptionOrException(exception: Throwable): Nothing {
        if (exception is ParseException) {
            if (exception.code in
                arrayListOf(ParseException.CONNECTION_FAILED, ParseException.INVALID_JSON)
            ) {
                throw ConnectionException(exception.localizedMessage)
            }
        }

        throw exception
    }

    class ConnectionException(message: String?) : Exception(message ?: "Parse connection error")
}