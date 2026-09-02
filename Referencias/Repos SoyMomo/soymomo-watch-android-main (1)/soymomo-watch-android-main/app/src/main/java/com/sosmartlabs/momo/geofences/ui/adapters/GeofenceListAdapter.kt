package com.sosmartlabs.momo.geofences.ui.adapters

import android.annotation.SuppressLint
import android.view.LayoutInflater
import android.view.ViewGroup
import android.widget.TextView
import androidx.cardview.widget.CardView
import androidx.recyclerview.widget.RecyclerView
import com.sosmartlabs.momo.databinding.GeofenceRowBinding
import com.sosmartlabs.momo.geofences.model.Geofence


class GeofenceListAdapter(private var data: List<Geofence>,
        private var callBack: (selection: Geofence) -> Unit)
    : RecyclerView.Adapter<GeofenceListAdapter.GeofenceRowViewHolder>() {


    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): GeofenceRowViewHolder {
        val v = GeofenceRowBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return GeofenceRowViewHolder(v)
    }

    override fun onBindViewHolder(holder: GeofenceRowViewHolder, position: Int) {
        val geofence = data[position]
        holder.title.text = geofence.name
        holder.description.text = geofence.address
        holder.selectable.setOnClickListener { callBack(geofence) }
    }

    override fun getItemCount(): Int {
        return data.size
    }

    @SuppressLint("NotifyDataSetChanged")
    fun updateData(newData: List<Geofence>) {
        data = newData
        notifyDataSetChanged()
    }

    inner class GeofenceRowViewHolder(val binding: GeofenceRowBinding) : RecyclerView.ViewHolder(binding.root) {
        var title: TextView = binding.title
        var description: TextView = binding.description
        var selectable: CardView = binding.selectable
    }
}