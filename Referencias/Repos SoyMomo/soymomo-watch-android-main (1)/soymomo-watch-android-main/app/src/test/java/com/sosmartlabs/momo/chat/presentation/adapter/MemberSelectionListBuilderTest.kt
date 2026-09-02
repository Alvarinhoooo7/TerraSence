package com.sosmartlabs.momo.chat.presentation.adapter

import com.sosmartlabs.momo.chat.presentation.model.MemberItem
import org.junit.Assert.assertEquals
import org.junit.Test

class MemberSelectionListBuilderTest {

    @Test
    fun `watches section appears before parents`() {
        val rows = buildRows(
            listOf(
                parent(id = "parent-1", name = "Ana Parent"),
                watch(id = "watch-1", name = "Lucas Watch"),
            )
        )

        assertEquals(MemberSelectionListItem.Header(WATCHES_TITLE), rows[0])
        assertEquals("watch-1", (rows[1] as MemberSelectionListItem.Member).member.id)
        assertEquals(MemberSelectionListItem.Header(PARENTS_TITLE), rows[2])
        assertEquals("parent-1", (rows[3] as MemberSelectionListItem.Member).member.id)
    }

    @Test
    fun `empty sections are omitted`() {
        val rows = buildRows(
            listOf(
                parent(id = "parent-1", name = "Ana Parent"),
                parent(id = "parent-2", name = "Tom Parent"),
            )
        )

        assertEquals(
            listOf(
                MemberSelectionListItem.Header(PARENTS_TITLE),
                MemberSelectionListItem.Member(parent(id = "parent-1", name = "Ana Parent")),
                MemberSelectionListItem.Member(parent(id = "parent-2", name = "Tom Parent")),
            ),
            rows
        )
    }

    @Test
    fun `search filters by name type and model`() {
        val members = listOf(
            watch(id = "watch-1", name = "Lucas", model = "SoyMomo Space 4"),
            parent(id = "parent-1", name = "Francisca"),
        )

        assertEquals(listOf("parent-1"), filterIds(members, "Francisca"))
        assertEquals(listOf("parent-1"), filterIds(members, PARENT_LABEL))
        assertEquals(listOf("watch-1"), filterIds(members, "Space 4"))
    }

    private fun buildRows(members: List<MemberItem>, query: String = ""): List<MemberSelectionListItem> {
        return MemberSelectionListBuilder.build(
            members = members,
            query = query,
            watchLabel = WATCH_LABEL,
            parentLabel = PARENT_LABEL,
            watchesTitle = WATCHES_TITLE,
            parentsTitle = PARENTS_TITLE,
        )
    }

    private fun filterIds(members: List<MemberItem>, query: String): List<String> {
        return MemberSelectionListBuilder.filterMembers(
            members = members,
            query = query,
            watchLabel = WATCH_LABEL,
            parentLabel = PARENT_LABEL,
        ).map { it.id }
    }

    private fun watch(
        id: String,
        name: String,
        model: String = "SoyMomo Space 4",
    ) = MemberItem(
        id = id,
        name = name,
        avatarUrl = null,
        isWearer = true,
        wearerModelName = model,
    )

    private fun parent(id: String, name: String) = MemberItem(
        id = id,
        name = name,
        avatarUrl = null,
        isWearer = false,
    )

    private companion object {
        const val WATCH_LABEL = "Watch"
        const val PARENT_LABEL = "Parent"
        const val WATCHES_TITLE = "Watches"
        const val PARENTS_TITLE = "Parents"
    }
}
