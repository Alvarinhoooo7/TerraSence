package com.sosmartlabs.momo.utils.dns

import okhttp3.Dns
import timber.log.Timber
import java.net.InetAddress
import java.net.UnknownHostException

/**
 * Custom DNS implementation that only returns IPv4 addresses.
 *
 * This DNS resolver filters out any IPv6 addresses from the standard system DNS resolution,
 * ensuring that only IPv4 addresses are used for network connections.
 */
class IPv4OnlyDns : Dns {
    private val systemDns = Dns.SYSTEM

    @Throws(UnknownHostException::class)
    override fun lookup(hostname: String): List<InetAddress> {
        val addresses = systemDns.lookup(hostname)
        // Filter for IPv4 addresses only (IPv4 addresses don't contain ':')
        val ipv4Addresses = addresses.filter { !it.hostAddress!!.contains(':') }

        if (ipv4Addresses.isEmpty()) {
            Timber.w("IPv4OnlyDns: No IPv4 addresses found for $hostname")
            throw UnknownHostException("No IPv4 addresses found for $hostname")
        }

        Timber.d("IPv4OnlyDns: Resolved $hostname to IPv4 addresses: ${ipv4Addresses.joinToString { it.hostAddress ?: "" }}")
        return ipv4Addresses
    }
}