package com.sosmartlabs.momo.db

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import com.sosmartlabs.momo.pushnotifications.model.NotificationMessage
import com.sosmartlabs.momo.pushnotifications.model.NotificationMessageDao


/**
 * @author mrg
 * @date 11/13/17
 */


@Database(entities = [ContactRequest::class, NotificationMessage::class], version = 2)
abstract class MomoDatabase : RoomDatabase() {
    abstract fun contactRequestModel(): ContactRequestDao
    abstract fun notificationMessageModel(): NotificationMessageDao

    companion object {
        private var INSTANCE: MomoDatabase? = null
        private val MIGRATION_1_2: Migration = object : Migration(1, 2) {
            override fun migrate(database: SupportSQLiteDatabase) {
                database.execSQL("CREATE TABLE IF NOT EXISTS `NotificationMessage` (`id` INTEGER NOT NULL, `text` TEXT NOT NULL, `sender` TEXT NOT NULL, `type` INTEGER NOT NULL, `timestamp` INTEGER NOT NULL, PRIMARY KEY(`id`))")
            }
        }
        fun getDatabase(context: Context): MomoDatabase {
            if (INSTANCE == null) {
                INSTANCE = Room.databaseBuilder(context.applicationContext, MomoDatabase::class.java, "momo_db")
                        .addMigrations(MIGRATION_1_2)
                        .build()
            }
            return INSTANCE!!
        }
    }


}