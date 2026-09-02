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
import com.sosmartlabs.momotabletpadres.databinding.SubscriptionApioWebviewFragmentBinding
import com.sosmartlabs.momotabletpadres.sim.SimActivity
import com.sosmartlabs.momotabletpadres.sim.ui.NewSubscriptionViewModel
import com.sosmartlabs.momotabletpadres.utils.WindowInsetsUtils
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import timber.log.Timber

class ApioWebViewFragment : Fragment() {

    private lateinit var binding: SubscriptionApioWebviewFragmentBinding
    private val newSubscriptionViewModel: NewSubscriptionViewModel by activityViewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Timber.d("ApioWebViewFragment: onCreate called")
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        Timber.d("ApioWebViewFragment: onCreateView called")
        binding = SubscriptionApioWebviewFragmentBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Timber.d("ApioWebViewFragment: onViewCreated called")
        setUpWebView()
        observeViewModel()

        WindowInsetsUtils.applyBottomInsetAsPadding(binding.webView)
    }

    private fun observeViewModel() {
        Timber.d("ApioWebViewFragment: observeViewModel started")
        newSubscriptionViewModel.apioAuthBypassUrl.observe(viewLifecycleOwner) { result ->
            Timber.d("ApioWebViewFragment: apioAuthBypassUrl observed: $result")
            result.data?.let { apioUrl ->
                Timber.d("ApioWebViewFragment: Loading URL in WebView: $apioUrl")
                binding.webView.loadUrl(apioUrl)
            } ?: run {
                Timber.e("ApioWebViewFragment: apioAuthBypassUrl data is null")
                CrashlyticsLog.log("ApioWebViewFragment: apioAuthBypassUrl data is null")
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setUpWebView() {
        Timber.d("ApioWebViewFragment: setUpWebView started")
        binding.webView.webViewClient = object : WebViewClient() {
            override fun onReceivedHttpError(
                view: WebView?,
                request: WebResourceRequest?,
                errorResponse: WebResourceResponse?
            ) {
                super.onReceivedHttpError(view, request, errorResponse)
                Timber.e("ApioWebViewFragment: onReceivedHttpError reasonPhrase: \\${errorResponse?.reasonPhrase}")
                Timber.e("ApioWebViewFragment: onReceivedHttpError responseHeaders: \\${errorResponse?.responseHeaders}")
                Timber.e("ApioWebViewFragment: onReceivedHttpError data: \\${errorResponse?.data}")
                Timber.e("ApioWebViewFragment: onReceivedHttpError statusCode: \\${errorResponse?.statusCode}")
                CrashlyticsLog.log(
                    "ApioWebViewFragment: HTTP error received. reasonPhrase: \\${errorResponse?.reasonPhrase}, statusCode: \\${errorResponse?.statusCode}, headers: \\${errorResponse?.responseHeaders}"
                )
            }

            override fun onPageStarted(view: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
                super.onPageStarted(view, url, favicon)
                Timber.d("ApioWebViewFragment: onPageStarted url: $url")
                binding.progressIndicator.visibility = View.VISIBLE
            }

            override fun onPageCommitVisible(view: WebView?, url: String?) {
                super.onPageCommitVisible(view, url)
                Timber.d("ApioWebViewFragment: onPageCommitVisible url: $url")
                binding.progressIndicator.visibility = View.GONE
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                Timber.d("ApioWebViewFragment: onPageFinished url: $url")
                binding.progressIndicator.visibility = View.GONE
            }

            override fun doUpdateVisitedHistory(view: WebView?, url: String?, isReload: Boolean) {
                super.doUpdateVisitedHistory(view, url, isReload)
                Timber.d("ApioWebViewFragment: doUpdateVisitedHistory url: $url, isReload: $isReload")
                if (url != null) {
                    if (url.contains("approved") && url.contains("soymomo")) {
                        Timber.d("ApioWebViewFragment: Payment approved detected in URL: $url")
                        CrashlyticsLog.log("ApioWebViewFragment: Navigating to PaymentSuccess due to approved URL: $url")
                        when (activity) {
                            is SimActivity -> {
                                navigateById(R.id.action_add_sim_apioWebViewFragment_to_newSubscriptionPaymentSuccess)
                            }
                        }
                    } else if (url.contains("failure") && url.contains("soymomo")) {
                        Timber.d("ApioWebViewFragment: Payment failure detected in URL: $url")
                        CrashlyticsLog.log("ApioWebViewFragment: Navigating to PaymentError due to failure URL: $url")
                        when (activity) {
                            is SimActivity -> {
                                navigateById(R.id.action_add_sim_apioWebViewFragment_to_newSubscriptionPaymentError)
                            }
                        }
                    }
                } else {
                    Timber.e("ApioWebViewFragment: doUpdateVisitedHistory called with null url")
                    CrashlyticsLog.log("ApioWebViewFragment: doUpdateVisitedHistory called with null url")
                }
            }
        }
        binding.webView.settings.javaScriptEnabled = true
        binding.webView.settings.domStorageEnabled = true
        Timber.d("ApioWebViewFragment: WebView JavaScript and DOM storage enabled")
    }

    private fun navigateById(navId: Int, bundle: Bundle = bundleOf()) {
        Timber.d("ApioWebViewFragment: Navigating with navId: $navId, bundle: $bundle")
        try {
            findNavController().navigate(navId, bundle)
        } catch (e: Exception) {
            Timber.e(e, "ApioWebViewFragment: Navigation error with navId: $navId")
            CrashlyticsLog.recordException(e, "ApioWebViewFragment: Navigation error with navId: $navId")
        }
    }

    override fun onDestroyView() {
        Timber.d("ApioWebViewFragment: onDestroyView called")
        super.onDestroyView()
        dispose()
    }

    private fun dispose() {
        Timber.d("ApioWebViewFragment: dispose called")
    }
}