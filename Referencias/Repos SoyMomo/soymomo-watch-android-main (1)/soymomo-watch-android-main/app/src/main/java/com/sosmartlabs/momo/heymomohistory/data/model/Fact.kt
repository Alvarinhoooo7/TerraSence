package com.sosmartlabs.momo.heymomohistory.data.model

import android.content.Context
import java.io.Serializable

data class Fact(
    val id: String? = null,
    val subject: String = "child",
    val predicate: String,
    val objectValue: String,
    val factType: FactType,
    val createdAt: String? = null,
    val updatedAt: String? = null,
    val confidence: Double? = null,
    val evidence: String? = null
) : Serializable {
    companion object {
        fun fromMap(map: Map<String, Any>, context: Context): Fact {
            val predicateStr = map["predicate"] as? String ?: ""
            val factType = FactType.fromPredicate(predicateStr, context)

            return Fact(
                id = map["id"] as? String,
                subject = map["subject"] as? String ?: "child",
                predicate = predicateStr,
                objectValue = map["object"] as? String ?: "",
                factType = factType,
                createdAt = map["createdAt"] as? String,
                updatedAt = map["updatedAt"] as? String,
                confidence = (map["confidence"] as? Number)?.toDouble(),
                evidence = map["evidence"] as? String
            )
        }
    }

    fun toMap(context: Context): Map<String, Any> {
        return mapOf(
            "subject" to subject,
            "predicate" to factType.getPredicate(context),
            "object" to objectValue,
            "confidence" to (confidence ?: 1.0),
            "evidence" to (evidence ?: "")
        ).let { baseMap ->
            if (id != null) baseMap + ("id" to id) else baseMap
        }
    }
}

