package com.sosmartlabs.momotabletpadres.tabletsettings.times.usetime.limit

import android.annotation.SuppressLint
import androidx.recyclerview.widget.DiffUtil
import com.sosmartlabs.momotabletpadres.tabletsettings.times.usetime.model.UseTime

class UseTimeLimitDiffCallback : DiffUtil.ItemCallback<UseTime>() {
    override fun areItemsTheSame(oldItem: UseTime, newItem: UseTime): Boolean = oldItem == newItem

    @SuppressLint("DiffUtilEquals")
    override fun areContentsTheSame(oldItem: UseTime, newItem: UseTime): Boolean = oldItem == newItem

}