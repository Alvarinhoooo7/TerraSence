package com.sosmartlabs.momotabletpadres

class GlobalConstants {

    companion object{

        /**
         * Workers TAGS
         */
        const val CHECK_UPDATES_WORKER_TAG = "CHECK_UPDATES_WORKER"
        const val DOWNLOAD_USER_DATA_WORKER_TAG = "DOWNLOAD_USER_DATA_WORKER"
        const val DOWNLOAD_TABLET_DATA_WORKER_TAG = "DOWNLOAD_TABLET_DATA_WORKER_TAG"


        /**
         * User Data Directory(Internal memory)
         */
        const val USERS_DATA_DIR = "momo_data"


        /**
         * Tablet Object Extra ID(Intent communication stuff Worker)
         */
        const val TABLET_OBJECT_ID_EXTRA = "TABLET_OBJECT_ID_EXTRA"
        const val PACKAGE_NAME_EXTRA = "TABLET_OBJECT_ID_EXTRA"

        /**
         * Parse Instructions args
         */
        const val INSTALLED_APP_PACKAGE_NAME_ARG = "INSTALLED_APP_PACKAGE_NAME_ARG"


        /**
         * local updates db(Tiny Db)
         */
        const val LOCAL_UPDATES_DB_TAG = "local_updates_db_tag"

    }

}