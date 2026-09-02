package com.sosmartlabs.momo.utils.ui

import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.ImageView
import android.widget.TextView
import androidx.fragment.app.DialogFragment
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.utils.Constants
import timber.log.Timber

/**
 * @author mrgcl
 */
class MomoDialogFragment : DialogFragment() {
    private var mListener: MomoDialogListener? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // mListener is set by Builder and cannot survive process death / recreation.
        if (savedInstanceState != null && mListener == null) {
            Timber.w("MomoDialogFragment recreated without listener, dismissing stale dialog")
            dismissAllowingStateLoss()
        }
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        val root = inflater.inflate(R.layout.dialog_fragment_momo, container, false)
        dialog?.setCanceledOnTouchOutside(false)
        dialog?.window?.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))
        val arguments = arguments
        val type = arguments!!.getInt("type", -1)
        val textView = root.findViewById<TextView>(R.id.dialog_text)
        textView.text = getDialogText(type)
        val mCancelButton = root.findViewById<Button>(R.id.button_cancel)
        mCancelButton.setOnClickListener {
            mListener?.onMomoDialogDismiss()
                ?: Timber.w("MomoDialogFragment cancel tapped with null listener")
            dismiss()
        }
        val mContinueButton = root.findViewById<Button>(R.id.button_continue)
        mContinueButton.setOnClickListener {
            mListener?.onMomoDialogContinue(type)
                ?: Timber.w("MomoDialogFragment continue tapped with null listener")
            dismiss()
        }
        val momoImage = root.findViewById<ImageView>(R.id.dialog_image)
        momoImage.setImageResource(getDialogIcon(type))
        return root
    }

    private fun getDialogText(type: Int): String {
        var text = ""
        when (type) {
            Constants.PERMISSION_LOCATION -> text = getString(R.string.dialog_permission_location)
            Constants.PERMISSION_PHONE -> text = getString(R.string.dialog_permission_calls)
            Constants.PERMISSION_CONTACTS -> text = getString(R.string.dialog_permission_contacts)
            Constants.PERMISSION_AUDIO -> text = getString(R.string.dialog_permission_audio)
            Constants.PERMISSION_STORAGE_CAMERA, Constants.PERMISSION_STORAGE_GALLERY -> text =
                getString(R.string.dialog_permission_storage)
        }
        return text
    }

    private fun getDialogIcon(type: Int): Int {
        var icon = R.drawable.momo_help
        when (type) {
            Constants.PERMISSION_LOCATION -> icon = R.drawable.ic_momo_location
            Constants.PERMISSION_PHONE -> icon = R.drawable.ic_momo_call
            Constants.PERMISSION_CONTACTS -> icon = R.drawable.ic_momo_contacts
        }
        return icon
    }

    private fun setListener(listener: MomoDialogListener) {
        mListener = listener
    }

    interface MomoDialogListener {
        fun onMomoDialogContinue(type: Int)
        fun onMomoDialogDismiss()
    }

    class Builder(listener: MomoDialogListener) {
        private var type: Int
        private val listener: MomoDialogListener

        init {
            type = -1
            this.listener = listener
        }

        fun setType(type: Int): Builder {
            this.type = type
            return this
        }

        fun build(): MomoDialogFragment {
            val arguments = Bundle()
            arguments.putInt("type", type)
            val momoDialogFragment = MomoDialogFragment()
            momoDialogFragment.arguments = arguments
            momoDialogFragment.setListener(listener)
            return momoDialogFragment
        }
    }
}