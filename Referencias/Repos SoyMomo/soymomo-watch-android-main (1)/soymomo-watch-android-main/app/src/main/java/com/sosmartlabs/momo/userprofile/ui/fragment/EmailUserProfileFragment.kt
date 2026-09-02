package com.sosmartlabs.momo.userprofile.ui.fragment

import android.content.Context
import android.os.Bundle
import android.text.Editable
import android.text.InputFilter
import android.text.Spanned
import android.text.TextWatcher
import android.util.Patterns
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
import com.parse.ParseUser
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.UserProfileEmailFragmentBinding
import com.sosmartlabs.momo.userprofile.ui.UserProfileViewModel
import com.sosmartlabs.momo.utils.Resource
import timber.log.Timber
import java.lang.Math.min
import java.util.Locale

class EmailUserProfileFragment: Fragment() {

    /**
     * Binding
     */
    private lateinit var binding: UserProfileEmailFragmentBinding

    val toolbar: Toolbar get() = binding.toolbar

    private val toolbarTitle: String get() = getString(R.string.user_profile_change_email_title)

    /**
     * ViewModel
     */
    private val userProfileViewModel: UserProfileViewModel by activityViewModels()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        binding = UserProfileEmailFragmentBinding.inflate(inflater, container, false)
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
        setupCurrentEmailListener()
        setupNewEmailListener()
        setupConfirmNewEmailListener()
        binding.buttonSaveChanges.setOnClickListener {
            if (!isFormInfoValid()) {
                return@setOnClickListener
            }
            val params = createEmailInfoMap()
            userProfileViewModel.changeUserEmail(params)
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
                    it.data?.let { currentUser ->
                        setUserData(currentUser)
                    }
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
                    binding.tilNewEmail.editText!!.text.clear()
                    binding.tilConfirmNewEmail.editText!!.text.clear()
                    clearEditTextFocus()
                    Toast.makeText(context, R.string.user_profile_form_changes_success, Toast.LENGTH_SHORT).show()
                }
                Resource.Status.UPDATING_ERROR -> {
                    binding.buttonSaveChanges.visibility = View.VISIBLE
                    binding.progressIndicator.visibility = View.INVISIBLE
                    binding.tilNewEmail.editText!!.text.clear()
                    binding.tilConfirmNewEmail.editText!!.text.clear()
                    clearEditTextFocus()
                    Toast.makeText(context, R.string.user_profile_form_changes_error, Toast.LENGTH_SHORT).show()
                }
                else -> {
                    // No-Op
                }
            }
        }
    }

    private fun setUserData(user: ParseUser) {
        with(user) {
            val email = getString("email") ?: getString(R.string.user_profile_email_current_empty)
            binding.tilCurrentEmail.editText!!.setText(email)
        }
    }

    private fun setupCurrentEmailListener() {
        binding.tilCurrentEmail.editText?.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(charSequence: CharSequence, i: Int, i1: Int, i2: Int) {

            }

            override fun onTextChanged(charSequence: CharSequence, i: Int, i1: Int, i2: Int) {
                if (binding.tilCurrentEmail.isErrorEnabled) binding.tilCurrentEmail.isErrorEnabled = false
            }

            override fun afterTextChanged(editable: Editable) {
            }
        })
    }

    private fun setupNewEmailListener() {
        binding.tilNewEmail.editText?.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(charSequence: CharSequence, i: Int, i1: Int, i2: Int) {

            }

            override fun onTextChanged(charSequence: CharSequence, i: Int, i1: Int, i2: Int) {
                if (binding.tilNewEmail.isErrorEnabled) binding.tilNewEmail.isErrorEnabled = false
            }

            override fun afterTextChanged(editable: Editable) {
            }
        })
    }

    private fun setupConfirmNewEmailListener() {
        binding.tilConfirmNewEmail.editText?.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(charSequence: CharSequence, i: Int, i1: Int, i2: Int) {

            }

            override fun onTextChanged(charSequence: CharSequence, i: Int, i1: Int, i2: Int) {
                if (binding.tilConfirmNewEmail.isErrorEnabled) binding.tilConfirmNewEmail.isErrorEnabled = false
            }

            override fun afterTextChanged(editable: Editable) {
            }
        })
    }

    private fun clearEditTextFocus() {
        binding.tilNewEmail.editText!!.clearFocus()
        binding.tilConfirmNewEmail.editText!!.clearFocus()
    }

    private fun createEmailInfoMap(): MutableMap<String, Any> {
        val params = mutableMapOf<String, Any>()
        params["currentEmail"] = binding.tilCurrentEmail.editText!!.text.toString()
        params["newEmail"] = binding.tilNewEmail.editText!!.text.toString()
        return params
    }

    private fun isFormInfoValid(): Boolean {
        var isValid = true

        val newEmail = binding.tilNewEmail.editText!!.text
        val confirmNewEmail = binding.tilConfirmNewEmail.editText!!.text

        if (newEmail.isNullOrBlank()) {
            binding.tilNewEmail.isErrorEnabled = true
            binding.tilNewEmail.error = getString(R.string.user_profile_email_error_empty)
            isValid = false
        }
        if (!Patterns.EMAIL_ADDRESS.matcher(newEmail).matches()) {
            binding.tilNewEmail.isErrorEnabled = true
            binding.tilNewEmail.error = getString(R.string.user_profile_email_error_format)
            isValid = false
        }
        if (confirmNewEmail.isNullOrBlank()) {
            binding.tilConfirmNewEmail.isErrorEnabled = true
            binding.tilConfirmNewEmail.error = getString(R.string.user_profile_email_error_empty)
            isValid = false
        }
        if (newEmail.toString() != confirmNewEmail.toString()) {
            binding.tilConfirmNewEmail.isErrorEnabled = true
            binding.tilConfirmNewEmail.error = getString(R.string.user_profile_email_error_confirm_email)
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