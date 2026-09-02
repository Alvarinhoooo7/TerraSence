package com.sosmartlabs.momo.chat.presentation.adapter

import com.sosmartlabs.momo.chat.presentation.model.MemberItem

internal sealed class MemberSelectionListItem {
    data class Header(val title: String) : MemberSelectionListItem()
    data class Member(val member: MemberItem) : MemberSelectionListItem()
}

internal object MemberSelectionListBuilder {
    fun build(
        members: List<MemberItem>,
        query: String,
        watchLabel: String,
        parentLabel: String,
        watchesTitle: String,
        parentsTitle: String,
    ): List<MemberSelectionListItem> {
        val filteredMembers = filterMembers(
            members = members,
            query = query,
            watchLabel = watchLabel,
            parentLabel = parentLabel,
        )
        val watches = filteredMembers.filter { it.isWearer }
        val parents = filteredMembers.filterNot { it.isWearer }

        return buildList {
            if (watches.isNotEmpty()) {
                add(MemberSelectionListItem.Header(watchesTitle))
                addAll(watches.map(MemberSelectionListItem::Member))
            }
            if (parents.isNotEmpty()) {
                add(MemberSelectionListItem.Header(parentsTitle))
                addAll(parents.map(MemberSelectionListItem::Member))
            }
        }
    }

    fun filterMembers(
        members: List<MemberItem>,
        query: String,
        watchLabel: String,
        parentLabel: String,
    ): List<MemberItem> {
        val normalizedQuery = query.trim()
        if (normalizedQuery.isBlank()) {
            return members
        }

        return members.filter { member ->
            val typeLabel = if (member.isWearer) watchLabel else parentLabel
            member.name.contains(normalizedQuery, ignoreCase = true) ||
                typeLabel.contains(normalizedQuery, ignoreCase = true) ||
                member.wearerModelName?.contains(normalizedQuery, ignoreCase = true) == true
        }
    }
}
