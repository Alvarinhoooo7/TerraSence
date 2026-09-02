package com.sosmartlabs.momo.sim.ui.fragments.payment

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
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.addfirstwatch.AddFirstMomoActivity
import com.sosmartlabs.momo.databinding.SubscriptionStripeWebviewFragmentBinding
import com.sosmartlabs.momo.linkwatch.LinkWatchActivity
import com.sosmartlabs.momo.sim.SimActivity
import com.sosmartlabs.momo.sim.analytics.SimAnalytics
import com.sosmartlabs.momo.sim.model.SubscriptionPlan
import com.sosmartlabs.momo.sim.ui.NewSubscriptionViewModel
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
    }

    private fun observeViewModel() {
        newSubscriptionViewModel.currentSubscriptionPlan.observe(viewLifecycleOwner) {
            Timber.d("StripeWebViewFragment: Current subscription plan updated")
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
        val referenceIdsStripe = "${user.objectId}_${sim.iccId}_watch"
        var stripeUrl = "${subscriptionPlan.planUrl}?client_reference_id=${URLEncoder.encode(referenceIdsStripe, "utf-8")}"
        if (user.email != null) {
            stripeUrl = stripeUrl.plus("&prefilled_email=${URLEncoder.encode(user.email, "utf-8")}")
        }
        Timber.d("StripeWebViewFragment: Loading current plan URL")
        binding.webView.loadUrl(stripeUrl)
    }

    @SuppressLint("SetJavaScriptEnabled") //Feature will not work without Javascript
    private fun setUpWebView() {
        binding.webView.webViewClient = object : WebViewClient() {
            override fun onReceivedHttpError(view: WebView?, request: WebResourceRequest?, errorResponse: WebResourceResponse?) {
                super.onReceivedHttpError(view, request, errorResponse)
                Timber.e("onReceivedHttpError reasonPhrase: ${errorResponse?.reasonPhrase}")
                Timber.e("onReceivedHttpError statusCode: ${errorResponse?.statusCode}")
                if (request?.isForMainFrame == true) {
                    newSubscriptionViewModel.trackSimPaymentResult(
                        result = SimAnalytics.Result.ERROR,
                        paymentPath = SimAnalytics.PaymentPath.STRIPE,
                        errorType = "http_error",
                        httpStatusCode = errorResponse?.statusCode,
                    )
                }
            }

            override fun doUpdateVisitedHistory(view: WebView?, url: String?, isReload: Boolean) {
                super.doUpdateVisitedHistory(view, url, isReload)
                if (url != null) {
                    Timber.d("StripeWebViewFragment: doUpdateVisitedHistory isReload=$isReload")
                    if (url.contains("approved") && url.contains("soymomo")) {
                        newSubscriptionViewModel.trackSimPaymentResult(
                            result = SimAnalytics.Result.SUCCESS,
                            paymentPath = SimAnalytics.PaymentPath.STRIPE,
                        )
                        when (activity) {
                            is SimActivity -> {
                                navigateById(R.id.action_add_sim_stripeWebViewFragment_to_newSubscriptionPaymentSuccess)
                            }
                            is AddFirstMomoActivity -> {
                                navigateById(R.id.action_add_momo_stripeWebViewFragment_to_newSubscriptionPaymentSuccess)
                            }
                            is LinkWatchActivity -> {
                                navigateById(R.id.action_add_sim_stripeWebViewFragment_to_newSubscriptionPaymentSuccess)
                            }
                        }
                    } else if (url.contains("failure") && url.contains("soymomo")) {
                        newSubscriptionViewModel.trackSimPaymentResult(
                            result = SimAnalytics.Result.ERROR,
                            paymentPath = SimAnalytics.PaymentPath.STRIPE,
                            errorType = "provider_failure",
                        )
                        when (activity) {
                            is SimActivity -> {
                                navigateById(R.id.action_add_sim_stripeWebViewFragment_to_newSubscriptionPaymentError)
                            }
                            is AddFirstMomoActivity -> {
                                navigateById(R.id.action_add_momo_stripeWebViewFragment_to_newSubscriptionPaymentError)
                            }
                            is LinkWatchActivity -> {
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
        val navController = findNavController()
        if (navController.currentDestination?.getAction(navId) != null) {
            navController.navigate(navId, bundle)
        } else {
            Timber.w("Skipping stale navigation to $navId from ${navController.currentDestination?.label}")
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        dispose()
    }

    private fun dispose() {

    }
}
