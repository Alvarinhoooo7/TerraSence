package com.sosmartlabs.momo.session

import android.content.Intent
import android.os.Bundle
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import com.sosmartlabs.momo.BuildConfig
import com.sosmartlabs.momo.dispatch.DispatchActivity
import com.sosmartlabs.momologin.MomoLogin
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class SessionActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        launchMomoLogin()
    }

    private fun launchMomoLogin() {
        val intent = Intent(applicationContext, MomoLogin::class.java).apply {
            putExtra(MomoLogin.EXTRA_GOOGLE_ID, BuildConfig.googleAuthKey)
            // Explicit watch-mode selector. The library defaults to watch when AppName
            // isn't set, but pin it so we don't depend on that default.
            putExtra(MomoLogin.EXTRA_APP_NAME, MomoLogin.MODE_WATCH)
        }
        val launcher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) {
            returnToDispatch()
        }
        launcher.launch(intent)
    }

    private fun returnToDispatch() {
        val callbackIntent = Intent(this, DispatchActivity::class.java)
            .setFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
        startActivity(callbackIntent)
        finish()
    }

}