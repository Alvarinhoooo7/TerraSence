package com.sosmartlabs.momotabletpadres.settings.ui

import android.content.Context
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.inputmethod.InputMethodManager
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.Toolbar
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.databinding.FragmentPasswordParentProfileBinding
import com.sosmartlabs.momotabletpadres.utils.WindowInsetsUtils
import com.sosmartlabs.momotabletpadres.viewmodels.UserViewModel
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber

@AndroidEntryPoint
class PasswordUserProfileFragment : Fragment() {

    private lateinit var binding: FragmentPasswordParentProfileBinding
    private val userProfileViewModel: UserViewModel by activityViewModels()
    val toolbar: Toolbar get() = binding.toolbar
    
    private val passwordRegex = Regex("^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9.!#%]).{8,}$")

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        binding = FragmentPasswordParentProfileBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        // Push the purple header clear of the status bar (status-bar + 8dp, matching
        // MainActivity) and keep the Save button above the nav bar / keyboard.
        WindowInsetsUtils.applyEdgeToEdgeInsets(
            root = binding.root,
            topView = binding.appBarLayoutBlocks,
            bottomView = binding.saveButton,
            bottomAsMargin = true,
            extraTopPx = resources.getDimensionPixelSize(R.dimen.horizontal_margin_small),
            includeImeBottom = true,
        )
        setupToolbar()
        setupListeners()
        observeViewModel()
    }

    override fun onResume() {
        super.onResume()
        userProfileViewModel.getCurrentUser()
    }

    override fun onDestroyView() {
        super.onDestroyView()
    }

    private fun setupToolbar() {
        Timber.d("setupToolbar")
        with(activity as AppCompatActivity) {
            setSupportActionBar(toolbar)
            supportActionBar?.apply {
                title = null
                setDisplayShowTitleEnabled(true)
                setDisplayHomeAsUpEnabled(true)
                setDisplayShowHomeEnabled(true)
            }
            toolbar.setNavigationOnClickListener { onBackPressed() }
        }
    }

    private fun setupListeners() {
        setupPasswordTextWatchers()
        setupClickListeners()
    }

    private fun setupPasswordTextWatchers() {
        binding.tilCurrentPassword.editText?.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(charSequence: CharSequence, i: Int, i1: Int, i2: Int) {}
            override fun onTextChanged(charSequence: CharSequence, i: Int, i1: Int, i2: Int) {
                if (binding.tilCurrentPassword.isErrorEnabled) binding.tilCurrentPassword.isErrorEnabled = false
            }
            override fun afterTextChanged(editable: Editable) {}
        })

        binding.tilNewPassword.editText?.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(charSequence: CharSequence, i: Int, i1: Int, i2: Int) {}
            override fun onTextChanged(charSequence: CharSequence, i: Int, i1: Int, i2: Int) {
                if (binding.tilNewPassword.isErrorEnabled) binding.tilNewPassword.isErrorEnabled = false
            }
            override fun afterTextChanged(editable: Editable) {}
        })

        binding.tilConfirmNewPassword.editText?.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(charSequence: CharSequence, i: Int, i1: Int, i2: Int) {}
            override fun onTextChanged(charSequence: CharSequence, i: Int, i1: Int, i2: Int) {
                if (binding.tilConfirmNewPassword.isErrorEnabled) binding.tilConfirmNewPassword.isErrorEnabled = false
            }
            override fun afterTextChanged(editable: Editable) {}
        })
    }

    private fun setupClickListeners() {
        binding.saveButton.setOnClickListener {
            if (!isFormInfoValid()) return@setOnClickListener
            
            userProfileViewModel.changePassword(binding.tilNewPassword.editText!!.text.toString(), requireContext()) {
                activity?.onBackPressed()
            }
            clearEditTextFocus()
            it.hideKeyboard()
        }

        binding.parentConstraintLayout.setOnClickListener {
            it.hideKeyboard()
        }

        binding.backArrow.setOnClickListener {
            activity?.onBackPressed()
        }
    }

    private fun observeViewModel() {
        userProfileViewModel.currentUser.observe(viewLifecycleOwner) {
            Timber.d("currentUser $it")
        }
    }

    private fun isFormInfoValid(): Boolean {
        var isValid = true
        val currentPassword = binding.tilCurrentPassword.editText!!.text
        val newPassword = binding.tilNewPassword.editText!!.text
        val confirmNewPassword = binding.tilConfirmNewPassword.editText!!.text

        when {
            currentPassword.isNullOrBlank() -> {
                binding.tilCurrentPassword.apply {
                    isErrorEnabled = true
                    error = getString(R.string.user_profile_password_error_empty)
                }
                isValid = false
            }
            newPassword.isNullOrBlank() -> {
                binding.tilNewPassword.apply {
                    isErrorEnabled = true
                    error = getString(R.string.user_profile_password_error_empty)
                }
                isValid = false
            }
            !passwordRegex.matches(newPassword) -> {
                binding.tilNewPassword.apply {
                    isErrorEnabled = true
                    error = getString(R.string.user_profile_password_error_format)
                }
                isValid = false
            }
            confirmNewPassword.isNullOrBlank() -> {
                binding.tilConfirmNewPassword.apply {
                    isErrorEnabled = true
                    error = getString(R.string.user_profile_password_error_empty)
                }
                isValid = false
            }
            newPassword.toString() != confirmNewPassword.toString() -> {
                binding.tilConfirmNewPassword.apply {
                    isErrorEnabled = true
                    error = getString(R.string.user_profile_password_error_confirm_password)
                }
                isValid = false
            }
        }

        return isValid
    }

    private fun clearEditTextFocus() {
        binding.apply {
            tilCurrentPassword.editText!!.clearFocus()
            tilNewPassword.editText!!.clearFocus()
            tilConfirmNewPassword.editText!!.clearFocus()
        }
    }

    private fun View.hideKeyboard() {
        val inputMethodManager = context.getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager
        inputMethodManager.hideSoftInputFromWindow(windowToken, 0)
        clearFocus()
    }
}