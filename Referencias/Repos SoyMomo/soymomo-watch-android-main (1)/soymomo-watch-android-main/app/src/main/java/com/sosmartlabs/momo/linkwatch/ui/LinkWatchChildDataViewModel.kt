package com.sosmartlabs.momo.linkwatch.ui


import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.sosmartlabs.momo.addfirstwatch.model.KidProfileStatus
import com.sosmartlabs.momo.addfirstwatch.repository.WearerRepository
import com.sosmartlabs.momo.linkwatch.data.ChildDataValidationError
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momologin.utils.validation.Validation
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import timber.log.Timber
import java.util.Calendar
import java.util.Date
import javax.inject.Inject
import kotlin.coroutines.CoroutineContext

@HiltViewModel
class LinkWatchChildDataViewModel @Inject constructor(
    private val validation: Validation,
    private val ioContext: CoroutineContext,
    private val wearerRepository: WearerRepository
) : ViewModel() {

    val firstNameData : MutableLiveData<String> = MutableLiveData("")
    val lastNameData : MutableLiveData<String> = MutableLiveData("")
    val birthdayData : MutableLiveData<Date> = MutableLiveData(null)
    val heightData : MutableLiveData<String> = MutableLiveData("")
    val weightData : MutableLiveData<String> = MutableLiveData("")
    var errors : MutableList<ChildDataValidationError> = mutableListOf()

    private var _kidProfileStatus = MutableLiveData<KidProfileStatus>()
    val kidProfileStatus: LiveData<KidProfileStatus>
        get() = _kidProfileStatus

    private var _currentWearer = MutableLiveData<Wearer?>()
    val currentWearer: LiveData<Wearer?>
        get() = _currentWearer

    fun validateData() : MutableList<ChildDataValidationError> {
        errors = mutableListOf()
        if (!validateFirstName()) errors.add(ChildDataValidationError.FIRST_NAME_ERROR)
        if (!validateLastName()) errors.add(ChildDataValidationError.LAST_NAME_ERROR)
        if (!validateBirthday()) errors.add(ChildDataValidationError.BIRTHDAY_ERROR)
        if (!validateHeight()) errors.add(ChildDataValidationError.HEIGHT_ERROR)
        if (!validateWeight()) errors.add(ChildDataValidationError.WEIGHT_ERROR)
        return mutableListOf()
    }

    fun validateFirstName() : Boolean {
        return validation.isValidNotEmptyField(firstNameData.value)
    }

    fun validateLastName() : Boolean {
        return validation.isValidNotEmptyField(lastNameData.value)
    }

    fun validateBirthday() : Boolean {
        return validation.isNotNull(birthdayData.value)
    }

    fun validateHeight() : Boolean {
        return validation.isValidNotEmptyField(heightData.value)
    }

    fun validateWeight() : Boolean {
        return validation.isValidNotEmptyField(weightData.value)
    }

    fun removeError(error : ChildDataValidationError) {
        errors.remove(error)
    }

    fun setDate(millis : Long) {
        val calendar = Calendar.getInstance()
        calendar.timeInMillis = millis
        birthdayData.postValue(calendar.time)
    }

    fun onKidDetailsEntered() {
        viewModelScope.launch(ioContext) {
            _kidProfileStatus.postValue(KidProfileStatus.KID_DETAILS_SAVING)
            _currentWearer.value?.let { wearer ->
                runCatching {
                    val params = mapOf(
                        "name" to firstNameData.value,
                        "lastName" to lastNameData.value,
                        "birthday" to birthdayData.value,
                        "height" to heightData.value,
                        "weight" to weightData.value
                    ) as Map<String, Any?>
                    wearerRepository.editWearer(wearer, params)
                }.onFailure {
                    Timber.e(it)
                    _kidProfileStatus.postValue(KidProfileStatus.ERROR_LOADING)
                }.onSuccess {
                    _kidProfileStatus.postValue(KidProfileStatus.KID_DETAILS_SUCCESS)
                }
            }
        }
    }

    fun setCurrentWearer(wearer: Wearer) {
        viewModelScope.launch(ioContext) {
            _currentWearer.postValue(wearer)
        }
    }
}