package com.sosmartlabs.momo.videocall.soymomowebrtc.interfaces

import org.webrtc.SdpObserver
import org.webrtc.SessionDescription

open class SDPObserver : SdpObserver {
    override fun onSetFailure(p0: String?) {
    }

    override fun onSetSuccess() {
    }

    override fun onCreateSuccess(p0: SessionDescription?) {
    }

    override fun onCreateFailure(p0: String?) {
    }
}