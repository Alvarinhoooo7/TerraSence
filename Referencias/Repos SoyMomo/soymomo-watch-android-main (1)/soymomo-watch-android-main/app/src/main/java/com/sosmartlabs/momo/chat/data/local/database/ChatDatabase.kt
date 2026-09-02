package com.sosmartlabs.momo.chat.data.local.database

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import com.sosmartlabs.momo.chat.data.local.entity.*
import com.sosmartlabs.momo.chat.data.local.dao.ChatDao
import com.sosmartlabs.momo.chat.data.local.dao.ChatLastViewedDao
import com.sosmartlabs.momo.chat.data.local.dao.GroupDao
import com.sosmartlabs.momo.chat.data.local.dao.GroupMessageDao
import com.sosmartlabs.momo.utils.Constants
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import timber.log.Timber

/**
 * The Room database for chat and group messages
 */
@Database(
    entities = [
        ChatEntity::class,
        GroupEntity::class,
        GroupMessageEntity::class,
        ChatLastViewedEntity::class
    ],
    version = 13,
    exportSchema = false
)
abstract class ChatDatabase : RoomDatabase() {

    abstract fun chatDao(): ChatDao
    abstract fun chatLastViewedDao(): ChatLastViewedDao
    abstract fun groupDao(): GroupDao
    abstract fun groupMessageDao(): GroupMessageDao

    companion object {
        @Volatile
        private var instance: ChatDatabase? = null

        private val MIGRATION_4_5 = object : Migration(4, 5) {
            override fun migrate(db: SupportSQLiteDatabase) {
                Timber.i("ChatDatabase: MIGRATION_4_5 - Starting migration from version 4 to 5")
                try {
                    db.execSQL(
                        "ALTER TABLE ChatEntity ADD COLUMN is_isolated_audio INTEGER DEFAULT NULL"
                    )
                    Timber.i("ChatDatabase: MIGRATION_4_5 - Successfully added is_isolated_audio column")
                } catch (e: Exception) {
                    Timber.e(e, "ChatDatabase: MIGRATION_4_5 - Error during migration")
                    CrashlyticsLog.recordNonFatalError(e, "ChatDatabase: Error during MIGRATION_4_5")
                    throw e
                }
            }
        }

        private val MIGRATION_5_6 = object : Migration(5, 6) {
            override fun migrate(db: SupportSQLiteDatabase) {
                Timber.i("ChatDatabase: MIGRATION_5_6 - Starting migration from version 5 to 6")
                try {
                    // Create GroupEntity table
                    db.execSQL(
                        """CREATE TABLE IF NOT EXISTS GroupEntity (
                            id TEXT NOT NULL PRIMARY KEY,
                            name TEXT NOT NULL,
                            avatar TEXT,
                            description TEXT,
                            owner_id TEXT NOT NULL,
                            last_message_text TEXT,
                            last_message_time INTEGER NOT NULL,
                            unread_count INTEGER NOT NULL,
                            member_count INTEGER NOT NULL
                        )"""
                    )
                    Timber.i("ChatDatabase: MIGRATION_5_6 - Created GroupEntity table")

                    // Create GroupMessageEntity table
                    db.execSQL(
                        """CREATE TABLE IF NOT EXISTS GroupMessageEntity (
                            id TEXT NOT NULL PRIMARY KEY,
                            group_id TEXT NOT NULL,
                            created_at INTEGER NOT NULL,
                            sender TEXT NOT NULL,
                            sender_id TEXT NOT NULL,
                            sender_name TEXT NOT NULL,
                            type TEXT NOT NULL,
                            text TEXT,
                            audio TEXT,
                            audio_duration INTEGER,
                            image TEXT,
                            video TEXT,
                            status TEXT NOT NULL,
                            ulid TEXT
                        )"""
                    )
                    Timber.i("ChatDatabase: MIGRATION_5_6 - Created GroupMessageEntity table")

                    Timber.i("ChatDatabase: MIGRATION_5_6 - Migration completed successfully")
                } catch (e: Exception) {
                    Timber.e(e, "ChatDatabase: MIGRATION_5_6 - Error during migration")
                    CrashlyticsLog.recordNonFatalError(e, "ChatDatabase: Error during MIGRATION_5_6")
                    throw e
                }
            }
        }

        private val MIGRATION_6_7 = object : Migration(6, 7) {
            override fun migrate(db: SupportSQLiteDatabase) {
                Timber.i("ChatDatabase: MIGRATION_6_7 - Starting migration from version 6 to 7")
                try {
                    // Create ChatLastViewed table
                    db.execSQL(
                        """CREATE TABLE IF NOT EXISTS ChatLastViewed (
                            chat_id TEXT NOT NULL PRIMARY KEY,
                            last_viewed_at INTEGER NOT NULL,
                            is_group INTEGER NOT NULL
                        )"""
                    )
                    Timber.i("ChatDatabase: MIGRATION_6_7 - Created ChatLastViewed table")

                    Timber.i("ChatDatabase: MIGRATION_6_7 - Migration completed successfully")
                } catch (e: Exception) {
                    Timber.e(e, "ChatDatabase: MIGRATION_6_7 - Error during migration")
                    CrashlyticsLog.recordNonFatalError(e, "ChatDatabase: Error during MIGRATION_6_7")
                    throw e
                }
            }
        }

        private val MIGRATION_7_8 = object : Migration(7, 8) {
            override fun migrate(db: SupportSQLiteDatabase) {
                Timber.i("ChatDatabase: MIGRATION_7_8 - Starting migration from version 7 to 8")
                try {
                    // Add last_message_type column to GroupEntity table
                    db.execSQL(
                        "ALTER TABLE GroupEntity ADD COLUMN last_message_type TEXT"
                    )
                    Timber.i("ChatDatabase: MIGRATION_7_8 - Added last_message_type column to GroupEntity")

                    Timber.i("ChatDatabase: MIGRATION_7_8 - Migration completed successfully")
                } catch (e: Exception) {
                    Timber.e(e, "ChatDatabase: MIGRATION_7_8 - Error during migration")
                    CrashlyticsLog.recordNonFatalError(e, "ChatDatabase: Error during MIGRATION_7_8")
                    throw e
                }
            }
        }

        private val MIGRATION_8_9 = object : Migration(8, 9) {
            override fun migrate(db: SupportSQLiteDatabase) {
                Timber.i("ChatDatabase: MIGRATION_8_9 - Starting migration from version 8 to 9")
                // No schema changes in v9; keep migration explicit to avoid destructive fallback on upgrade.
                Timber.i("ChatDatabase: MIGRATION_8_9 - No-op migration completed")
            }
        }

        private val MIGRATION_9_10 = object : Migration(9, 10) {
            override fun migrate(db: SupportSQLiteDatabase) {
                Timber.i("ChatDatabase: MIGRATION_9_10 - Starting migration from version 9 to 10")
                try {
                    db.execSQL("ALTER TABLE GroupMessageEntity ADD COLUMN sender_avatar TEXT")
                    Timber.i("ChatDatabase: MIGRATION_9_10 - Added sender_avatar column to GroupMessageEntity")
                } catch (e: Exception) {
                    Timber.e(e, "ChatDatabase: MIGRATION_9_10 - Error during migration")
                    CrashlyticsLog.recordNonFatalError(e, "ChatDatabase: Error during MIGRATION_9_10")
                    throw e
                }
            }
        }

        private val MIGRATION_10_11 = object : Migration(10, 11) {
            override fun migrate(db: SupportSQLiteDatabase) {
                Timber.i("ChatDatabase: MIGRATION_10_11 - Starting migration from version 10 to 11")
                try {
                    db.execSQL("ALTER TABLE GroupEntity ADD COLUMN last_message_sender_id TEXT")
                    db.execSQL("ALTER TABLE GroupEntity ADD COLUMN last_message_sender_name TEXT")
                    Timber.i("ChatDatabase: MIGRATION_10_11 - Added sender summary columns to GroupEntity")
                } catch (e: Exception) {
                    Timber.e(e, "ChatDatabase: MIGRATION_10_11 - Error during migration")
                    CrashlyticsLog.recordNonFatalError(e, "ChatDatabase: Error during MIGRATION_10_11")
                    throw e
                }
            }
        }

        private val MIGRATION_11_12 = object : Migration(11, 12) {
            override fun migrate(db: SupportSQLiteDatabase) {
                Timber.i("ChatDatabase: MIGRATION_11_12 - Starting migration from version 11 to 12")
                try {
                    db.execSQL("ALTER TABLE ChatEntity ADD COLUMN audio_waveform TEXT DEFAULT NULL")
                    db.execSQL("ALTER TABLE GroupMessageEntity ADD COLUMN audio_waveform TEXT DEFAULT NULL")
                    Timber.i("ChatDatabase: MIGRATION_11_12 - Added audio_waveform column to ChatEntity and GroupMessageEntity")
                } catch (e: Exception) {
                    Timber.e(e, "ChatDatabase: MIGRATION_11_12 - Error during migration")
                    CrashlyticsLog.recordNonFatalError(e, "ChatDatabase: Error during MIGRATION_11_12")
                    throw e
                }
            }
        }

        private val MIGRATION_12_13 = object : Migration(12, 13) {
            override fun migrate(db: SupportSQLiteDatabase) {
                Timber.i("ChatDatabase: MIGRATION_12_13 - Starting migration from version 12 to 13")
                try {
                    db.execSQL(
                        """CREATE TABLE IF NOT EXISTS GroupMessageEntity_new (
                            id TEXT NOT NULL PRIMARY KEY,
                            remote_id TEXT,
                            group_id TEXT NOT NULL,
                            created_at INTEGER NOT NULL,
                            sender TEXT NOT NULL,
                            sender_id TEXT NOT NULL,
                            sender_name TEXT NOT NULL,
                            sender_avatar TEXT,
                            type TEXT NOT NULL,
                            text TEXT,
                            audio TEXT,
                            audio_duration INTEGER,
                            image TEXT,
                            video TEXT,
                            status TEXT NOT NULL,
                            ulid TEXT,
                            audio_waveform TEXT DEFAULT NULL
                        )"""
                    )

                    db.execSQL(
                        """INSERT OR REPLACE INTO GroupMessageEntity_new (
                            id,
                            remote_id,
                            group_id,
                            created_at,
                            sender,
                            sender_id,
                            sender_name,
                            sender_avatar,
                            type,
                            text,
                            audio,
                            audio_duration,
                            image,
                            video,
                            status,
                            ulid,
                            audio_waveform
                        )
	                        SELECT
	                            CASE
	                                WHEN ulid IS NOT NULL AND TRIM(ulid) != '' THEN ulid
	                                ELSE id
	                            END AS id,
                            id AS remote_id,
                            group_id,
                            created_at,
                            sender,
                            sender_id,
                            sender_name,
                            sender_avatar,
                            type,
                            text,
                            audio,
                            audio_duration,
                            image,
                            video,
	                            status,
	                            CASE
	                                WHEN ulid IS NOT NULL AND TRIM(ulid) != '' THEN ulid
	                                ELSE NULL
	                            END AS ulid,
	                            audio_waveform
	                        FROM GroupMessageEntity
                        ORDER BY
                            CASE status
                                WHEN 'error' THEN 0
                                WHEN 'sending' THEN 1
                                WHEN 'sent' THEN 2
                                WHEN 'received' THEN 3
                                ELSE 0
                            END ASC,
                            created_at ASC"""
                    )

                    db.execSQL("DROP TABLE GroupMessageEntity")
                    db.execSQL("ALTER TABLE GroupMessageEntity_new RENAME TO GroupMessageEntity")
                    db.execSQL(
                        "CREATE UNIQUE INDEX IF NOT EXISTS index_GroupMessageEntity_ulid ON GroupMessageEntity(ulid)"
                    )
                    db.execSQL(
                        "CREATE INDEX IF NOT EXISTS index_GroupMessageEntity_remote_id ON GroupMessageEntity(remote_id)"
                    )
                    Timber.i("ChatDatabase: MIGRATION_12_13 - Migration completed successfully")
                } catch (e: Exception) {
                    Timber.e(e, "ChatDatabase: MIGRATION_12_13 - Error during migration")
                    CrashlyticsLog.recordNonFatalError(e, "ChatDatabase: Error during MIGRATION_12_13")
                    throw e
                }
            }
        }

        fun getInstance(context: Context): ChatDatabase {
            Timber.v("ChatDatabase: getInstance() - Attempting to get database instance")
            return instance ?: synchronized(this) {
                instance?.let {
                    Timber.d("ChatDatabase: getInstance() - Returning existing instance")
                    return it
                }
                Timber.i("ChatDatabase: getInstance() - No instance found, building new database")
                val db = buildDatabase(context)
                instance = db
                Timber.i("ChatDatabase: getInstance() - Database instance created")
                db
            }
        }

        private fun buildDatabase(context: Context): ChatDatabase {
            Timber.i("ChatDatabase: buildDatabase() - Building Room database with name: ${Constants.CHAT_DB_NAME}")
            return try {
                Room.databaseBuilder(context, ChatDatabase::class.java, Constants.CHAT_DB_NAME)
                    .addMigrations(
                        MIGRATION_4_5,
                        MIGRATION_5_6,
                        MIGRATION_6_7,
                        MIGRATION_7_8,
                        MIGRATION_8_9,
                        MIGRATION_9_10,
                        MIGRATION_10_11,
                        MIGRATION_11_12,
                        MIGRATION_12_13
                    )
                    .fallbackToDestructiveMigrationFrom(1, 2, 3)
                    .build().also {
                        Timber.i("ChatDatabase: buildDatabase() - Database built successfully")
                    }
            } catch (e: Exception) {
                Timber.e(e, "ChatDatabase: buildDatabase() - Failed to build database")
                CrashlyticsLog.recordNonFatalError(e, "ChatDatabase: Failed to build Room database")
                throw e
            }
        }
    }
}
