package com.sosmartlabs.momo.linkwatch.ui

import android.content.Context
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import com.hbb20.CCPCountry
import com.hbb20.CountryCodePicker
import com.parse.ParseUser
import com.sosmartlabs.momo.linkwatch.data.ChildDataValidationError
import com.sosmartlabs.momologin.utils.validation.Validation
import com.sosmartlabs.momologin.utils.validation.ValidationError
import dagger.hilt.android.lifecycle.HiltViewModel
import timber.log.Timber
import java.lang.Exception
import java.util.Date
import javax.inject.Inject

@HiltViewModel
class LinkWatchAdminDataViewModel @Inject constructor(private val validation: Validation) : ViewModel() {

    val firstNameData : MutableLiveData<String> = MutableLiveData("")
    val lastNameData : MutableLiveData<String> = MutableLiveData("")
    val phoneNumberData : MutableLiveData<String> = MutableLiveData("")
    val countryCodeData : MutableLiveData<String> = MutableLiveData("")
    val emailData : MutableLiveData<String> = MutableLiveData("")
    var errors : MutableList<ValidationError> = mutableListOf()

    private lateinit var phoneCodeNumber : String
    private lateinit var phoneRegionCode : String
    private lateinit var parseUser : ParseUser

    fun validateData() : MutableList<ValidationError> {
        errors = mutableListOf()
        if (!validateFirstName()) errors.add(ValidationError.FIRST_NAME_ERROR)
        if (!validateLastName()) errors.add(ValidationError.LAST_NAME_ERROR)
        if (!validatePhoneNumber()) errors.add(ValidationError.PHONE_NUMBER_ERROR)
        if (!validateEmailFormat()) errors.add(ValidationError.EMAIL_FORMAT_ERROR)
        return mutableListOf()
    }

    fun validateFirstName() : Boolean {
        return validation.isValidNotEmptyField(firstNameData.value)
    }

    fun validateLastName() : Boolean {
        return validation.isValidNotEmptyField(lastNameData.value)
    }

    fun validatePhoneNumber() : Boolean {
        return validation.isValidPhoneNumber(getPhoneNumber(), phoneRegionCode)
    }

    fun validateEmailFormat() : Boolean {
        return validation.isValidEmail(emailData.value)
    }

    fun setCountryCode(numericCode : String, regionCode : String) {
        phoneCodeNumber = numericCode
        phoneRegionCode = regionCode
        if(numericCode != countryCodeData.value) countryCodeData.postValue(numericCode)
    }

    fun clearData() {
        firstNameData.value = ""
        lastNameData.value = ""
        phoneNumberData.value = ""
        emailData.value = ""
    }

    fun removeError(error : ValidationError) {
        errors.remove(error)
    }

    fun setUser(user: ParseUser, context: Context) {
        parseUser = user
        firstNameData.postValue(user.get("firstName") as String?)
        lastNameData.postValue(user.get("lastName") as String?)
        emailData.postValue(user.get("email") as String?)

        try {
            val phone = user.get("phone") as String?
            if (!phone.isNullOrEmpty()) {
                Timber.d("phone: $phone")
                val country = CCPCountry.getCountryForNumber(
                    context,
                    CountryCodePicker.Language.ENGLISH, user.get("phone") as String?
                )
                val number = phone.removePrefix("+${country.phoneCode}")
                countryCodeData.postValue(country.phoneCode)
                phoneNumberData.postValue(number)
            }
        } catch (_: Exception) {
        }
    }
    fun getPhoneNumber(): String {
        return "+" + phoneCodeNumber + phoneNumberData.value
    }
}