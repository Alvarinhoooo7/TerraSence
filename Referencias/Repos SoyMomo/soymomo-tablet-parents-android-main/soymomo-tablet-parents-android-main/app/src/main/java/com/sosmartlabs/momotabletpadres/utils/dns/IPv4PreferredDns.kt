package com.sosmartlabs.momotabletpadres.utils.dns

import okhttp3.Dns
import timber.log.Timber
import java.net.Inet4Address
import java.net.InetAddress
import java.net.UnknownHostException

/**
 * OkHttp [Dns] that prefers IPv4.
 *
 * On a dual-stack host it returns ONLY the IPv4 addresses, so the HTTP client
 * never attempts an IPv6 connection. This avoids long stalls on networks that
 * advertise IPv6 but can't actually route it (broken/partial IPv6 — common on
 * some ISPs, mobile carriers, VPNs and captive Wi-Fi), where the IPv6 connect
 * hangs until it times out and the app appears to "stop getting responses".
 *
 * On a genuinely IPv6-only network (carrier NAT64/DNS64) there are no IPv4
 * addresses to return, so we fall back to whatever the system resolved (the
 * IPv6 set) to keep connectivity working there too. This is the key
 * improvement over a strict "IPv4-only" resolver, which throws
 * [UnknownHostException] and breaks the app entirely on IPv6-only networks.
 */
class IPv4PreferredDns : Dns {

    @Throws(UnknownHostException::class)
    override fun lookup(hostname: String): List<InetAddress> {
        val resolved = Dns.SYSTEM.lookup(hostname)
        val ipv4 = resolved.filterIsInstance<Inet4Address>()
        return if (ipv4.isNotEmpty()) {
            Timber.d("IPv4PreferredDns: %s -> IPv4 %s", hostname, ipv4.joinToString { it.hostAddress ?: "" })
            ipv4
        } else {
            // IPv6-only network (e.g. NAT64/DNS64): keep what the system gave us.
            Timber.d("IPv4PreferredDns: %s -> no IPv4, using %d resolved address(es)", hostname, resolved.size)
            resolved
        }
    }
}
