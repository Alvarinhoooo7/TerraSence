package com.sosmartlabs.momotabletpadres.models.mapper

import com.parse.ParseUser
import com.sosmartlabs.momotabletpadres.models.entity.UserEntity
import javax.inject.Inject

class UserToEntityMapper @Inject constructor() {

    fun transform(parseUser: ParseUser): UserEntity{
        return UserEntity(parseUser.objectId)
    }
}