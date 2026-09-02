package com.sosmartlabs.momo.utils.dns

import okhttp3.Dns
import timber.log.Timber
import java.net.InetAddress
import java.net.UnknownHostException

/**
 * Custom DNS implementation that only returns IPv6 addresses.
 *
 * This DNS resolver filters out any IPv4 addresses from the standard system DNS resolution,
 * ensuring that only IPv6 addresses are used for network connections.
 * Useful for testing IPv6 connectivity.
 */
class IPv6OnlyDns : Dns {
    private val systemDns = Dns.SYSTEM

    @Throws(UnknownHostException::class)
    override fun lookup(hostname: String): List<InetAddress> {
        val addresses = systemDns.lookup(hostname)
        // Filter for IPv6 addresses only (IPv6 addresses contain ':')
        val ipv6Addresses = addresses.filter { it.hostAddress!!.contains(':') }

        if (ipv6Addresses.isEmpty()) {
            Timber.w("IPv6OnlyDns: No IPv6 addresses found for $hostname")
            throw UnknownHostException("No IPv6 addresses found for $hostname")
        }

        Timber.d("IPv6OnlyDns: Resolved $hostname to IPv6 addresses: ${ipv6Addresses.joinToString { it.hostAddress ?: "" }}")
        return ipv6Addresses
    }
}