package com.sosmartlabs.momo.utils.collapsingtoolbar

import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.Toolbar
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import com.sosmartlabs.momo.R
import timber.log.Timber

object CollapsingToolbarUtils {

     fun setupToolbar(fragment: Fragment, toolbar: Toolbar, toolbarTitle: String) {
        Timber.d("setupToolbar")
        with(fragment.activity as AppCompatActivity) {
            setSupportActionBar(toolbar)
            supportActionBar?.apply {
                title = toolbarTitle
                setDisplayShowTitleEnabled(true)
                setDisplayHomeAsUpEnabled(true)
                setDisplayShowHomeEnabled(true)
            }
            window.statusBarColor = ContextCompat.getColor(fragment.requireContext(),
                R.color.background_sim_step_card_title)
            window.navigationBarColor = ContextCompat.getColor(fragment.requireContext(),
                R.color.white)
            toolbar.setNavigationOnClickListener { onBackPressed() }
        }
    }

}