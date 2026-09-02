package com.sosmartlabs.momo.sim.ui.fragments.transfer

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.activity.addCallback
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.SubscriptionTransferToSimSuccessBinding
import com.sosmartlabs.momo.sim.SimActivity
import com.sosmartlabs.momo.sim.model.Subscription
import com.sosmartlabs.momo.sim.ui.TransferSubscriptionViewModel
import timber.log.Timber

class SubscriptionTransferNewSimSuccessFragment : Fragment() {

    /**
     * Binding
     */
    private lateinit var binding: SubscriptionTransferToSimSuccessBinding

    /**
     * ViewModel
     */
    private val transferSubscriptionViewModel: TransferSubscriptionViewModel by activityViewModels()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        binding = SubscriptionTransferToSimSuccessBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupListeners()
        observeViewModel()
    }

    fun setupListeners() {
        binding.buttonAccept.setOnClickListener {
            requireActivity().finish()
            startActivity(Intent(requireContext(), SimActivity::class.java))
        }

        binding.actionCopyContentClipboard.setOnClickListener {
            transferSubscriptionViewModel.currentSubscription.value?.let { subscription ->
                try {
                    val clipboard = requireContext().getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                    val clip: ClipData = ClipData.newPlainText("phone", subscription.msisdn)
                    clipboard.setPrimaryClip(clip)
                    Toast.makeText(requireContext(), getString(R.string.subscription_button_copy_content_clipboard, subscription.msisdn ), Toast.LENGTH_SHORT).show()
                } catch (e: Exception) {
                    Timber.e(e)
                }
            }
        }

        requireActivity().onBackPressedDispatcher.addCallback(viewLifecycleOwner) {
            startActivity(Intent(requireContext(), SimActivity::class.java))
        }
    }

    private fun observeViewModel() {
        transferSubscriptionViewModel.currentSubscription.observe(viewLifecycleOwner) {
            Timber.d(it.toString())
            setNewSubscriptionView(it)
        }
    }

    private fun setNewSubscriptionView(subscription: Subscription) {
        if (!subscription.msisdn.isNullOrEmpty()) {
            binding.subscriptionCardFlipper.displayedChild = 0
            binding.subscriptionCardActivatedPhone.text = subscription.msisdn
        } else {
            binding.subscriptionCardFlipper.displayedChild = 1
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        dispose()
    }

    private fun dispose() {

    }
}