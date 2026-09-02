package com.sosmartlabs.momotabletpadres.viewmodels

import android.app.Application
import android.app.ProgressDialog
import android.content.Context
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.parse.ParseException
import com.parse.ParseFile
import com.parse.ParseUser
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import com.sosmartlabs.momotabletpadres.R
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import timber.log.Timber
import java.io.File
import javax.inject.Inject

@HiltViewModel
class UserViewModel @Inject constructor(
    application: Application,
    @ApplicationContext private val context: Context
) : AndroidViewModel(application) {

    var profileImage: File? = null

    private var _currentUser = MutableLiveData<ParseUser>()
    val currentUser: LiveData<ParseUser>
        get() = _currentUser

    fun getCurrentUser() {
        _currentUser.value = ParseUser.getCurrentUser()
    }

    fun getFirstName(): String {
        return ParseUser.getCurrentUser().get("firstName").toString()
    }

    fun getLastName(): String {
        return ParseUser.getCurrentUser().get("lastName").toString()
    }

    fun getEmail(): String {
        return ParseUser.getCurrentUser().email.toString()
    }

    fun getImageUrl(): String? {
        val image = ParseUser.getCurrentUser()?.getParseFile("image")
        return image?.url
    }

    fun setFile(file: File) {
        Timber.d("saveProfilePicture: $file")
        profileImage = file
    }

    fun changeNames(firstName: String, lastName: String, context: Context, callback: (ParseException?) -> Unit) {
        val mUser = ParseUser.getCurrentUser()
        mUser.put("firstName", firstName)
        mUser.put("lastName", lastName)
        val progressDialog = ProgressDialog(context)
        progressDialog.setMessage(context.getString(R.string.changing_personal_informartion))
        progressDialog.show()
        mUser.saveInBackground {
            progressDialog.dismiss()
            callback(it)
        }
    }

    fun changeEmail(newEmail: String, context: Context, callback: (ParseException?) -> Unit) {
        try {
            val mUser = ParseUser.getCurrentUser()
            mUser!!.email = newEmail
            if(!mUser.has("fb") || !mUser.getBoolean("fb")) mUser.username = newEmail
            val progressDialog = ProgressDialog(context)
            progressDialog.setMessage(context.getString(R.string.changing_mail))
            progressDialog.show()
            mUser.saveInBackground {
                progressDialog.dismiss()
                callback(it)
            }
        } catch (e: Exception) {
            Timber.e(e)
        }
    }

    fun changePassword(newPassword: String, context: Context, callback: (ParseException?) -> Unit) {
        val progressDialog = ProgressDialog(context)
        progressDialog.setMessage(context.getString(R.string.changing_password))
        progressDialog.show()
        val mUser = ParseUser.getCurrentUser()
        mUser.setPassword(newPassword)
        mUser.saveInBackground {
            progressDialog.dismiss()
            callback(it)
        }
    }

    fun changeUserPicture() {
        viewModelScope.launch(Dispatchers.IO) {
            runCatching {
                val currentUser = ParseUser.getCurrentUser()
                if (profileImage != null) {
                    val parseFile = ParseFile(profileImage)
                    parseFile.save()
                    currentUser.put("image", parseFile)
                    currentUser.save()
                }
            }.onSuccess {
                getCurrentUser()
            }.onFailure { e ->
                Timber.e(e)
                CrashlyticsLog.recordNonFatalError(e, "Error: changeUserPicture")
                getCurrentUser()
            }
        }
    }
}