package com.sosmartlabs.momo.hearts.ui

import com.parse.ParseObject

/**
 * @author mrg
 * @date 10/16/17
 */
interface HeartRewardAdapterListener {
    fun onEditReward(reward: ParseObject)
    fun onRewardCompleted()
}