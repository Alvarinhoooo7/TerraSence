package com.sosmartlabs.momo.sharedprefs

import android.content.Context
import android.content.SharedPreferences
import android.content.SharedPreferences.OnSharedPreferenceChangeListener
import android.graphics.Bitmap
import android.graphics.Bitmap.CompressFormat
import android.graphics.BitmapFactory
import android.os.Environment
import android.os.Parcel
import android.text.TextUtils
import android.util.Base64
import com.google.firebase.crashlytics.crashlytics
import com.google.firebase.Firebase
import com.google.gson.Gson
import com.google.gson.GsonBuilder
import com.parse.ParseObject
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.models.WearerTypeAdapter
import dagger.hilt.android.qualifiers.ApplicationContext
import timber.log.Timber
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.util.*
import java.util.concurrent.TimeUnit
import javax.inject.Inject

class SharedPrefs @Inject constructor (@ApplicationContext appContext: Context?) {
    companion object {
        private const val IS_IMPERIAL_SYSTEM = "imperial"

        private const val PENDING_INVITATION_DEVICE_ID = "pending_invitation_device_id"
        private const val PENDING_INVITATION_TIMESTAMP = "pending_invitation_timestamp"

        /**
         * A parked invitation id only has to bridge a single deep-link tap through
         * the auth/login dance to MainActivity. Expire it after this window so a
         * link tapped and then abandoned can't silently reopen the add-watch flow
         * in an unrelated later session.
         */
        private val PENDING_INVITATION_TTL_MS = TimeUnit.HOURS.toMillis(1)
    }

    private var DEFAULT_APP_IMAGEDATA_DIRECTORY = "images"
    private var lastImagePath = ""
    private val preferences: SharedPreferences = appContext!!.getSharedPreferences(appContext.packageName, Context.MODE_PRIVATE)
    /**
     * Returns a measurement according to the measurement system being used
     */
    var isImperialSystem: Boolean
        get() {
            return getBoolean(IS_IMPERIAL_SYSTEM)
        }
        set(value) {
           putBoolean(IS_IMPERIAL_SYSTEM, value)
        }

    /**
     * Parks the watch deviceId parsed from an incoming watch-invitation deep link
     * (soymomo-watch://link/<id> or https://soymomo.com/link/watch/<id>) so it
     * survives DispatchActivity's auth-routing, the login flow when the user is
     * signed out, and process recreation until MainActivity drains it on resume.
     * Passing null/blank clears any parked id.
     */
    fun setPendingInvitationDeviceId(deviceId: String?) {
        if (deviceId.isNullOrBlank()) {
            preferences.edit()
                .remove(PENDING_INVITATION_DEVICE_ID)
                .remove(PENDING_INVITATION_TIMESTAMP)
                .apply()
            return
        }
        preferences.edit()
            .putString(PENDING_INVITATION_DEVICE_ID, deviceId)
            .putLong(PENDING_INVITATION_TIMESTAMP, System.currentTimeMillis())
            .apply()
    }

    /**
     * Reads and clears the parked invitation deviceId. Returns null if nothing was
     * parked, or if the parked id is older than [PENDING_INVITATION_TTL_MS] (a
     * stale link left over from an abandoned earlier session). Always clears the
     * stored value so a single deep-link tap only ever fires the receiver flow once.
     */
    fun consumePendingInvitationDeviceId(): String? {
        val id = preferences.getString(PENDING_INVITATION_DEVICE_ID, null) ?: return null
        val parkedAt = preferences.getLong(PENDING_INVITATION_TIMESTAMP, 0L)
        preferences.edit()
            .remove(PENDING_INVITATION_DEVICE_ID)
            .remove(PENDING_INVITATION_TIMESTAMP)
            .apply()
        val age = System.currentTimeMillis() - parkedAt
        if (age < 0 || age > PENDING_INVITATION_TTL_MS) {
            Timber.i("SharedPrefs: Dropping stale pending invitation id (age=${age}ms)")
            return null
        }
        return id
    }

    /**
     * Decodes the Bitmap from 'path' and returns it
     * @param path image path
     * @return the Bitmap from 'path'
     */
    fun getImage(path: String?): Bitmap? {
        var bitmapFromPath: Bitmap? = null
        try {
            bitmapFromPath = BitmapFactory.decodeFile(path)
        } catch (e: Exception) {
            with(Firebase.crashlytics) {
                log("Error obtaining image from SharedPReferences")
                recordException(e)
            }
            e.printStackTrace()
        }
        return bitmapFromPath
    }

    fun putWearer(wearer: Wearer?) {
        if (wearer != null) {
            val wearerJson = Gson().toJson(wearer)
            putString("wearer", wearerJson)
        }
    }

    fun <T: ParseObject> putParseObject(key: String, parseObject: ParseObject) {
        val parcel = Parcel.obtain()
        (parseObject as T).writeToParcel(parcel, 0)
        val bytes = parcel.marshall()
        parcel.recycle()
        val stringObject = Base64.encodeToString(bytes, 0)
        putString(key, stringObject)
    }

    fun <T: ParseObject> getParseObject(key: String): T? {
        val parcelData = getString(key)
        if (TextUtils.isEmpty(parcelData)) {
            return null
        }

        val newParcel = base64ToParcelable(parcelData!!)
        return ParseObject.CREATOR.createFromParcel(newParcel) as T

    }
    private fun base64ToParcelable(base64: String): Parcel {
        val bytes = Base64.decode(base64, Base64.DEFAULT)
        val parcel = Parcel.obtain()
        parcel.unmarshall(bytes, 0, bytes.size)
        parcel.setDataPosition(0)
        return parcel
    }

    fun getSavedWearer(): Wearer? {
        val gson = GsonBuilder()
            .registerTypeAdapter(Wearer::class.java, WearerTypeAdapter())
            .create()
        val wearerJson = getString("wearer")
        Timber.d("wearerJson: $wearerJson")
        return if (wearerJson != "") {
            gson.fromJson(wearerJson, Wearer::class.java)
        } else {
            null
        }
    }


    /**
     * Returns the String path of the last saved image
     * @return string path of the last saved image
     */
    fun getSavedImagePath(): String? {
        return lastImagePath
    }


    /**
     * Saves 'theBitmap' into folder 'theFolder' with the name 'theImageName'
     * @param theFolder the folder path dir you want to save it to e.g "DropBox/WorkImages"
     * @param theImageName the name you want to assign to the image file e.g "MeAtLunch.png"
     * @param theBitmap the image you want to save as a Bitmap
     * @return returns the full path(file system address) of the saved image
     */
    fun putImage(theFolder: String?, theImageName: String?, theBitmap: Bitmap?): String? {
        if (theFolder == null || theImageName == null || theBitmap == null) return null
        DEFAULT_APP_IMAGEDATA_DIRECTORY = theFolder
        val mFullPath = setupFullPath(theImageName)
        if (mFullPath != "") {
            lastImagePath = mFullPath
            saveBitmap(mFullPath, theBitmap)
        }
        return mFullPath
    }


    /**
     * Saves 'theBitmap' into 'fullPath'
     * @param fullPath full path of the image file e.g. "Images/MeAtLunch.png"
     * @param theBitmap the image you want to save as a Bitmap
     * @return true if image was saved, false otherwise
     */
    fun putImageWithFullPath(fullPath: String?, theBitmap: Bitmap?): Boolean {
        return !(fullPath == null || theBitmap == null) && saveBitmap(fullPath, theBitmap)
    }

    /**
     * Creates the path for the image with name 'imageName' in DEFAULT_APP.. directory
     * @param imageName name of the image
     * @return the full path of the image. If it failed to create directory, return empty string
     */
    private fun setupFullPath(imageName: String): String {
        val mFolder = File(Environment.getExternalStorageDirectory(), DEFAULT_APP_IMAGEDATA_DIRECTORY)
        if (isExternalStorageReadable() && isExternalStorageWritable() && !mFolder.exists()) {
            if (!mFolder.mkdirs()) {
                Timber.e("Failed to setup folder")
                return ""
            }
        }
        return mFolder.path + '/' + imageName
    }

    /**
     * Saves the Bitmap as a PNG file at path 'fullPath'
     * @param fullPath path of the image file
     * @param bitmap the image as a Bitmap
     * @return true if it successfully saved, false otherwise
     */
    private fun saveBitmap(fullPath: String?, bitmap: Bitmap?): Boolean {
        if (fullPath == null || bitmap == null) return false
        var fileCreated = false
        var bitmapCompressed = false
        var streamClosed = false
        val imageFile = File(fullPath)
        if (imageFile.exists()) if (!imageFile.delete()) return false
        try {
            fileCreated = imageFile.createNewFile()
        } catch (e: IOException) {
            e.printStackTrace()
            with(Firebase.crashlytics) {
                log("Error saving bitmap in SharedPrefs creating new file")
                recordException(e)
            }
        }
        var out: FileOutputStream? = null
        try {
            out = FileOutputStream(imageFile)
            bitmapCompressed = bitmap.compress(CompressFormat.PNG, 100, out)
        } catch (e: Exception) {
            e.printStackTrace()
            with(Firebase.crashlytics) {
                log("Error saving bitmap in SharedPrefs on compressing bitmap")
                recordException(e)
            }
            bitmapCompressed = false
        } finally {
            if (out != null) {
                try {
                    out.flush()
                    out.close()
                    streamClosed = true
                } catch (e: IOException) {
                    with(Firebase.crashlytics) {
                        log("Error saving bitmap in SharedPrefs on closing stream")
                        recordException(e)
                    }
                    e.printStackTrace()
                    streamClosed = false
                }
            }
        }
        return fileCreated && bitmapCompressed && streamClosed
    }


    // Getters
    /**
     * Get int value from SharedPreferences at 'key'. If key not found, return 'defaultValue'
     * @param key SharedPreferences key
     * @param defaultValue int value returned if key was not found
     * @return int value at 'key' or 'defaultValue' if key not found
     */
    fun getInt(key: String?): Int {
        return preferences.getInt(key, 0)
    }

    /**
     * Get parsed ArrayList of Integers from SharedPreferences at 'key'
     * @param key SharedPreferences key
     * @return ArrayList of Integers
     */
    fun getListInt(key: String?): ArrayList<Int> {
        val myList =
            TextUtils.split(preferences.getString(key, ""), "‚‗‚")
        val arrayToList =
            ArrayList(listOf(*myList))
        val newList = ArrayList<Int>()
        for (item in arrayToList) newList.add(item.toInt())
        return newList
    }

    /**
     * Get long value from SharedPreferences at 'key'. If key not found, return 'defaultValue'
     * @param key SharedPreferences key
     * @param defaultValue long value returned if key was not found
     * @return long value at 'key' or 'defaultValue' if key not found
     */
    fun getLong(key: String?, defaultValue: Long): Long {
        return preferences.getLong(key, defaultValue)
    }

    /**
     * Get float value from SharedPreferences at 'key'. If key not found, return 'defaultValue'
     * @param key SharedPreferences key
     * @param defaultValue float value returned if key was not found
     * @return float value at 'key' or 'defaultValue' if key not found
     */
    fun getFloat(key: String?): Float {
        return preferences.getFloat(key, 0f)
    }

    /**
     * Get double value from SharedPreferences at 'key'. If exception thrown, return 'defaultValue'
     * @param key SharedPreferences key
     * @param defaultValue double value returned if exception is thrown
     * @return double value at 'key' or 'defaultValue' if exception is thrown
     */
    fun getDouble(key: String?, defaultValue: Double): Double {
        val number = getString(key)
        return try {
            number!!.toDouble()
        } catch (e: NumberFormatException) {
            with(Firebase.crashlytics) {
                log("Error on getting double from SharedPrefs")
                recordException(e)
            }
            defaultValue
        }
    }

    /**
     * Get parsed ArrayList of Double from SharedPreferences at 'key'
     * @param key SharedPreferences key
     * @return ArrayList of Double
     */
    fun getListDouble(key: String?): ArrayList<Double> {
        val myList =
            TextUtils.split(preferences.getString(key, ""), "‚‗‚")
        val arrayToList =
            ArrayList(Arrays.asList(*myList))
        val newList = ArrayList<Double>()
        for (item in arrayToList) newList.add(item.toDouble())
        return newList
    }

    /**
     * Get parsed ArrayList of Integers from SharedPreferences at 'key'
     * @param key SharedPreferences key
     * @return ArrayList of Longs
     */
    fun getListLong(key: String?): ArrayList<Long> {
        val myList =
            TextUtils.split(preferences.getString(key, ""), "‚‗‚")
        val arrayToList =
            ArrayList(Arrays.asList(*myList))
        val newList = ArrayList<Long>()
        for (item in arrayToList) newList.add(item.toLong())
        return newList
    }

    /**
     * Get String value from SharedPreferences at 'key'. If key not found, return ""
     * @param key SharedPreferences key
     * @return String value at 'key' or "" (empty String) if key not found
     */
    fun getString(key: String?): String? {
        return preferences.getString(key, "")
    }

    /**
     * Get parsed ArrayList of String from SharedPreferences at 'key'
     * @param key SharedPreferences key
     * @return ArrayList of String
     */
    fun getListString(key: String?): ArrayList<String> {
        return ArrayList(
            Arrays.asList(
                *TextUtils.split(
                    preferences.getString(key, ""),
                    "‚‗‚"
                )
            )
        )
    }

    /**
     * Get boolean value from SharedPreferences at 'key'. If key not found, return 'defaultValue'
     * @param key SharedPreferences key
     * @param defaultValue boolean value returned if key was not found
     * @return boolean value at 'key' or 'defaultValue' if key not found
     */
    fun getBoolean(key: String?): Boolean {
        return preferences.getBoolean(key, false)
    }

    /**
     * Get parsed ArrayList of Boolean from SharedPreferences at 'key'
     * @param key SharedPreferences key
     * @return ArrayList of Boolean
     */
    fun getListBoolean(key: String?): ArrayList<Boolean> {
        val myList = getListString(key)
        val newList = ArrayList<Boolean>()
        for (item in myList) {
            if (item == "true") {
                newList.add(true)
            } else {
                newList.add(false)
            }
        }
        return newList
    }

    fun getListObject(key: String?, mClass: Class<Any>): ArrayList<Any> {
        val gson = Gson()
        val objString = getListString(key)
        val objects = arrayListOf<Any>()

        for (jObjString in objString) {
            val value = gson.fromJson<Any>(jObjString, mClass)
            objects.add(value)
        }
        return objects
    }

    fun getObject(key: String?, mClass: Class<Any>): Any {
        val gson = Gson()
        val objString = getString(key)
        return gson.fromJson(objString, mClass)
    }

    // Put methods
    /**
     * Put int value into SharedPreferences with 'key' and save
     * @param key SharedPreferences key
     * @param value int value to be added
     */
    fun putInt(key: String?, value: Int) {
        checkForNullKey(key)
        preferences.edit().putInt(key, value).apply()
    }

    /**
     * Put ArrayList of Integer into SharedPreferences with 'key' and save
     * @param key SharedPreferences key
     * @param intList ArrayList of Integer to be added
     */
    fun putListInt(key: String?, intList: ArrayList<Int>) {
        checkForNullKey(key)
        val myIntList = intList.toTypedArray()
        preferences.edit().putString(key, TextUtils.join("‚‗‚", myIntList)).apply()
    }

    /**
     * Put long value into SharedPreferences with 'key' and save
     * @param key SharedPreferences key
     * @param value long value to be added
     */
    fun putLong(key: String?, value: Long) {
        checkForNullKey(key)
        preferences.edit().putLong(key, value).apply()
    }

    /**
     * Put ArrayList of Long into SharedPreferences with 'key' and save
     * @param key SharedPreferences key
     * @param longList ArrayList of Long to be added
     */
    fun putListLong(key: String?, longList: ArrayList<Long>) {
        checkForNullKey(key)
        val myLongList = longList.toTypedArray()
        preferences.edit().putString(key, TextUtils.join("‚‗‚", myLongList)).apply()
    }

    /**
     * Put float value into SharedPreferences with 'key' and save
     * @param key SharedPreferences key
     * @param value float value to be added
     */
    fun putFloat(key: String?, value: Float) {
        checkForNullKey(key)
        preferences.edit().putFloat(key, value).apply()
    }

    /**
     * Put double value into SharedPreferences with 'key' and save
     * @param key SharedPreferences key
     * @param value double value to be added
     */
    fun putDouble(key: String?, value: Double) {
        checkForNullKey(key)
        putString(key, value.toString())
    }

    /**
     * Put ArrayList of Double into SharedPreferences with 'key' and save
     * @param key SharedPreferences key
     * @param doubleList ArrayList of Double to be added
     */
    fun putListDouble(key: String?, doubleList: ArrayList<Double>) {
        checkForNullKey(key)
        val myDoubleList = doubleList.toTypedArray()
        preferences.edit().putString(key, TextUtils.join("‚‗‚", myDoubleList)).apply()
    }

    /**
     * Put String value into SharedPreferences with 'key' and save
     * @param key SharedPreferences key
     * @param value String value to be added
     */
    fun putString(key: String?, value: String?) {
        checkForNullKey(key)
        checkForNullValue(value)
        preferences.edit().putString(key, value).apply()
    }

    /**
     * Put ArrayList of String into SharedPreferences with 'key' and save
     * @param key SharedPreferences key
     * @param stringList ArrayList of String to be added
     */
    fun putListString(key: String?, stringList: ArrayList<String>) {
        checkForNullKey(key)
        val myStringList = stringList.toTypedArray()
        preferences.edit().putString(key, TextUtils.join("‚‗‚", myStringList)).apply()
    }

    /**
     * Put boolean value into SharedPreferences with 'key' and save
     * @param key SharedPreferences key
     * @param value boolean value to be added
     */
    fun putBoolean(key: String?, value: Boolean) {
        checkForNullKey(key)
        preferences.edit().putBoolean(key, value).apply()
    }

    /**
     * Put ArrayList of Boolean into SharedPreferences with 'key' and save
     * @param key SharedPreferences key
     * @param boolList ArrayList of Boolean to be added
     */
    fun putListBoolean(key: String?, boolList: ArrayList<Boolean>) {
        checkForNullKey(key)
        val newList = ArrayList<String>()
        for (item in boolList) {
            if (item) {
                newList.add("true")
            } else {
                newList.add("false")
            }
        }
        putListString(key, newList)
    }

    /**
     * Put ObJect any type into SharedPrefrences with 'key' and save
     * @param key SharedPreferences key
     * @param obj is the Object you want to put
     */
    fun putObject(key: String, obj: Any){
        checkForNullKey(key)
        val gson = Gson()
        putString(key, gson.toJson(obj))
    }

    fun putListObject(key: String, objArray: ArrayList<out Any>){
        checkForNullKey(key)
        val gson = Gson()
        val objStrings = arrayListOf<String>()
        for (obj in objArray) {
            objStrings.add(gson.toJson(obj))
        }
        putListString(key, objStrings)
    }

    /**
     * Remove SharedPreferences item with 'key'
     * @param key SharedPreferences key
     */
    fun remove(key: String?) {
        preferences.edit().remove(key).apply()
    }

    /**
     * Delete image file at 'path'
     * @param path path of image file
     * @return true if it successfully deleted, false otherwise
     */
    fun deleteImage(path: String): Boolean {
        return File(path).delete()
    }

    /**
     * Clear SharedPreferences (remove everything)
     */
    fun clear() {
        preferences.edit().clear().apply()
    }

    /**
     * Retrieve all values from SharedPreferences. Do not modify collection return by method
     * @return a Map representing a list of key/value pairs from SharedPreferences
     */
    val all: Map<String, *> get() = preferences.all

    /**
     * Register SharedPreferences change listener
     * @param listener listener object of OnSharedPreferenceChangeListener
     */
    fun registerOnSharedPreferenceChangeListener(listener: OnSharedPreferenceChangeListener?) {
        preferences.registerOnSharedPreferenceChangeListener(listener)
    }

    /**
     * Unregister SharedPreferences change listener
     * @param listener listener object of OnSharedPreferenceChangeListener to be unregistered
     */
    fun unregisterOnSharedPreferenceChangeListener(listener: OnSharedPreferenceChangeListener?) {
        preferences.unregisterOnSharedPreferenceChangeListener(listener)
    }

    /**
     * Check if external storage is writable or not
     * @return true if writable, false otherwise
     */
    fun isExternalStorageWritable(): Boolean {
        return Environment.MEDIA_MOUNTED == Environment.getExternalStorageState()
    }

    /**
     * Check if external storage is readable or not
     * @return true if readable, false otherwise
     */
    fun isExternalStorageReadable(): Boolean {
        val state: String = Environment.getExternalStorageState()
        return Environment.MEDIA_MOUNTED == state || Environment.MEDIA_MOUNTED_READ_ONLY == state
    }

    /**
     * null keys would corrupt the shared pref file and make them unreadable this is a preventive measure
     * @param the pref key
     */
    private fun checkForNullKey(key: String?) {
        if (key == null) {
            throw NullPointerException()
        }
    }

    /**
     * null keys would corrupt the shared pref file and make them unreadable this is a preventive measure
     * @param the pref key
     */
    private fun checkForNullValue(value: String?) {
        if (value == null) {
            throw NullPointerException()
        }
    }

}