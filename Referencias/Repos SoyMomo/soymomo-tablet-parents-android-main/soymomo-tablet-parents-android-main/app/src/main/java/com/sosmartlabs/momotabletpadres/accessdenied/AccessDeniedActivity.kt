package com.sosmartlabs.momotabletpadres.accessdenied

import android.os.Bundle
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowInsetsControllerCompat
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.databinding.ActivityAccessDeniedBinding
import com.sosmartlabs.momotabletpadres.utils.WindowInsetsUtils
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber
import kotlin.system.exitProcess

@AndroidEntryPoint
class AccessDeniedActivity : AppCompatActivity() {

    private lateinit var binding: ActivityAccessDeniedBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        binding = ActivityAccessDeniedBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setupToolbar()
        WindowInsetsUtils.applyEdgeToEdgeInsets(
            root = binding.root,
            topView = binding.soymomoLogoImage,
            bottomView = binding.activityButtonBack,
            bottomAsMargin = true
        )
        setListeners()
    }

    private fun setListeners() {
        binding.activityButtonBack.setOnClickListener {
            exitApp()
        }
    }

    private fun setupToolbar() {
        Timber.d("AccessDeniedActivity: setupToolbar() - started")
        try {
            WindowInsetsControllerCompat(window, window.decorView).isAppearanceLightStatusBars = true
            Timber.d("AccessDeniedActivity: setupToolbar() - finished")
        } catch (e: Exception) {
            Timber.e(e, "AccessDeniedActivity: Error setting up toolbar")
            CrashlyticsLog.recordException(e, "AccessDeniedActivity: Error setting up toolbar")
        }
    }

    private fun exitApp() {
        finishAffinity();
        exitProcess(0)
    }

}