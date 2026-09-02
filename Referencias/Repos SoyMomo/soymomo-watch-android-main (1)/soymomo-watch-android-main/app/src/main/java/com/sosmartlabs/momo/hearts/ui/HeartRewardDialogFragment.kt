package com.sosmartlabs.momo.hearts.ui

import android.content.Context
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.*
import com.google.firebase.crashlytics.crashlytics
import com.google.firebase.Firebase
import com.parse.ParseObject
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.DialogHeartRewardBinding
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import timber.log.Timber

/**
 * @author mrg
 * @date 10/13/17
 */
class HeartRewardDialogFragment: androidx.fragment.app.DialogFragment() {
    private val TAG = javaClass.simpleName
    private lateinit var mListener: HeartRewardListener
    private var _binding: DialogHeartRewardBinding? = null
    private val binding get() = _binding!!

    companion object {
        fun newInstance(reward: ParseObject, isSpace: Boolean): HeartRewardDialogFragment {
            val args = Bundle()
            args.putParcelable("reward", reward)
            args.putBoolean("space", isSpace)
            val fragment = HeartRewardDialogFragment()
            fragment.arguments = args
            return fragment
        }
    }

    override fun onAttach(context: Context) {
        super.onAttach(context)
        try{
            mListener = context as HeartRewardListener
        } catch (e: ClassCastException){
            Timber.e(e)
            with(Firebase.crashlytics) {
                log("Error attaching HeartRewardDialogFragment")
                recordException(e)
            }
            dismiss()
        }
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = DialogHeartRewardBinding.inflate(inflater, container, false)
        
        val heartReward = requireArguments().getParcelable<ParseObject>("reward")
        val isSpace = requireArguments().getBoolean("space", false)
        
        if(heartReward!!.has("name")) binding.edittextEventName.setText(heartReward.getString("name"))
        if(heartReward.has("hearts")) binding.hearts.text = heartReward.getInt("hearts").toString()
        
        binding.addHeart.setOnClickListener {
            val current: Int = Integer.parseInt(binding.hearts.text.toString())
            if(current < 200) binding.hearts.text = (current + 1).toString()
        }
        
        binding.removeHeart.setOnClickListener {
            val current: Int = Integer.parseInt(binding.hearts.text.toString())
            if(current > 0) binding.hearts.text = (current - 1).toString()
        }
        
        binding.buttonCancel.setOnClickListener {
            dialog!!.cancel()
        }
        
        binding.buttonSave.setOnClickListener {
            if (binding.edittextEventName.text.toString().trim().isEmpty()) {
                binding.edittextEventName.error = getString(R.string.edittext_error_reward_name)
                return@setOnClickListener
            }
            val current: Int = Integer.parseInt(binding.hearts.text.toString())
            if(current == 0){
                if (context != null) {
                    if (isSpace) {
                        Toast.makeText(context, R.string.toast_error_reward_no_hearts_space, Toast.LENGTH_LONG).show()
                    } else {
                        Toast.makeText(context, R.string.toast_error_reward_no_hearts, Toast.LENGTH_LONG).show()
                    }
                }
                return@setOnClickListener
            }
            heartReward.put("name", binding.edittextEventName.text.toString().trim())
            heartReward.put("hearts", current)
            showProgress(binding.progressBar, binding.buttonSave, true)
            heartReward.saveInBackground { e ->
                // The dialog is cancelable, so this callback can land after a
                // dismissal has destroyed the view: _binding may be null and the
                // fragment may no longer be added.
                if (e != null) {
                    if (context != null) Toast.makeText(context, R.string.toast_error_saving_reward, Toast.LENGTH_LONG).show()
                    _binding?.let { showProgress(it.progressBar, it.buttonSave, false) }
                    CrashlyticsLog.recordNonFatalError(e, "There was an error while saving the reward")
                } else {
                    // The save succeeded server-side, so the listener must still
                    // hear about it even if the dialog is already gone. State-loss
                    // dismiss: the callback can land after onSaveInstanceState
                    // (Home-press mid-save), where a plain dismiss() throws; the
                    // isAdded check covers the already-dismissed case, where even
                    // dismissAllowingStateLoss() has no fragment manager.
                    mListener.onHeartReward(heartReward)
                    if (isAdded) dismissAllowingStateLoss()
                }
            }
        }
        
        binding.buttonDeleteReward.visibility = if(heartReward.has("name")) View.VISIBLE else View.GONE
        binding.buttonDeleteReward.setOnClickListener {
            showProgress(binding.progressBar, binding.buttonSave, true)
            heartReward.deleteInBackground { e ->
                // Same post-dismissal race as the save callback above.
                if(e != null){
                    if (context != null) Toast.makeText(context, getString(R.string.toast_error_deleting_reward), Toast.LENGTH_LONG).show()
                    _binding?.let { showProgress(it.progressBar, it.buttonSave, false) }
                    CrashlyticsLog.recordNonFatalError(e, "There was an error while deleting the reward")
                } else {
                    mListener.onDeleteReward(heartReward)
                    if (isAdded) dismissAllowingStateLoss()
                }
            }
        }
        
        if (isSpace) {
            binding.hearts.setCompoundDrawablesWithIntrinsicBounds(R.drawable.ic_reward_grey_star, 0, 0, 0)
        }
        
        return binding.root
    }

    override fun onStart() {
        super.onStart()
        try {
            dialog!!.window!!.setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
        } catch (e: NullPointerException) {
            Timber.e(e)
            with(Firebase.crashlytics) {
                log("Error starting HeartRewardDialogFragment")
                recordException(e)
            }
        }

    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }

    private fun showProgress(progressBar: ProgressBar, button: Button, show: Boolean) {
        progressBar.visibility = if (show) View.VISIBLE else View.GONE
        button.isActivated = !show
    }
}