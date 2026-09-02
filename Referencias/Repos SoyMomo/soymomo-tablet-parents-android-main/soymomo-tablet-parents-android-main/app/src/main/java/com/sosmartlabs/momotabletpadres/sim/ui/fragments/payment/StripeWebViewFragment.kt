package com.sosmartlabs.momotabletpadres.sim.ui.fragments.payment

import android.annotation.SuppressLint
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.core.os.bundleOf
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.databinding.SubscriptionStripeWebviewFragmentBinding
import com.sosmartlabs.momotabletpadres.sim.SimActivity
import com.sosmartlabs.momotabletpadres.sim.model.SubscriptionPlan
import com.sosmartlabs.momotabletpadres.sim.ui.NewSubscriptionViewModel
import com.sosmartlabs.momotabletpadres.utils.WindowInsetsUtils
import timber.log.Timber
import java.net.URLEncoder

class StripeWebViewFragment : Fragment() {

    /**
     * Binding
     */
    private lateinit var binding: SubscriptionStripeWebviewFragmentBinding

    /**
     * ViewModel
     */
    private val newSubscriptionViewModel: NewSubscriptionViewModel by activityViewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        binding = SubscriptionStripeWebviewFragmentBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setUpWebView()
        observeViewModel()

        WindowInsetsUtils.applyBottomInsetAsPadding(binding.webView)
    }

    private fun observeViewModel() {
        newSubscriptionViewModel.currentSubscriptionPlan.observe(viewLifecycleOwner) {
            Timber.d("CurrentUser $it")
            loadCurrentPlan(it)
        }
    }

    private fun loadCurrentPlan(subscriptionPlan: SubscriptionPlan) {
        val user = newSubscriptionViewModel.currentUser.value!!
        val sim = newSubscriptionViewModel.currentSim.value
        if (sim == null) {
            Timber.e("Sim is null")
            return
        }
        val referenceIdsStripe = "${user.objectId}_${sim.iccId}_tablet"
        var stripeUrl = "${subscriptionPlan.planUrl}?client_reference_id=${URLEncoder.encode(referenceIdsStripe, "utf-8")}"
        if (user.email != null) {
            stripeUrl = stripeUrl.plus("&prefilled_email=${URLEncoder.encode(user.email, "utf-8")}")
        }
        Timber.d("loadCurrentPlan url: $stripeUrl")
        binding.webView.loadUrl(stripeUrl)
    }

    @SuppressLint("SetJavaScriptEnabled") //Feature will not work without Javascript
    private fun setUpWebView() {
        binding.webView.webViewClient = object : WebViewClient() {
            override fun onReceivedHttpError(view: WebView?, request: WebResourceRequest?, errorResponse: WebResourceResponse?) {
                super.onReceivedHttpError(view, request, errorResponse)
                Timber.e("onReceivedHttpError reasonPhrase: ${errorResponse?.reasonPhrase}")
                Timber.e("onReceivedHttpError responseHeaders: ${errorResponse?.responseHeaders}")
                Timber.e("onReceivedHttpError data: ${errorResponse?.data}")
                Timber.e("onReceivedHttpError statusCode: ${errorResponse?.statusCode}")
            }

            override fun doUpdateVisitedHistory(view: WebView?, url: String?, isReload: Boolean) {
                super.doUpdateVisitedHistory(view, url, isReload)
                if (url != null) {
                    Timber.d("url: $url, isReload: $isReload")
                    if (url.contains("approved") && url.contains("soymomo")) {
                        when (activity) {
                            is SimActivity -> {
                                navigateById(R.id.action_add_sim_stripeWebViewFragment_to_newSubscriptionPaymentSuccess)
                            }
                        }
                    } else if (url.contains("failure") && url.contains("soymomo")) {
                        when (activity) {
                            is SimActivity -> {
                                navigateById(R.id.action_add_sim_stripeWebViewFragment_to_newSubscriptionPaymentError)
                            }
                        }
                    }
                }
            }
        }
        binding.webView.settings.javaScriptEnabled = true
        binding.webView.settings.domStorageEnabled = true
    }

    private fun navigateById(navId: Int, bundle: Bundle = bundleOf()) {
        findNavController().navigate(navId, bundle)
    }

    override fun onDestroyView() {
        super.onDestroyView()
        dispose()
    }

    private fun dispose() {

    }
}