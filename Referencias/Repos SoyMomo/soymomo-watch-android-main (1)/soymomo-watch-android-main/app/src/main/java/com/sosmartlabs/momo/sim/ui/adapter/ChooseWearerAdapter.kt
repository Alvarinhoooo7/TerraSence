package com.sosmartlabs.momo.sim.ui.adapter

import android.view.LayoutInflater
import android.view.ViewGroup
import android.widget.CompoundButton
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.ItemSimWatchBinding
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.utils.ui.DefaultIcons
import com.sosmartlabs.momo.utils.ui.loadImage

class ChooseWearerAdapter: ListAdapter<Wearer, ChooseWearerAdapter.ChooseWearerViewHolder>(
    ChooseWearerDiffCallback()
) {

    interface Listener {
        fun onChooseWearerClicked(index: Int, wearer: Wearer)
    }

    lateinit var listener: Listener
    private var checkedRadioButton: CompoundButton? = null

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ChooseWearerViewHolder {
        return ChooseWearerViewHolder(
            ItemSimWatchBinding.inflate(
                LayoutInflater.from(parent.context), parent, false), listener)
    }

    override fun onBindViewHolder(holder: ChooseWearerViewHolder, position: Int) {
        val wearer = getItem(position)
        holder.bind(position, wearer)
        holder.binding.watchRadioButton.setOnCheckedChangeListener(checkedChangeListener)
        if (holder.binding.watchRadioButton.isChecked) checkedRadioButton = holder.binding.watchRadioButton
    }

    private val checkedChangeListener = CompoundButton.OnCheckedChangeListener { compoundButton, isChecked ->
        checkedRadioButton?.apply { setChecked(!isChecked) }
        checkedRadioButton = compoundButton.apply { setChecked(isChecked) }
    }

    class ChooseWearerViewHolder(val binding: ItemSimWatchBinding, private val listener: Listener) : RecyclerView.ViewHolder(binding.root) {

        private val watchCard get() = binding.watchCard
        private val watchRadioButton get() = binding.watchRadioButton
        private val watchPicture get() = binding.watchProfilePicture
        private val watchName get() = binding.watchName
        private val watchModel get() = binding.watchModel
        private val watchImei get() = binding.watchImei

        fun bind(index: Int, watch: Wearer) {
            setOnClickListener(index, watch)
            setData(watch)
        }

        private fun setOnClickListener(index: Int, watch: Wearer) {
            watchCard.setOnClickListener {
                listener.onChooseWearerClicked(index, watch)
                watchRadioButton.toggle()
            }
            watchRadioButton.setOnClickListener {
                listener.onChooseWearerClicked(index, watch)
            }
        }

        private fun setData(watch: Wearer) {
            with(watch) {
                image?.let {
                    watchPicture.loadImage(it.url, fallback = DefaultIcons.PROFILE_MOMO_SPACE)
                } ?: run {
                    watchPicture.loadImage(DefaultIcons.PROFILE_MOMO_SPACE, fallback = DefaultIcons.PROFILE_MOMO_SPACE)
                }
                watchName.text = name()
                watchModel.text = binding.root.context.getString(R.string.subscription_watch_card_model, watch.modelName())
                watchImei.text = binding.root.context.getString(R.string.subscription_watch_card_imei, watch.imei())
            }
        }
    }
}