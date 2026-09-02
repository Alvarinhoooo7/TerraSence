package com.sosmartlabs.momotabletpadres.models.entity

import com.sosmartlabs.momotabletpadres.tablet.model.Tablet


data class NotificationEntity(
    var objectId: String?,
    var tablet: Tablet?,
    var isRead: Boolean?,
    var category: NotificationCategoryEntity,
    var baseObjectId: String?,
    var createdAt: Long?
)