package com.sosmartlabs.momo.settingsapp.ui.adapter

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.bumptech.glide.load.resource.drawable.DrawableTransitionOptions
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.SettingsAppLinkedWatchItemBinding
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.models.WatchUser
import com.sosmartlabs.momo.utils.ui.DefaultIcons
import jp.wasabeef.glide.transformations.BlurTransformation
import timber.log.Timber

class LinkedWatchesAdapter(private val navigateOnItemSelected: (watchID: String) -> Unit): ListAdapter<WatchUser, LinkedWatchesAdapter.LinkedWatchesViewHolder>(
    LinkedWatchesDiffCallback()
) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): LinkedWatchesViewHolder {
        Timber.d("LinkedWatchesAdapter: Creating view holder")
        CrashlyticsLog.log("LinkedWatchesAdapter: Creating new view holder")
        
        return LinkedWatchesViewHolder(
            SettingsAppLinkedWatchItemBinding.inflate(
                LayoutInflater.from(parent.context), parent, false))
    }

    override fun onBindViewHolder(holder: LinkedWatchesViewHolder, position: Int) {
        Timber.d("LinkedWatchesAdapter: Binding view holder at position $position")
        CrashlyticsLog.log("LinkedWatchesAdapter: Binding view holder for position $position")

        val watchUser = getItem(position)
        holder.bind(position, watchUser)

        holder.itemView.setOnClickListener {
            try {
                val watchUser = getItem(position)
                val isActive = watchUser.active
                if (isActive) {
                    val watchId = watchUser.watch!!.objectId
                    Timber.d("LinkedWatchesAdapter: Navigating to watch with ID: $watchId")
                    CrashlyticsLog.log("LinkedWatchesAdapter: Initiating navigation for watch ID: $watchId")
                    navigateOnItemSelected(watchId)
                } else {
                    Timber.d("LinkedWatchesAdapter: Watch is not active, skipping navigation")
                }
            } catch (e: Exception) {
                Timber.e(e, "LinkedWatchesAdapter: Error getting watch ID for position $position")
                CrashlyticsLog.recordNonFatalError(e, "LinkedWatchesAdapter: Failed to get watch ID for position $position")
            }
        }
    }

    class LinkedWatchesViewHolder(val binding: SettingsAppLinkedWatchItemBinding) : RecyclerView.ViewHolder(binding.root) {


        fun bind(index: Int, watchUser: WatchUser) {
            Timber.d("LinkedWatchesViewHolder: Binding data for position $index")
            CrashlyticsLog.log("LinkedWatchesViewHolder: Starting data binding for position $index")
            setData(watchUser)
        }

        private fun setData(watchUser: WatchUser) {
            Timber.d("LinkedWatchesViewHolder: Setting data for watch user")
            CrashlyticsLog.log("LinkedWatchesViewHolder: Setting watch user data")
            
            val watch = watchUser.watch ?: run {
                Timber.d("LinkedWatchesViewHolder: Watch is null, skipping data binding")
                CrashlyticsLog.log("LinkedWatchesViewHolder: Watch is null, aborting data binding")
                return
            }

            val isActive = watchUser.active

            try {
                val imageUrl = watch.image?.url ?: DefaultIcons.PROFILE_MOMO_SPACE
                if (isActive) {
                    binding.activeWatchViewFlipper.displayedChild = 0
                    binding.watchCard.setCardBackgroundColor(ContextCompat.getColor(binding.watchCard.context, R.color.background_sim_step_card_title))
                    binding.authorizedWatchProfileName.text = watch.name()
                    binding.authorizedWatchProfileModel.text = binding.root.context.getString(R.string.subscription_watch_card_model, watch.modelName())
                    binding.authorizedWatchProfilePhone.text = binding.root.context.getString(R.string.subscription_watch_card_imei, watch.imei())
                    // Load image for authorized view
                    Glide.with(binding.watchProfilePicture.context)
                        .load(imageUrl)
                        .fallback(DefaultIcons.PROFILE_MOMO_SPACE)
                        .into(binding.watchProfilePicture)
                } else {
                    binding.activeWatchViewFlipper.displayedChild = 1
                    binding.watchCard.setCardBackgroundColor(ContextCompat.getColor(binding.watchCard.context, R.color.watch_settings_red_button))
                    binding.unauthorizedWatchId.text = watch.imei()
                    binding.unauthorizedWatchProfileModel.text = binding.root.context.getString(R.string.subscription_watch_card_model, watch.modelName())
                    // Load blurred image for unauthorized view
                    Glide.with(binding.watchProfilePicture.context)
                        .load(imageUrl)
                        .fallback(DefaultIcons.PROFILE_MOMO_SPACE)
                        .transform(BlurTransformation(25, 3))
                        .transition(DrawableTransitionOptions.withCrossFade())
                        .into(binding.watchProfilePicture)
                }
                Timber.d("LinkedWatchesViewHolder: Successfully set data for watch ${watch.name()}")
                CrashlyticsLog.log("LinkedWatchesViewHolder: Completed data binding for watch ${watch.name()}")
            } catch (e: Exception) {
                Timber.e(e, "LinkedWatchesViewHolder: Error setting watch data")
                CrashlyticsLog.recordNonFatalError(e, "LinkedWatchesViewHolder: Failed to set watch data")
            }
        }
    }
}