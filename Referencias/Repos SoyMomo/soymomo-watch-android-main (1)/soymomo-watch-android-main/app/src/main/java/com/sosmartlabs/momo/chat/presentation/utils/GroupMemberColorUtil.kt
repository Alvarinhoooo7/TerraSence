package com.sosmartlabs.momo.chat.presentation.utils

import android.content.Context
import androidx.core.content.ContextCompat
import com.sosmartlabs.momo.R

/**
 * Utility class for assigning sequential colors to group members for name differentiation.
 * Each member gets a unique color from a predefined palette based on their order in the group.
 */
class GroupMemberColorUtil(private val context: Context) {
    
    companion object {
        /**
         * Palette of distinguishable colors for member names.
         * These colors work well on white/light backgrounds.
         */
        private val NAME_COLOR_RESOURCES = listOf(
            R.color.colorPrimary,      // Purple
            R.color.momoBlue,          // Blue
            R.color.momoGreen,         // Green
            R.color.momoOrange,        // Orange
            R.color.colorAccent,       // Pink
            R.color.autoAnswer,        // Cyan
            R.color.sound,             // Amber
            R.color.time               // Indigo
        )
    }
    
    // Map to store member ID to color index assignments
    private val memberColorMap = mutableMapOf<String, Int>()
    
    // Counter for sequential color assignment
    private var colorCounter = 0
    
    /**
     * Get the color for a specific member ID.
     * If the member already has a color assigned, returns that color.
     * Otherwise, assigns the next color in sequence.
     * 
     * @param memberId The unique identifier of the group member
     * @return The color resource ID for this member
     */
    fun getColorForMember(memberId: String): Int {
        val colorIndex = memberColorMap.getOrPut(memberId) {
            val index = colorCounter % NAME_COLOR_RESOURCES.size
            colorCounter++
            index
        }
        
        return ContextCompat.getColor(context, NAME_COLOR_RESOURCES[colorIndex])
    }
    
    /**
     * Pre-assign colors to a list of members in order.
     * This ensures consistent color assignment based on member list order.
     * 
     * @param memberIds List of member IDs in the desired order
     */
    fun initializeMembers(memberIds: List<String>) {
        memberIds.forEach { memberId ->
            if (!memberColorMap.containsKey(memberId)) {
                val index = colorCounter % NAME_COLOR_RESOURCES.size
                memberColorMap[memberId] = index
                colorCounter++
            }
        }
    }
    
    /**
     * Clear all color assignments.
     * Useful when leaving a group or refreshing member list.
     */
    fun clear() {
        memberColorMap.clear()
        colorCounter = 0
    }
    
    /**
     * Get the total number of available colors in the palette.
     */
    fun getPaletteSize(): Int = NAME_COLOR_RESOURCES.size
}

