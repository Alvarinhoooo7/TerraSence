package com.sosmartlabs.momotabletpadres.geofences.ui.adapter

import android.annotation.SuppressLint
import android.view.LayoutInflater
import android.view.ViewGroup
import android.widget.TextView
import androidx.cardview.widget.CardView
import androidx.recyclerview.widget.RecyclerView
import com.sosmartlabs.momotabletpadres.databinding.ItemGeofenceBinding
import com.sosmartlabs.momotabletpadres.geofences.model.Geofence

class GeofenceListAdapter(private var data: List<Geofence>,
                          private var listener: (selection: Geofence) -> Unit)
    : RecyclerView.Adapter<GeofenceListAdapter.GeofenceRowViewHolder>() {


    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): GeofenceRowViewHolder {
        val v = ItemGeofenceBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return GeofenceRowViewHolder(v)
    }

    override fun onBindViewHolder(holder: GeofenceRowViewHolder, position: Int) {
        val geofence = data[position]
        holder.title.text = geofence.name
        holder.description.text = geofence.address
        holder.selectable.setOnClickListener { listener(geofence) }
    }

    override fun getItemCount(): Int {
        return data.size
    }

    @SuppressLint("NotifyDataSetChanged")
    fun updateData(newData: List<Geofence>) {
        data = newData
        notifyDataSetChanged()
    }

    inner class GeofenceRowViewHolder(val binding: ItemGeofenceBinding) : RecyclerView.ViewHolder(binding.root) {
        var title: TextView = binding.title
        var description: TextView = binding.description
        var selectable: CardView = binding.selectable
    }
}