package com.sosmartlabs.momo.sim.ui.fragments.payment

import android.annotation.SuppressLint
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AlertDialog
import androidx.core.os.bundleOf
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.addfirstwatch.AddFirstMomoActivity
import com.sosmartlabs.momo.databinding.SubscriptionApioWebviewFragmentBinding
import com.sosmartlabs.momo.linkwatch.LinkWatchActivity
import com.sosmartlabs.momo.sim.SimActivity
import com.sosmartlabs.momo.sim.analytics.SimAnalytics
import com.sosmartlabs.momo.sim.ui.NewSubscriptionViewModel
import timber.log.Timber

class ApioWebViewFragment : Fragment() {

    /**
     * Binding
     */
    private lateinit var binding: SubscriptionApioWebviewFragmentBinding

    /**
     * ViewModel
     */
    private val newSubscriptionViewModel: NewSubscriptionViewModel by activityViewModels()

    /**
     * Flag to track if we've already launched an external app (to prevent fallback JavaScript from opening Play Store)
     */
    private var hasLaunchedExternalApp = false

    /**
     * Flag to avoid showing the Mercado Pago unsupported dialog multiple times.
     */
    private var mercadoPagoDialogShown = false

    /**
     * Flag to block Mercado Pago-related fallbacks (e.g., market://) once we decide it's unsupported.
     */
    private var mercadoPagoBlocked = false

    /**
     * Reference to the Mercado Pago unsupported dialog to dismiss on view destruction.
     */
    private var mercadoPagoDialog: AlertDialog? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Timber.d("ApioWebViewFragment: onCreate")
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        Timber.d("ApioWebViewFragment: onCreateView")
        binding = SubscriptionApioWebviewFragmentBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Timber.d("ApioWebViewFragment: onViewCreated")
        setUpWebView()
        observeViewModel()
    }

    override fun onResume() {
        super.onResume()
        Timber.d("ApioWebViewFragment: onResume - resetting hasLaunchedExternalApp flag")
        hasLaunchedExternalApp = false
    }

    private fun isMercadoPagoUrl(url: String): Boolean {
        val host = try {
            Uri.parse(url).host
        } catch (e: Exception) {
            null
        }
        return host?.contains("mercadopago") == true
    }

    private fun showMercadoPagoUnsupportedDialog() {
        if (mercadoPagoDialogShown || !isAdded) {
            return
        }
        mercadoPagoDialogShown = true
        mercadoPagoBlocked = true
        
        mercadoPagoDialog = AlertDialog.Builder(requireContext())
            .setTitle(R.string.subscription_payment_method_mercado_pago_not_supported_title)
            .setMessage(R.string.subscription_payment_method_mercado_pago_not_supported_message)
            .setIcon(R.drawable.ic_payment_mercado_pago_logo)
            .setCancelable(false)
            .setPositiveButton(android.R.string.ok) { dialog, _ ->
                dialog.dismiss()
                mercadoPagoDialog = null
                navigateBackFromApioWebView()
            }
            .create()
        mercadoPagoDialog?.setCanceledOnTouchOutside(false)
        mercadoPagoDialog?.show()
    }

    private fun navigateBackFromApioWebView() {
        if (!isAdded) {
            Timber.w("ApioWebViewFragment: navigateBackFromApioWebView - Fragment not attached, skipping navigation")
            return
        }
        try {
            when (activity) {
                is SimActivity,
                is AddFirstMomoActivity,
                is LinkWatchActivity -> {
                    val popped = findNavController().popBackStack(R.id.apioUserCardsFragment, false)
                    if (!popped) {
                        findNavController().popBackStack()
                    }
                }
                else -> {
                    findNavController().popBackStack()
                }
            }
        } catch (e: Exception) {
            Timber.e(e, "ApioWebViewFragment: navigateBackFromApioWebView - Navigation failed")
        }
    }

    private fun observeViewModel() {
        newSubscriptionViewModel.apioAuthBypassUrl.observe(viewLifecycleOwner) {
            Timber.d("ApioWebViewFragment: Apio auth bypass URL state updated")
            it.data?.let { apioUrl ->
                binding.webView.loadUrl(apioUrl)
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled") //Feature will not work without Javascript
    private fun setUpWebView() {
        Timber.d("ApioWebViewFragment: setUpWebView - configuring WebView")
        binding.webView.webViewClient = object : WebViewClient() {
            override fun onReceivedHttpError(view: WebView?, request: WebResourceRequest?, errorResponse: WebResourceResponse?) {
                super.onReceivedHttpError(view, request, errorResponse)
                // Only log errors for main frame requests, not sub-resources (JS, CSS, images, favicon)
                if (request?.isForMainFrame == true) {
                    Timber.e("ApioWebViewFragment: onReceivedHttpError for main frame")
                    Timber.e("ApioWebViewFragment: onReceivedHttpError reasonPhrase: ${errorResponse?.reasonPhrase}")
                    Timber.e("ApioWebViewFragment: onReceivedHttpError statusCode: ${errorResponse?.statusCode}")
                    newSubscriptionViewModel.trackSimPaymentResult(
                        result = SimAnalytics.Result.ERROR,
                        paymentPath = SimAnalytics.PaymentPath.APIO_NEW_CARD,
                        errorType = "http_error",
                        httpStatusCode = errorResponse?.statusCode,
                    )
                }
            }

            override fun onPageStarted(view: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
                super.onPageStarted(view, url, favicon)
                Timber.d("ApioWebViewFragment: onPageStarted")
                if (url != null && isMercadoPagoUrl(url)) {
                    Timber.d("ApioWebViewFragment: Mercado Pago URL detected in onPageStarted, blocking and showing dialog")
                    mercadoPagoBlocked = true
                    view?.stopLoading()
                    showMercadoPagoUnsupportedDialog()
                }
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                Timber.d("ApioWebViewFragment: onPageFinished")
            }

            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url?.toString() ?: run {
                    Timber.w("ApioWebViewFragment: shouldOverrideUrlLoading - URL is null, returning false")
                    return false
                }
                
                // Let WebView handle HTTP(S) URLs
                if (url.startsWith("http://") || url.startsWith("https://")) {
                    if (isMercadoPagoUrl(url)) {
                        Timber.d("ApioWebViewFragment: Mercado Pago URL detected, blocking and showing dialog")
                        mercadoPagoBlocked = true
                        showMercadoPagoUnsupportedDialog()
                        return true
                    }
                    Timber.d("ApioWebViewFragment: shouldOverrideUrlLoading - HTTP(S) URL")
                    return false
                }
                
                // Ignore about:blank - this is an internal WebView URL
                if (url == "about:blank") {
                    return false
                }

                val scheme = request.url?.scheme
                Timber.d("ApioWebViewFragment: shouldOverrideUrlLoading - Non-HTTP scheme '$scheme' detected")

                try {
                    when {
                        url.startsWith("mercadopago://") -> {
                            Timber.d("ApioWebViewFragment: Mercado Pago scheme detected, blocking and showing dialog")
                            mercadoPagoBlocked = true
                            showMercadoPagoUnsupportedDialog()
                            return true
                        }
                        url.startsWith("market://") -> {
                            if (mercadoPagoBlocked || mercadoPagoDialogShown) {
                                Timber.d("ApioWebViewFragment: Blocking market:// fallback after Mercado Pago dialog")
                                return true
                            }
                            // If we already launched an external app (e.g., mercadopago://), ignore the Play Store fallback
                            if (hasLaunchedExternalApp) {
                                Timber.d("ApioWebViewFragment: Ignoring market:// fallback - already launched external app")
                                return true
                            }
                            
                            Timber.d("ApioWebViewFragment: Handling market:// scheme")
                            try {
                                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                                startActivity(intent)
                                Timber.d("ApioWebViewFragment: Successfully launched Play Store intent")
                            } catch (e: Exception) {
                                Timber.w(e, "ApioWebViewFragment: Failed to launch market:// intent, falling back to web URL")
                                val packageId = Uri.parse(url).getQueryParameter("id") ?: url.substringAfter("id=").substringBefore("&")
                                val playStoreUrl = "https://play.google.com/store/apps/details?id=$packageId"
                                Timber.d("ApioWebViewFragment: Loading fallback URL")
                                view?.loadUrl(playStoreUrl)
                            }
                            return true
                        }
                        
                        url.startsWith("intent://") -> {
                            Timber.d("ApioWebViewFragment: Handling intent:// scheme")
                            try {
                                val intent = Intent.parseUri(url, Intent.URI_INTENT_SCHEME)
                                if (intent != null) {
                                    Timber.d("ApioWebViewFragment: Parsed intent - action: ${intent.action}, package: ${intent.`package`}")
                                    
                                    // Try to launch the intent directly (bypasses Android 11+ package visibility issues)
                                    try {
                                        startActivity(intent)
                                        Timber.d("ApioWebViewFragment: Successfully launched intent")
                                        hasLaunchedExternalApp = true
                                        return true
                                    } catch (e: Exception) {
                                        Timber.d("ApioWebViewFragment: Could not launch intent directly, checking fallbacks")
                                    }
                                    
                                    // Fallback to browser_fallback_url
                                    val fallbackUrl = intent.getStringExtra("browser_fallback_url")
                                    if (!fallbackUrl.isNullOrEmpty()) {
                                        Timber.d("ApioWebViewFragment: Using browser_fallback_url")
                                        view?.loadUrl(fallbackUrl)
                                        return true
                                    }
                                    
                                    // Fallback to Play Store for the package
                                    val packageName = intent.`package`
                                    if (!packageName.isNullOrEmpty()) {
                                        Timber.d("ApioWebViewFragment: Redirecting to Play Store for package: $packageName")
                                        val playStoreUrl = "https://play.google.com/store/apps/details?id=$packageName"
                                        try {
                                            val marketIntent = Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=$packageName"))
                                            startActivity(marketIntent)
                                            Timber.d("ApioWebViewFragment: Launched Play Store app for package")
                                        } catch (e: Exception) {
                                            Timber.d("ApioWebViewFragment: Loading Play Store web URL")
                                            view?.loadUrl(playStoreUrl)
                                        }
                                        return true
                                    }
                                    Timber.w("ApioWebViewFragment: No fallback options available for intent")
                                }
                            } catch (e: Exception) {
                                Timber.e(e, "ApioWebViewFragment: Failed to handle intent:// scheme")
                            }
                        }
                        
                        else -> {
                            // Generic scheme handling (mercadopago://, tel:, mailto:, sms:, whatsapp://, etc.)
                            Timber.d("ApioWebViewFragment: Handling generic scheme: $scheme")
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                            
                            // Try to launch directly (bypasses Android 11+ package visibility issues)
                            try {
                                startActivity(intent)
                                Timber.d("ApioWebViewFragment: Successfully launched activity for scheme: $scheme")
                                hasLaunchedExternalApp = true
                                return true
                            } catch (e: Exception) {
                                Timber.w("ApioWebViewFragment: No activity found to handle scheme '$scheme' - app may not be installed")
                            }
                        }
                    }
                } catch (e: Exception) {
                    Timber.e(e, "ApioWebViewFragment: Failed to handle URL scheme")
                }
                
                // Return true for non-HTTP schemes to prevent WebView from trying to load them
                return true
            }

            override fun doUpdateVisitedHistory(view: WebView?, url: String?, isReload: Boolean) {
                super.doUpdateVisitedHistory(view, url, isReload)
                if (url != null) {
                    Timber.d("ApioWebViewFragment: doUpdateVisitedHistory - isReload: $isReload")
                    if (url.contains("approved") && url.contains("soymomo")) {
                        Timber.d("ApioWebViewFragment: doUpdateVisitedHistory - Payment APPROVED detected")
                        newSubscriptionViewModel.trackSimPaymentResult(
                            result = SimAnalytics.Result.SUCCESS,
                            paymentPath = SimAnalytics.PaymentPath.APIO_NEW_CARD,
                        )
                        when (activity) {
                            is SimActivity -> {
                                Timber.d("ApioWebViewFragment: doUpdateVisitedHistory - Navigating to success from SimActivity")
                                navigateById(R.id.action_add_sim_apioWebViewFragment_to_newSubscriptionPaymentSuccess)
                            }
                            is AddFirstMomoActivity -> {
                                Timber.d("ApioWebViewFragment: doUpdateVisitedHistory - Navigating to success from AddFirstMomoActivity")
                                navigateById(R.id.action_add_momo_apioWebViewFragment_to_newSubscriptionPaymentSuccess)
                            }
                            is LinkWatchActivity -> {
                                Timber.d("ApioWebViewFragment: doUpdateVisitedHistory - Navigating to success from LinkWatchActivity")
                                navigateById(R.id.action_add_sim_apioWebViewFragment_to_newSubscriptionPaymentSuccess)
                            }
                            else -> {
                                Timber.w("ApioWebViewFragment: doUpdateVisitedHistory - Payment approved but unknown activity type: ${activity?.javaClass?.simpleName}")
                            }
                        }

                    } else if (url.contains("failure") && url.contains("soymomo")) {
                        Timber.d("ApioWebViewFragment: doUpdateVisitedHistory - Payment FAILURE detected")
                        newSubscriptionViewModel.trackSimPaymentResult(
                            result = SimAnalytics.Result.ERROR,
                            paymentPath = SimAnalytics.PaymentPath.APIO_NEW_CARD,
                            errorType = "provider_failure",
                        )
                        when (activity) {
                            is SimActivity -> {
                                Timber.d("ApioWebViewFragment: doUpdateVisitedHistory - Navigating to error from SimActivity")
                                navigateById(R.id.action_add_sim_apioWebViewFragment_to_newSubscriptionPaymentError)
                            }
                            is AddFirstMomoActivity -> {
                                Timber.d("ApioWebViewFragment: doUpdateVisitedHistory - Navigating to error from AddFirstMomoActivity")
                                navigateById(R.id.action_add_momo_apioWebViewFragment_to_newSubscriptionPaymentError)
                            }
                            is LinkWatchActivity -> {
                                Timber.d("ApioWebViewFragment: doUpdateVisitedHistory - Navigating to error from LinkWatchActivity")
                                navigateById(R.id.action_add_sim_apioWebViewFragment_to_newSubscriptionPaymentError)
                            }
                            else -> {
                                Timber.w("ApioWebViewFragment: doUpdateVisitedHistory - Payment failed but unknown activity type: ${activity?.javaClass?.simpleName}")
                            }
                        }
                    }
                }
            }
        }
        binding.webView.settings.javaScriptEnabled = true
        binding.webView.settings.domStorageEnabled = true
        Timber.d("ApioWebViewFragment: setUpWebView - WebView configured (JS enabled, DOM storage enabled)")
    }

    private fun navigateById(navId: Int, bundle: Bundle = bundleOf()) {
        Timber.d("ApioWebViewFragment: navigateById - navId: $navId")
        try {
            findNavController().navigate(navId, bundle)
            Timber.d("ApioWebViewFragment: navigateById - Navigation successful")
        } catch (e: Exception) {
            Timber.e(e, "ApioWebViewFragment: navigateById - Navigation failed for navId: $navId")
        }
    }

    override fun onDestroyView() {
        Timber.d("ApioWebViewFragment: onDestroyView")
        super.onDestroyView()
        dispose()
    }

    private fun dispose() {
        Timber.d("ApioWebViewFragment: dispose - cleaning up WebView")
        mercadoPagoDialog?.dismiss()
        mercadoPagoDialog = null
    }
}
