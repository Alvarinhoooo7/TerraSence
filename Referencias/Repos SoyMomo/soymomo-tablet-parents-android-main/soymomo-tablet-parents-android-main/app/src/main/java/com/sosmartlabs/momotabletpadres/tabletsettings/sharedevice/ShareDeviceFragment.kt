package com.sosmartlabs.momotabletpadres.tabletsettings.sharedevice

import android.graphics.drawable.Drawable
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import com.bumptech.glide.Glide
import com.github.alexzhirkevich.customqrgenerator.QrData
import com.github.alexzhirkevich.customqrgenerator.vector.QrCodeDrawable
import com.github.alexzhirkevich.customqrgenerator.vector.createQrVectorOptions
import com.github.alexzhirkevich.customqrgenerator.vector.style.QrVectorBallShape
import com.github.alexzhirkevich.customqrgenerator.vector.style.QrVectorColor
import com.github.alexzhirkevich.customqrgenerator.vector.style.QrVectorFrameShape
import com.github.alexzhirkevich.customqrgenerator.vector.style.QrVectorLogoPadding
import com.github.alexzhirkevich.customqrgenerator.vector.style.QrVectorLogoShape
import com.github.alexzhirkevich.customqrgenerator.vector.style.QrVectorPixelShape
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.databinding.FragmentLinkDeviceBinding
import com.sosmartlabs.momotabletpadres.tablet.TabletViewModel
import com.sosmartlabs.momotabletpadres.utils.WindowInsetsUtils
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber

@AndroidEntryPoint
class ShareDeviceFragment : Fragment() {

    private lateinit var binding: FragmentLinkDeviceBinding

    val tabletViewModel: TabletViewModel by activityViewModels()

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        Timber.d("ShareDeviceFragment: onCreateView - inflating layout and setting up toolbar")
        binding = FragmentLinkDeviceBinding.inflate(inflater, container, false)
        setupToolbar()
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        Timber.d("ShareDeviceFragment: onViewCreated - view created, initializing tablet QR and objectId")
        super.onViewCreated(view, savedInstanceState)

        WindowInsetsUtils.applyEdgeToEdgeInsets(
            root = binding.root,
            topView = binding.appBarLayout,
            bottomView = binding.contentScrollView
        )

        val tablet = tabletViewModel.tablet.value
        if (tablet == null) {
            Timber.e("ShareDeviceFragment: onViewCreated - tabletViewModel.tablet.value is null")
            CrashlyticsLog.recordNonFatalError(
                IllegalStateException("TabletViewModel.tablet.value is null"),
                "ShareDeviceFragment: onViewCreated - tablet is null"
            )
            return
        }
        setupTabletQr(tablet)
        setupTabletObjectId(tablet)
    }

    private fun setupToolbar() {
        Timber.d("ShareDeviceFragment: setupToolbar - configuring toolbar")
        val activity = activity
        if (activity is AppCompatActivity) {
            Timber.d("ShareDeviceFragment: setupToolbar - activity is AppCompatActivity, setting up supportActionBar")
            activity.setSupportActionBar(binding.toolbar)
            activity.supportActionBar?.apply {
                setDisplayShowTitleEnabled(false)
                setDisplayHomeAsUpEnabled(true)
                setDisplayShowHomeEnabled(true)
            }
            Timber.d("ShareDeviceFragment: setupToolbar - toolbar configured successfully")
        } else {
            Timber.e("ShareDeviceFragment: setupToolbar - Activity is not AppCompatActivity, cannot set up toolbar")
            CrashlyticsLog.recordNonFatalError(
                IllegalStateException("Activity is not AppCompatActivity"),
                "ShareDeviceFragment: setupToolbar - failed to set up toolbar"
            )
        }
        setHasOptionsMenu(true)
    }

    private fun setupTabletQr(tablet: Tablet) {
        Timber.d("ShareDeviceFragment: setupTabletQr - preparing to generate QR code for tabletId=${tablet.objectId}")
        try {
            val qrCode = createTabletQrCode(tablet)
            Timber.d("ShareDeviceFragment: setupTabletQr - QR code generated successfully for tabletId=${tablet.objectId}")
            Glide.with(requireContext())
                .load(qrCode)
                .into(binding.tabletQr)
            Timber.d("ShareDeviceFragment: setupTabletQr - QR code loaded into ImageView")
        } catch (e: Exception) {
            Timber.e(e, "ShareDeviceFragment: setupTabletQr - Failed to generate or load QR code for tabletId=${tablet.objectId}")
            CrashlyticsLog.recordNonFatalError(
                e,
                "ShareDeviceFragment: setupTabletQr - Exception generating/loading QR code for tabletId=${tablet.objectId}"
            )
        }
    }

    private fun setupTabletObjectId(tablet: Tablet) {
        Timber.d("ShareDeviceFragment: setupTabletObjectId - setting tablet objectId text")
        if (tablet.objectId.isNullOrEmpty()) {
            Timber.e("ShareDeviceFragment: setupTabletObjectId - tablet.objectId is null or empty")
            CrashlyticsLog.log("ShareDeviceFragment: setupTabletObjectId - tablet.objectId is null or empty")
            binding.tabletObjectId.text = getString(R.string.settings_remote_capture_day_date, "N/A")
        } else {
            binding.tabletObjectId.text = tablet.objectId
            Timber.d("ShareDeviceFragment: setupTabletObjectId - tablet.objectId set to ${tablet.objectId}")
        }
    }

    private fun createTabletQrCode(tablet: Tablet): Drawable {
        Timber.d("ShareDeviceFragment: createTabletQrCode - generating QR code for tabletId=${tablet.objectId}")
        val tabletId = tablet.objectId
        if (tabletId.isNullOrEmpty()) {
            Timber.e("ShareDeviceFragment: createTabletQrCode - tablet.objectId is null or empty, cannot generate QR code")
            CrashlyticsLog.recordNonFatalError(
                IllegalStateException("Tablet objectId is null or empty"),
                "ShareDeviceFragment: createTabletQrCode - tablet.objectId is null or empty"
            )
            throw IllegalStateException("Tablet objectId is null or empty")
        }

        val qrData = QrData.Text(tabletId)
        val qrOptions = createQrVectorOptions {
            logo {
                drawable = ContextCompat.getDrawable(requireContext(), R.drawable.ic_soymomo_phone)
                size = .25f
                padding = QrVectorLogoPadding.Natural(.2f)
                shape = QrVectorLogoShape.Circle
            }
            colors {
                val colorPrimary = ContextCompat.getColor(requireContext(), R.color.colorPrimary)
                dark = QrVectorColor.Solid(colorPrimary)
                ball = QrVectorColor.Solid(colorPrimary)
                frame = QrVectorColor.Solid(colorPrimary)
            }
            shapes {
                darkPixel = QrVectorPixelShape.RoundCorners(.5f)
                ball = QrVectorBallShape.RoundCorners(.25f)
                frame = QrVectorFrameShape.RoundCorners(.25f)
            }
        }
        val qrCodeDrawable = QrCodeDrawable(qrData, qrOptions)
        Timber.d("ShareDeviceFragment: createTabletQrCode - QR code drawable created for tabletId=$tabletId")
        return qrCodeDrawable
    }
}