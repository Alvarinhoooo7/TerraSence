package com.sosmartlabs.momotabletpadres.settings.ui

import android.content.Context
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.util.Patterns
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.inputmethod.InputMethodManager
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.Toolbar
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import com.parse.ParseUser
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.databinding.FragmentEmailParentProfileBinding
import com.sosmartlabs.momotabletpadres.utils.WindowInsetsUtils
import com.sosmartlabs.momotabletpadres.viewmodels.UserViewModel
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber

@AndroidEntryPoint
class EmailUserProfileFragment : Fragment() {

    private lateinit var binding: FragmentEmailParentProfileBinding
    private val userProfileViewModel: UserViewModel by activityViewModels()
    val toolbar: Toolbar get() = binding.toolbar

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        binding = FragmentEmailParentProfileBinding.inflate(inflater, container, false)
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
                title = null
                setDisplayShowTitleEnabled(true)
                setDisplayHomeAsUpEnabled(true)
                setDisplayShowHomeEnabled(true)
            }
            toolbar.setNavigationOnClickListener { onBackPressed() }
        }
    }

    private fun setListeners() {
        setupEmailListeners()
        
        binding.saveButton.setOnClickListener {
            if (!isFormInfoValid()) return@setOnClickListener
            
            userProfileViewModel.changeEmail(binding.tilNewEmail.editText!!.text.toString(), requireContext()) {
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

    private fun setupEmailListeners() {
        val textWatcher = object : TextWatcher {
            override fun beforeTextChanged(charSequence: CharSequence, i: Int, i1: Int, i2: Int) {}

            override fun onTextChanged(charSequence: CharSequence, i: Int, i1: Int, i2: Int) {
                binding.tilCurrentEmail.isErrorEnabled = false
                binding.tilNewEmail.isErrorEnabled = false
                binding.tilConfirmNewEmail.isErrorEnabled = false
            }

            override fun afterTextChanged(editable: Editable) {}
        }

        binding.tilCurrentEmail.editText?.addTextChangedListener(textWatcher)
        binding.tilNewEmail.editText?.addTextChangedListener(textWatcher)
        binding.tilConfirmNewEmail.editText?.addTextChangedListener(textWatcher)
    }

    fun observeViewModel() {
        userProfileViewModel.currentUser.observe(viewLifecycleOwner) { user ->
            Timber.d("currentUser $user")
            setUserData(user)
        }
    }

    private fun setUserData(user: ParseUser) {
        val email = user.getString("email") ?: getString(R.string.user_profile_email_current_empty)
        binding.tilCurrentEmail.editText!!.setText(email)
    }

    private fun isFormInfoValid(): Boolean {
        var isValid = true
        val newEmail = binding.tilNewEmail.editText!!.text
        val confirmNewEmail = binding.tilConfirmNewEmail.editText!!.text

        when {
            newEmail.isNullOrBlank() -> {
                binding.tilNewEmail.error = getString(R.string.user_profile_email_error_empty)
                binding.tilNewEmail.isErrorEnabled = true
                isValid = false
            }
            !Patterns.EMAIL_ADDRESS.matcher(newEmail).matches() -> {
                binding.tilNewEmail.error = getString(R.string.user_profile_email_error_format)
                binding.tilNewEmail.isErrorEnabled = true
                isValid = false
            }
            confirmNewEmail.isNullOrBlank() -> {
                binding.tilConfirmNewEmail.error = getString(R.string.user_profile_email_error_empty)
                binding.tilConfirmNewEmail.isErrorEnabled = true
                isValid = false
            }
            newEmail.toString() != confirmNewEmail.toString() -> {
                binding.tilConfirmNewEmail.error = getString(R.string.user_profile_email_error_confirm_email)
                binding.tilConfirmNewEmail.isErrorEnabled = true
                isValid = false
            }
        }

        return isValid
    }

    private fun clearEditTextFocus() {
        binding.tilNewEmail.editText!!.clearFocus()
        binding.tilConfirmNewEmail.editText!!.clearFocus()
    }

    private fun View.hideKeyboard() {
        val inputMethodManager = context.getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager
        inputMethodManager.hideSoftInputFromWindow(windowToken, 0)
        clearFocus()
    }

    override fun onDestroyView() {
        super.onDestroyView()
    }
}