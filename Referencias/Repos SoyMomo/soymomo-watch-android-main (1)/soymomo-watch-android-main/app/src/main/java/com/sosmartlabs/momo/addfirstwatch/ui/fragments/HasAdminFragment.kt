package com.sosmartlabs.momo.addfirstwatch.ui.fragments

import android.content.Intent
import android.os.Bundle
import android.text.Html
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.os.bundleOf
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import com.airbnb.lottie.LottieDrawable
import com.bumptech.glide.Glide
import com.bumptech.glide.load.resource.drawable.DrawableTransitionOptions
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.addfirstwatch.model.WatchAdminInfo
import com.sosmartlabs.momo.addfirstwatch.ui.AddFirstMomoViewModel
import com.sosmartlabs.momo.databinding.AddWatchImeiHasAdminFragmentBinding
import com.sosmartlabs.momo.main.MainActivity
import com.sosmartlabs.momo.utils.ui.DefaultErrorDialog
import com.sosmartlabs.momo.utils.ui.DefaultInfoDialog
import jp.wasabeef.glide.transformations.BlurTransformation
import timber.log.Timber

class HasAdminFragment: Fragment() {

    /**
     * Binding
     */
    private lateinit var binding: AddWatchImeiHasAdminFragmentBinding

    /**
     * ViewModel
     */
    private val addFirstMomoViewModel: AddFirstMomoViewModel by activityViewModels()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        binding = AddWatchImeiHasAdminFragmentBinding.inflate(inflater, container, false)
        setAnimation()
        addFirstMomoViewModel.setProgressStep(-1)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupListeners()
        observeViewModel()
    }

    private fun setAnimation() {
        with(binding.hasAdminAnimation) {
            setAnimation(R.raw.imei_already_linked)
            repeatCount = LottieDrawable.INFINITE
            playAnimation()
        }
    }

    private fun navigateById(navId: Int, bundle: Bundle = bundleOf()) {
        val navController = findNavController()
        if (navController.currentDestination?.getAction(navId) != null) {
            navController.navigate(navId, bundle)
        } else {
            Timber.w("Skipping stale navigation to $navId from ${navController.currentDestination?.label}")
        }
    }

    private fun setupListeners() {
        binding.buttonSendRequest.setOnClickListener {
            showInfoDialog(getString(R.string.add_watch_imei_has_admin_authorization_requested_title), getString(R.string.add_watch_imei_has_admin_authorization_requested_description))
        }

        binding.buttonBackMenu.setOnClickListener {
            val intent = Intent(context, MainActivity::class.java)
            intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_NEW_TASK)
            startActivity(intent)
        }
    }

    private fun observeViewModel() {
        addFirstMomoViewModel.watchAdminInfo.observe(viewLifecycleOwner) { adminInfo ->
            if (adminInfo != null) {
                Timber.d(
                    "HasAdminFragment: Received admin info - " +
                        "hasEmail=${adminInfo.email?.isNotBlank()}, " +
                        "hasFullName=${adminInfo.fullName?.isNotBlank()}, " +
                        "hasPhone=${adminInfo.phone?.isNotBlank()}, " +
                        "hasImageUrl=${adminInfo.imageUrl?.isNotBlank()}"
                )
                binding.hasAdminMaskedInfoCard.visibility = View.VISIBLE
                updateAdminInfoDisplay(adminInfo)
            } else {
                Timber.d("HasAdminFragment: No admin info available")
                binding.hasAdminMaskedInfoCard.visibility = View.GONE
            }
        }
    }

    private fun updateAdminInfoDisplay(adminInfo: WatchAdminInfo) {
        Timber.d("HasAdminFragment: Displaying admin info")

        // Update email text
        adminInfo.email?.let { email ->
            val emailText = getString(R.string.add_watch_imei_has_admin_masked_info_email, email)
            binding.hasAdminMaskedInfoCardEmail.text = emailText
            binding.hasAdminMaskedInfoCardEmail.visibility = View.VISIBLE
        } ?: run {
            binding.hasAdminMaskedInfoCardEmail.visibility = View.GONE
        }

        // Update name text
        adminInfo.fullName?.let { fullName ->
            val nameText = getString(R.string.add_watch_imei_has_admin_masked_info_name, fullName)
            binding.hasAdminMaskedInfoCardName.text = nameText
            binding.hasAdminMaskedInfoCardName.visibility = View.VISIBLE
        } ?: run {
            binding.hasAdminMaskedInfoCardName.visibility = View.GONE
        }

        // Update phone text
        adminInfo.phone?.let { phone ->
            val phoneText = getString(R.string.add_watch_imei_has_admin_masked_info_phone, phone)
            binding.hasAdminMaskedInfoCardPhone.text = phoneText
            binding.hasAdminMaskedInfoCardPhone.visibility = View.VISIBLE
        } ?: run {
            binding.hasAdminMaskedInfoCardPhone.visibility = View.GONE
        }

        // Load admin image with blur
        loadBlurredAdminImage(adminInfo.imageUrl)
    }

    private fun loadBlurredAdminImage(imageUrl: String?) {
        val blurRadius = 25 // Blur intensity (1-25)
        val sampling = 3 // Downsampling factor for performance

        if (!imageUrl.isNullOrBlank()) {
            Timber.d("HasAdminFragment: Loading blurred admin image")
            Glide.with(this)
                .load(imageUrl)
                .transform(BlurTransformation(blurRadius, sampling))
                .placeholder(R.drawable.momo_picture_default)
                .error(R.drawable.momo_picture_default)
                .transition(DrawableTransitionOptions.withCrossFade())
                .into(binding.hasAdminMaskedInfoCardImage)
        } else {
            Timber.d("HasAdminFragment: No image URL, loading blurred default image")
            Glide.with(this)
                .load(R.drawable.momo_picture_default)
                .transform(BlurTransformation(blurRadius, sampling))
                .transition(DrawableTransitionOptions.withCrossFade())
                .into(binding.hasAdminMaskedInfoCardImage)
        }
    }

    private fun showErrorDialog(title: String, description: String?) {
        val defaultErrorDialog = DefaultErrorDialog()
        defaultErrorDialog.arguments = bundleOf(
            "icon" to "",
            "title" to title,
            "description" to description,
        )
        defaultErrorDialog.show(childFragmentManager, title)
    }

    private fun showInfoDialog(title: String, description: String?) {
        val defaultInfoDialog = DefaultInfoDialog()
        defaultInfoDialog.arguments = bundleOf(
            "icon" to "",
            "title" to title,
            "description" to description,
        )
        defaultInfoDialog.show(childFragmentManager, title)
    }
}
