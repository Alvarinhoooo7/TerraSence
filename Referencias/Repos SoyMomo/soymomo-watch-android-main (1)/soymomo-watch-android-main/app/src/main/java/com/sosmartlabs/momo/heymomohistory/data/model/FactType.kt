package com.sosmartlabs.momo.heymomohistory.data.model

import android.content.Context
import androidx.annotation.StringRes
import com.sosmartlabs.momo.R
import java.io.Serializable

sealed class FactType : Serializable {
    object PetName : FactType()
    object FavoriteColor : FactType()
    object FavoriteFood : FactType()
    object FavoriteToy : FactType()
    object FavoriteSchoolSubject : FactType()
    object FavoriteActivity : FactType()
    object FriendName : FactType()
    object Hobby : FactType()
    data class Custom(val customName: String, val customPredicate: String) : FactType()

    @StringRes
    fun getDisplayNameRes(): Int = when (this) {
        is PetName -> R.string.fact_type_pet_name
        is FavoriteColor -> R.string.fact_type_favorite_color
        is FavoriteFood -> R.string.fact_type_favorite_food
        is FavoriteToy -> R.string.fact_type_favorite_toy
        is FavoriteSchoolSubject -> R.string.fact_type_favorite_school_subject
        is FavoriteActivity -> R.string.fact_type_favorite_activity
        is FriendName -> R.string.fact_type_friend_name
        is Hobby -> R.string.fact_type_hobby
        is Custom -> 0 // Custom types don't have resource IDs
    }

    @StringRes
    fun getPredicateRes(): Int = when (this) {
        is PetName -> R.string.fact_predicate_pet_name
        is FavoriteColor -> R.string.fact_predicate_favorite_color
        is FavoriteFood -> R.string.fact_predicate_favorite_food
        is FavoriteToy -> R.string.fact_predicate_favorite_toy
        is FavoriteSchoolSubject -> R.string.fact_predicate_favorite_school_subject
        is FavoriteActivity -> R.string.fact_predicate_favorite_activity
        is FriendName -> R.string.fact_predicate_friend_name
        is Hobby -> R.string.fact_predicate_hobby
        is Custom -> 0 // Custom types don't have resource IDs
    }

    fun getDisplayName(context: Context): String = when (this) {
        is PetName, is FavoriteColor, is FavoriteFood, is FavoriteToy, 
        is FavoriteSchoolSubject, is FavoriteActivity, is FriendName, is Hobby -> 
            context.getString(getDisplayNameRes())
        is Custom -> customName
    }

    /**
     * Returns machine-readable English predicate for backend storage
     * These match the standard predicate names in context.js
     */
    fun getBackendPredicate(): String = when (this) {
        is PetName -> "pet_name"
        is FavoriteColor -> "favorite_color"
        is FavoriteFood -> "favorite_food"
        is FavoriteToy -> "favorite_toy"
        is FavoriteSchoolSubject -> "favorite_school_subject"
        is FavoriteActivity -> "favorite_activity"
        is FriendName -> "friend_name"
        is Hobby -> "hobby"
        is Custom -> customPredicate.ifEmpty { 
            // Convert display name to snake_case for custom predicates
            customName.lowercase().trim().replace(Regex("\\s+"), "_")
        }
    }

    /**
     * Returns the predicate to be stored in Supabase
     * Always returns machine-readable English format
     */
    fun getPredicate(context: Context): String = getBackendPredicate()

    companion object {
        /**
         * Creates a FactType from a backend predicate string
         * Matches machine-readable English predicates (e.g., "pet_name", "favorite_color")
         */
        fun fromPredicate(predicate: String, context: Context): FactType {
            return when (predicate) {
                "pet_name" -> PetName
                "favorite_color" -> FavoriteColor
                "favorite_food" -> FavoriteFood
                "favorite_toy" -> FavoriteToy
                "favorite_school_subject" -> FavoriteSchoolSubject
                "favorite_activity" -> FavoriteActivity
                "friend_name" -> FriendName
                "hobby" -> Hobby
                else -> Custom("Custom", predicate)
            }
        }

        fun fromString(name: String): FactType = when (name) {
            "PetName" -> PetName
            "FavoriteColor" -> FavoriteColor
            "FavoriteFood" -> FavoriteFood
            "FavoriteToy" -> FavoriteToy
            "FavoriteSchoolSubject" -> FavoriteSchoolSubject
            "FavoriteActivity" -> FavoriteActivity
            "FriendName" -> FriendName
            "Hobby" -> Hobby
            else -> Custom(name, "")
        }

        fun getPredefinedTypes(): List<FactType> = listOf(
            PetName,
            FavoriteColor,
            FavoriteFood,
            FavoriteToy,
            FavoriteSchoolSubject,
            FavoriteActivity,
            FriendName,
            Hobby
        )
    }

    fun toStorageString(): String = when (this) {
        is PetName -> "PetName"
        is FavoriteColor -> "FavoriteColor"
        is FavoriteFood -> "FavoriteFood"
        is FavoriteToy -> "FavoriteToy"
        is FavoriteSchoolSubject -> "FavoriteSchoolSubject"
        is FavoriteActivity -> "FavoriteActivity"
        is FriendName -> "FriendName"
        is Hobby -> "Hobby"
        is Custom -> customName
    }
}

