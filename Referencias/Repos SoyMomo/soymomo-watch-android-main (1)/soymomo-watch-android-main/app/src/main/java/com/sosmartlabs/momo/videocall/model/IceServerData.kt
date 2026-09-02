package com.sosmartlabs.momo.videocall.model

import org.webrtc.PeerConnection
import java.io.Serializable

class IceServerData(
    @Transient val list: List<PeerConnection.IceServer>
): Serializable