package com.sosmartlabs.momotabletpadres.sim.ui.adapter

import android.view.LayoutInflater
import android.view.ViewGroup
import android.widget.CompoundButton
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.tablet.model.TabletModel
import com.sosmartlabs.momotabletpadres.databinding.ItemSimDeviceBinding
import com.sosmartlabs.momotabletpadres.utils.ui.DefaultIcons
import com.sosmartlabs.momotabletpadres.glide.loadImage

class ChooseDeviceAdapter: ListAdapter<Tablet, ChooseDeviceAdapter.ChooseDeviceViewHolder>(
    ChooseDeviceDiffCallback()
) {

    interface Listener {
        fun onChooseDeviceClicked(index: Int, tablet: Tablet)
    }

    lateinit var listener: Listener
    private var checkedRadioButton: CompoundButton? = null

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ChooseDeviceViewHolder {
        return ChooseDeviceViewHolder(
            ItemSimDeviceBinding.inflate(
                LayoutInflater.from(parent.context), parent, false), listener)
    }

    override fun onBindViewHolder(holder: ChooseDeviceViewHolder, position: Int) {
        val tablet = getItem(position)
        holder.bind(position, tablet)
        holder.binding.deviceRadioButton.setOnCheckedChangeListener(checkedChangeListener)
        if (holder.binding.deviceRadioButton.isChecked) checkedRadioButton = holder.binding.deviceRadioButton
    }

    private val checkedChangeListener = CompoundButton.OnCheckedChangeListener { compoundButton, isChecked ->
        checkedRadioButton?.apply { setChecked(!isChecked) }
        checkedRadioButton = compoundButton.apply { setChecked(isChecked) }
    }

    class ChooseDeviceViewHolder(val binding: ItemSimDeviceBinding, private val listener: Listener) : RecyclerView.ViewHolder(binding.root) {

        private val deviceCard get() = binding.deviceCard
        private val deviceRadioButton get() = binding.deviceRadioButton
        private val devicePicture get() = binding.deviceProfilePicture
        private val deviceName get() = binding.deviceName
        private val deviceModel get() = binding.deviceModel
        private val deviceImei get() = binding.deviceImei

        fun bind(index: Int, tablet: Tablet) {
            setOnClickListener(index, tablet)
            setData(tablet)
        }

        private fun setOnClickListener(index: Int, tablet: Tablet) {
            deviceCard.setOnClickListener {
                listener.onChooseDeviceClicked(index, tablet)
                deviceRadioButton.toggle()
            }
            deviceRadioButton.setOnClickListener {
                listener.onChooseDeviceClicked(index, tablet)
            }
        }

        private fun setData(tablet: Tablet) {
            with(tablet) {
                profilePicture?.let {
                    devicePicture.loadImage(it.url, fallback = DefaultIcons.PROFILE_MOMO_SPACE)
                } ?: run {
                    devicePicture.loadImage(DefaultIcons.PROFILE_MOMO_SPACE, fallback = DefaultIcons.PROFILE_MOMO_SPACE)
                }
                deviceName.text = profileName
                deviceModel.text = binding.root.context.getString(R.string.subscription_device_card_model, getTabletModelName(tablet))
                deviceImei.text = binding.root.context.getString(R.string.subscription_device_card_imei, tablet.imei)
            }
        }

        private fun getTabletModelName(tablet: Tablet?): String {
            return when (tablet?.model) {
                TabletModel.LITE -> binding.root.context.getString(R.string.lite_model_name)
                TabletModel.LITE_2 -> binding.root.context.getString(R.string.lite_2_model_name)
                TabletModel.LITE_3 -> binding.root.context.getString(R.string.lite_3_model_name)
                TabletModel.PRO-> binding.root.context.getString(R.string.pro_model_name)
                TabletModel.PRO_EU -> binding.root.context.getString(R.string.pro_model_name)
                TabletModel.PRO_2 -> binding.root.context.getString(R.string.pro_2_model_name)
                TabletModel.UNO -> binding.root.context.getString(R.string.uno_model_name)
                TabletModel.PHONE_1 -> binding.root.context.getString(R.string.momophone_1_model_name)
                null -> binding.root.context.getString(R.string.unknown_model_name)
                else -> binding.root.context.getString(R.string.unknown_model_name)
            }
        }
    }
}