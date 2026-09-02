package com.sosmartlabs.momo.hearts.ui

import android.app.ProgressDialog
import android.content.Context
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.recyclerview.widget.RecyclerView
import com.parse.ParseCloud
import com.parse.ParseException
import com.parse.ParseObject
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.firebase.CrashlyticsLog

/**
 * @author mrg
 * @date 10/13/17
 */

class HeartRewardAdapter(var mContext: Context) : RecyclerView.Adapter<HeartRewardAdapter.HeartRewardViewHolder>() {
    var rewards: MutableList<ParseObject>
    var listener: HeartRewardAdapterListener
    var totalHearts: Int = 0
        set(value){
            field = value
            notifyDataSetChanged()
        }

    init {
        this.rewards = mutableListOf()
        this.listener = mContext as HeartRewardAdapterListener
    }

    fun setData(rewards: MutableList<ParseObject>, totalHearts: Int){
        this.rewards = rewards
        this.totalHearts = totalHearts
        notifyDataSetChanged()
    }

    fun addObject(reward: ParseObject){
        if(rewards.contains(reward)){
            rewards[rewards.indexOf(reward)] = reward
            notifyItemChanged(rewards.indexOf(reward))
        } else {
            rewards.add(reward)
            notifyItemInserted(rewards.size - 1)
        }
    }

    fun removeObject(reward: ParseObject){
        if(rewards.contains(reward)){
            val index = rewards.indexOf(reward)
            rewards.remove(reward)
            notifyItemRemoved(index)
        }
    }

    override fun getItemCount(): Int {
        return rewards.size
    }

    override fun onBindViewHolder(holder: HeartRewardViewHolder, position: Int) {
        val reward: ParseObject = rewards[position]
        holder.vName.text = reward.getString("name")
        holder.vHearts.text = mContext.getString(R.string.hearts_progress, totalHearts, reward.getInt("hearts"))
        holder.vName.setOnClickListener {
            listener.onEditReward(reward)
        }
        holder.vFinish.isEnabled = (totalHearts >= reward.getInt("hearts"))
        holder.vFinish.setOnClickListener {
            val dialog = ProgressDialog(mContext)
            dialog.setMessage(mContext.getString(R.string.progress_completing_reward))
            dialog.show()
            ParseCloud.callFunctionInBackground("completeReward", hashMapOf("rewardId" to reward.objectId)) { _: Any?, e: ParseException? ->
                dialog.dismiss()
                if (e != null) {
                    Toast.makeText(
                        mContext,
                        mContext.getString(R.string.toast_error_completing_reward),
                        Toast.LENGTH_LONG
                    ).show()
                    CrashlyticsLog.recordNonFatalError(e, "Error on completeReward cloud function")
                }
                else listener.onRewardCompleted()
            }
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): HeartRewardViewHolder {
        val v = LayoutInflater.from(parent.context).inflate(R.layout.item_heart_reward, parent, false)
        return HeartRewardViewHolder(v)
    }

    class HeartRewardViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        var vName: TextView = itemView.findViewById(R.id.reward_name)
        var vHearts: TextView = itemView.findViewById(R.id.reward_hearts)
        var vFinish: Button = itemView.findViewById(R.id.reward_finish)
    }
}