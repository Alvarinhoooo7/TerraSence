package com.sosmartlabs.momo.hearts.ui

import com.parse.ParseObject

/**
 * @author mrg
 * @date 10/13/17
 */
interface HeartRewardListener {
    fun onHeartReward(reward: ParseObject)
    fun onDeleteReward(reward: ParseObject)
}