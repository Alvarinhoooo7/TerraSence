package com.sosmartlabs.momo.userprofile.ui.fragment

import android.content.Context
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.inputmethod.InputMethodManager
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.Toolbar
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.UserProfilePasswordFragmentBinding
import com.sosmartlabs.momo.userprofile.ui.UserProfileViewModel
import com.sosmartlabs.momo.utils.Resource
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber

@AndroidEntryPoint
class PasswordUserProfileFragment: Fragment() {

    /**
     * Binding
     */
    private lateinit var binding: UserProfilePasswordFragmentBinding

    val toolbar: Toolbar get() = binding.toolbar

    private val toolbarTitle: String get() = getString(R.string.user_profile_change_password_title)

    /**
     * ViewModel
     */
    private val userProfileViewModel: UserProfileViewModel by activityViewModels()

    private val passwordRegex = Regex("^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9.!#%]).{8,}$")

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        binding = UserProfilePasswordFragmentBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupToolbar()
        setListeners()
        observeViewModel()
    }

    override fun onResume() {
        super.onResume()
        userProfileViewModel.getCurrentUser()
    }

    private fun setupToolbar() {
        Timber.d("setupToolbar")
        with(activity as AppCompatActivity) {
            setSupportActionBar(toolbar)
            supportActionBar?.apply {
                title = toolbarTitle
                setDisplayShowTitleEnabled(true)
                setDisplayHomeAsUpEnabled(true)
                setDisplayShowHomeEnabled(true)
            }
            window.statusBarColor = ContextCompat.getColor(requireContext(), R.color.background_sim_step_card_title)
            window.navigationBarColor = ContextCompat.getColor(requireContext(), R.color.white)
            toolbar.setNavigationOnClickListener { onBackPressed() }
        }
    }

    private fun setListeners() {
        setupCurrentPasswordListener()
        setupNewPasswordListener()
        setupConfirmNewPasswordListener()

        binding.buttonSaveChanges.setOnClickListener {
            if (!isFormInfoValid()) {
                return@setOnClickListener
            }
            val params = createPasswordInfoMap()
            userProfileViewModel.changeUserPassword(params)
            clearEditTextFocus()
            it.hideKeyboard()
        }

        binding.parentLayout.setOnClickListener {
            it.hideKeyboard()
        }
    }

    fun observeViewModel() {
        userProfileViewModel.currentUser.observe(viewLifecycleOwner) {
            Timber.d("currentUser $it")
            when (it.status) {
                Resource.Status.LOADING -> {
                    // No-Op
                }
                Resource.Status.LOAD_SUCCESS -> {
                    // No-Op
                }
                Resource.Status.LOAD_ERROR -> {
                    Toast.makeText(context, R.string.user_profile_form_changes_error, Toast.LENGTH_SHORT).show()
                }
                Resource.Status.UPDATING -> {
                    binding.buttonSaveChanges.visibility = View.INVISIBLE
                    binding.progressIndicator.visibility = View.VISIBLE
                }
                Resource.Status.UPDATING_SUCCESS -> {
                    binding.buttonSaveChanges.visibility = View.VISIBLE
                    binding.progressIndicator.visibility = View.INVISIBLE
                    binding.tilCurrentPassword.editText!!.text.clear()
                    binding.tilNewPassword.editText!!.text.clear()
                    binding.tilConfirmNewPassword.editText!!.text.clear()
                    clearEditTextFocus()
                    Toast.makeText(context, R.string.user_profile_form_changes_success, Toast.LENGTH_SHORT).show()
                }
                Resource.Status.UPDATING_ERROR -> {
                    binding.buttonSaveChanges.visibility = View.VISIBLE
                    binding.progressIndicator.visibility = View.INVISIBLE
                    binding.tilCurrentPassword.editText!!.text.clear()
                    binding.tilNewPassword.editText!!.text.clear()
                    binding.tilConfirmNewPassword.editText!!.text.clear()
                    clearEditTextFocus()
                    Toast.makeText(context, R.string.user_profile_form_changes_error, Toast.LENGTH_SHORT).show()
                }
                else -> {
                    // No-Op
                }
            }
        }
    }

    private fun setupCurrentPasswordListener() {
        binding.tilCurrentPassword.editText?.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(charSequence: CharSequence, i: Int, i1: Int, i2: Int) {

            }

            override fun onTextChanged(charSequence: CharSequence, i: Int, i1: Int, i2: Int) {
                if (binding.tilCurrentPassword.isErrorEnabled) binding.tilCurrentPassword.isErrorEnabled = false
            }

            override fun afterTextChanged(editable: Editable) {
            }
        })
    }

    private fun setupNewPasswordListener() {
        binding.tilNewPassword.editText?.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(charSequence: CharSequence, i: Int, i1: Int, i2: Int) {

            }

            override fun onTextChanged(charSequence: CharSequence, i: Int, i1: Int, i2: Int) {
                if (binding.tilNewPassword.isErrorEnabled) binding.tilNewPassword.isErrorEnabled = false
            }

            override fun afterTextChanged(editable: Editable) {
            }
        })
    }

    private fun setupConfirmNewPasswordListener() {
        binding.tilConfirmNewPassword.editText?.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(charSequence: CharSequence, i: Int, i1: Int, i2: Int) {

            }

            override fun onTextChanged(charSequence: CharSequence, i: Int, i1: Int, i2: Int) {
                if (binding.tilConfirmNewPassword.isErrorEnabled) binding.tilConfirmNewPassword.isErrorEnabled = false
            }

            override fun afterTextChanged(editable: Editable) {
            }
        })
    }

    private fun clearEditTextFocus() {
        binding.tilCurrentPassword.editText!!.clearFocus()
        binding.tilNewPassword.editText!!.clearFocus()
        binding.tilConfirmNewPassword.editText!!.clearFocus()
    }

    private fun createPasswordInfoMap(): MutableMap<String, Any> {
        val params = mutableMapOf<String, Any>()
        params["currentPassword"] = binding.tilCurrentPassword.editText!!.text.toString()
        params["newPassword"] = binding.tilNewPassword.editText!!.text.toString()
        return params
    }

    private fun isFormInfoValid(): Boolean {
        var isValid = true

        val currentPassword = binding.tilCurrentPassword.editText!!.text
        val newPassword = binding.tilNewPassword.editText!!.text
        val confirmNewPassword = binding.tilConfirmNewPassword.editText!!.text

        if (currentPassword.isNullOrBlank()) {
            binding.tilCurrentPassword.isErrorEnabled = true
            binding.tilCurrentPassword.error = getString(R.string.user_profile_password_error_empty)
            isValid = false
        }

        if (newPassword.isNullOrBlank()) {
            binding.tilNewPassword.isErrorEnabled = true
            binding.tilNewPassword.error = getString(R.string.user_profile_password_error_empty)
            isValid = false
        }

        if (!passwordRegex.matches(newPassword)) {
            binding.tilNewPassword.isErrorEnabled = true
            binding.tilNewPassword.error = getString(R.string.user_profile_password_error_format)
            isValid = false
        }

        if (confirmNewPassword.isNullOrBlank()) {
            binding.tilConfirmNewPassword.isErrorEnabled = true
            binding.tilConfirmNewPassword.error = getString(R.string.user_profile_password_error_empty)
            isValid = false
        }

        if (newPassword.toString() != confirmNewPassword.toString()) {
            binding.tilConfirmNewPassword.isErrorEnabled = true
            binding.tilConfirmNewPassword.error = getString(R.string.user_profile_password_error_confirm_password)
            isValid = false
        }

        return isValid
    }

    private fun View.hideKeyboard() {
        val inputMethodManager = context.getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager
        inputMethodManager.hideSoftInputFromWindow(windowToken, 0)
        clearFocus()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        dispose()
    }

    private fun dispose() {
    }
}