package com.sosmartlabs.momotabletpadres.tabletsettings.blocks.web

import android.app.Dialog
import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.ColorDrawable
import android.text.Spannable
import android.text.SpannableString
import android.text.style.StyleSpan
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.constraintlayout.widget.ConstraintLayout
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.card.MaterialCardView
import com.sosmartlabs.momotabletpadres.databinding.DialogBlockWebsiteDeleteBinding
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.tabletsettings.blocks.web.model.Website
import com.sosmartlabs.momotabletpadres.utils.ErrorHandlers
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import timber.log.Timber

class WebsiteProtectionAdapter(
    context: Context?,
    rv: RecyclerView,
    vm: WebsiteProtectionViewModel
) : RecyclerView.Adapter<WebsiteProtectionAdapter.WebsiteProtectionViewHolder>() {

    private var websites = ArrayList<Website>()
    private var mContext = context
    private val mRecyclerView = rv
    private val mWebsitesViewModel = vm

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): WebsiteProtectionViewHolder {
        Timber.d("WebsiteProtectionAdapter: onCreateViewHolder - Inflating item_website_protection_new layout")
        val v = LayoutInflater.from(parent.context).inflate(R.layout.item_website_protection_new, parent, false)
        return WebsiteProtectionViewHolder(v)
    }

    override fun getItemCount(): Int {
        val size = websites.size
        return size
    }

    override fun onBindViewHolder(holder: WebsiteProtectionViewHolder, position: Int) {
        Timber.d("WebsiteProtectionAdapter: onBindViewHolder - Binding website at position $position")
        val website = websites[position]

        if (website.url == null) {
            Timber.e("WebsiteProtectionAdapter: onBindViewHolder - Website url is null at position $position")
            CrashlyticsLog.log("WebsiteProtectionAdapter: onBindViewHolder - Website url is null at position $position")
            holder.websiteCard.elevation = 0f
            holder.websiteLayout.visibility = View.INVISIBLE
            holder.websiteUrl.text = mContext?.getString(R.string.website_protection_template, "N/A")
        } else if (website.url == "soymomo_example") {
            Timber.d("WebsiteProtectionAdapter: onBindViewHolder - Hiding example website at position $position")
            holder.websiteCard.elevation = 0f
            holder.websiteLayout.visibility = View.INVISIBLE
        } else {
            holder.websiteCard.elevation = 4f
            holder.websiteLayout.visibility = View.VISIBLE
        }

        if (website.url != null) {
            val template = mContext?.getString(R.string.website_protection_template, website.url)
            if (template != null) {
                val spannable = SpannableString(template)
                val start = 12
                val end = 12 + website.url!!.length
                if (end <= spannable.length && start < end) {
                    spannable.setSpan(StyleSpan(Typeface.BOLD), start, end, Spannable.SPAN_INCLUSIVE_INCLUSIVE)
                } else {
                    Timber.w("WebsiteProtectionAdapter: onBindViewHolder - Spannable indices out of bounds for url: ${website.url}")
                }
                holder.websiteUrl.text = spannable
            } else {
                Timber.e("WebsiteProtectionAdapter: onBindViewHolder - Failed to get template string for website url: ${website.url}")
                holder.websiteUrl.text = website.url
            }
        }

        holder.removeWebsite.setOnClickListener {
            Timber.d("WebsiteProtectionAdapter: onBindViewHolder - Remove website clicked at position $position")
            deleteDialog(position)
        }
    }

    class WebsiteProtectionViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        var websiteCard: MaterialCardView = itemView.findViewById(R.id.website_item_card)
        var websiteLayout: ConstraintLayout = itemView.findViewById(R.id.website_item_constraint_layout)
        var websiteUrl: TextView = itemView.findViewById(R.id.website_url)
        var removeWebsite: ImageView = itemView.findViewById(R.id.remove_website)
    }

    private fun deleteDialog(position: Int) {
        Timber.d("WebsiteProtectionAdapter: deleteDialog - Showing delete dialog for website at position $position")
        if (mContext == null) {
            Timber.e("WebsiteProtectionAdapter: deleteDialog - Context is null, cannot show dialog")
            CrashlyticsLog.log("WebsiteProtectionAdapter: deleteDialog - Context is null, cannot show dialog")
            return
        }
        val myDialog = Dialog(mContext!!)
        val dialogBinding = DialogBlockWebsiteDeleteBinding.inflate(LayoutInflater.from(mContext))
        myDialog.setContentView(dialogBinding.root)
        myDialog.window?.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))
        dialogBinding.buttonDeleteWebsite.textSize = 12f
        dialogBinding.buttonCancelWebsite.textSize = 12f

        with(dialogBinding) {
            buttonCancelWebsite.setOnClickListener {
                Timber.d("WebsiteProtectionAdapter: deleteDialog - Cancel button clicked, dismissing dialog")
                myDialog.dismiss()
            }

            buttonDeleteWebsite.setOnClickListener {
                Timber.d("WebsiteProtectionAdapter: deleteDialog - Delete button clicked for position $position")
                removeAt(position)
                myDialog.dismiss()
            }
        }

        myDialog.show()
        Timber.d("WebsiteProtectionAdapter: deleteDialog - Dialog shown for website at position $position")
    }

    fun replaceData(newData: List<Website>) {
        Timber.d("WebsiteProtectionAdapter: replaceData - Replacing website list with new data of size ${newData.size}")
        websites = ArrayList(newData)
        this.notifyDataSetChanged()
        mRecyclerView.smoothScrollToPosition(0)
        Timber.d("WebsiteProtectionAdapter: replaceData - Data replaced and RecyclerView scrolled to top")
    }

    private fun removeAt(position: Int) {
        Timber.d("WebsiteProtectionAdapter: removeAt - Removing website at position $position")
        if (position < 0 || position >= websites.size) {
            Timber.e("WebsiteProtectionAdapter: removeAt - Invalid position $position for removal")
            CrashlyticsLog.log("WebsiteProtectionAdapter: removeAt - Invalid position $position for removal")
            return
        }
        val website = websites[position]
        website.deleteInBackground { e ->
            if (e != null) {
                Timber.e(e, "WebsiteProtectionAdapter: removeAt - Error deleting website at position $position: ${website.url}")
                CrashlyticsLog.recordNonFatalError(e, "WebsiteProtectionAdapter: removeAt - Error deleting website at position $position: ${website.url}")
                ErrorHandlers.alertDialog(mContext!!, e.toString())
            } else {
                Timber.d("WebsiteProtectionAdapter: removeAt - Website deleted successfully at position $position: ${website.url}")
            }
        }
        websites.removeAt(position)
        Timber.d("WebsiteProtectionAdapter: removeAt - Website removed from local list at position $position")
        mWebsitesViewModel.loadWebsites()
        notifyItemRemoved(position)
        this.notifyItemRangeChanged(position, websites.size)
        mRecyclerView.smoothScrollToPosition(0)
        Timber.d("WebsiteProtectionAdapter: removeAt - RecyclerView updated after removal")
    }
}