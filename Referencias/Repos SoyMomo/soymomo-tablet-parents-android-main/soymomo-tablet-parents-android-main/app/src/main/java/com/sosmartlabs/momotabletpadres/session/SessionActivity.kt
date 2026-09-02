package com.sosmartlabs.momotabletpadres.session

import android.content.Intent
import android.os.Bundle
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import com.sosmartlabs.momologin.MomoLogin
import com.sosmartlabs.momotabletpadres.BuildConfig
import com.sosmartlabs.momotabletpadres.dispatch.DispatchActivity
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
            // Non-watch value selects the phone/tablet flow. There is no MODE_TABLET
            // constant; any value other than MomoLogin.MODE_WATCH works. Do NOT omit it:
            // an absent AppName defaults to watch mode, which requires a birthday.
            putExtra(MomoLogin.EXTRA_APP_NAME, "SoyMomoParentTablet")
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