package com.sosmartlabs.momo.calendarevent.ui

import android.app.DatePickerDialog
import android.app.ProgressDialog
import android.app.TimePickerDialog
import android.content.Context
import android.os.Bundle
import android.text.format.DateFormat
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import com.parse.ParseCloud
import com.parse.ParseObject
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.FragmentCalendarEventEditBinding
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.utils.DateUtil
import com.sosmartlabs.momo.utils.SamsungUtils
import timber.log.Timber
import java.util.*

/**
 * @author mrgcl
 */
class CalendarEventEditFragment : Fragment() {
    private val TAG = javaClass.simpleName
    private var mListener: CalendarEventListener? = null
    private var mEvent: ParseObject? = null
    private var binding: FragmentCalendarEventEditBinding? = null
    private var mDate: Date? = null
    private var isNew = false
    private var mContext: Context? = null

    override fun onAttach(context: Context) {
        super.onAttach(context)
        try {
            mListener = context as CalendarEventListener
            mContext = context
        } catch (e: ClassCastException) {
            Log.e(TAG, "Activity must implement CalendarEventListener.")
            CrashlyticsLog.recordNonFatalError(e, "Error on CalendarEventEditFragment: Activity must implement CalendarEventListener.")
        }
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        binding = FragmentCalendarEventEditBinding.inflate(inflater, container, false)
        
        binding?.buttonEventDate?.setOnClickListener {
            val c = Calendar.getInstance(TimeZone.getDefault())
            c.time = mDate
            val year = c.get(Calendar.YEAR)
            val month = c.get(Calendar.MONTH)
            val day = c.get(Calendar.DAY_OF_MONTH)
            if (SamsungUtils.hasBrokenDatePickerDialog()) {
                DatePickerDialog(
                    mContext!!,
                    android.R.style.Theme_Holo_Light_Dialog,
                    { _, selectedYear, selectedMonth, selectedDay ->
                        onDateSet(selectedYear, selectedMonth, selectedDay)
                    },
                    year,
                    month,
                    day
                ).show()
            } else {
                DatePickerDialog(
                    mContext!!,
                    { _, selectedYear, selectedMonth, selectedDay ->
                        onDateSet(selectedYear, selectedMonth, selectedDay)
                    },
                    year,
                    month,
                    day
                ).show()
            }
        }

        binding?.buttonEventTime?.setOnClickListener {
            val c = Calendar.getInstance(TimeZone.getDefault())
            c.time = mDate
            val hour = c.get(Calendar.HOUR_OF_DAY)
            val minute = c.get(Calendar.MINUTE)
            TimePickerDialog(
                activity,
                { _, selectedHour, selectedMinute ->
                    onTimeSet(selectedHour, selectedMinute)
                },
                hour,
                minute,
                DateFormat.is24HourFormat(activity)
            ).show()
        }

        binding?.buttonSaveEvent?.setOnClickListener {
            val message = binding?.edittextEventName?.text.toString().trim()
            if (message.isEmpty()) {
                Toast.makeText(context, R.string.toast_error_no_event_name, Toast.LENGTH_LONG).show()
                return@setOnClickListener
            }
            if (mDate!!.compareTo(Date()) < 1) {
                Toast.makeText(context, R.string.toast_error_event_date, Toast.LENGTH_LONG).show()
                return@setOnClickListener
            }
            val params = HashMap<String, Any>()
            params["message"] = message
            params["startDate"] = mDate!!.time
            val progressDialog = ProgressDialog(context)
            progressDialog.setMessage(getString(R.string.progress_saving_event))
            progressDialog.show()
            
            if (isNew) {
                params["deviceId"] = mListener?.wearer?.getString("deviceId")!!
                ParseCloud.callFunctionInBackground<Any>("createEvent", params) { _, e ->
                    progressDialog.dismiss()
                    if (e != null) {
                        Timber.e(e)
                        Toast.makeText(context, R.string.toast_error_creating_event, Toast.LENGTH_LONG).show()
                        CrashlyticsLog.recordNonFatalError(e, "Error on createEvent cloud function")
                    } else {
                        mListener?.onEditedEvent()
                    }
                }
            } else {
                params["objectId"] = mEvent?.objectId!!
                ParseCloud.callFunctionInBackground<Any>("editEvent", params) { _, e ->
                    progressDialog.dismiss()
                    if (e != null) {
                        Timber.e(e)
                        Toast.makeText(context, R.string.toast_error_editing_event, Toast.LENGTH_LONG).show()
                        CrashlyticsLog.recordNonFatalError(e, "Error on editEvent cloud function")
                    } else {
                        mListener?.onEditedEvent()
                    }
                }
            }
        }

        binding?.buttonDeleteEvent?.setOnClickListener {
            val progressDialog = ProgressDialog(context)
            progressDialog.setMessage(getString(R.string.progress_deleting_event))
            progressDialog.show()
            val params = HashMap<String, Any>()
            params["objectId"] = mEvent?.objectId!!
            ParseCloud.callFunctionInBackground<Any>("deleteEvent", params) { _, e ->
                progressDialog.dismiss()
                if (e != null) {
                    Toast.makeText(context, R.string.toast_error_deleting_event, Toast.LENGTH_LONG).show()
                    CrashlyticsLog.recordNonFatalError(e, "Error on deleteEvent cloud function")
                } else {
                    mListener?.onEditedEvent()
                }
            }
        }

        return binding?.root
    }

    override fun onResume() {
        super.onResume()
        mEvent = mListener?.selectedEvent
        if (mEvent == null) {
            mListener?.onEditedEvent()
            return
        }
        if (mEvent?.objectId == null) {
            isNew = true
            mListener?.setTitle(getString(R.string.title_create_event))
            mDate = Calendar.getInstance(TimeZone.getDefault()).time
        } else {
            isNew = false
            mListener?.setTitle(getString(R.string.title_edit_event))
            binding?.edittextEventName?.setText(mEvent?.getString("message"))
            mDate = mEvent?.getDate("date")
        }
        binding?.buttonDeleteEvent?.visibility = if (isNew) View.INVISIBLE else View.VISIBLE
        mDate?.let {
            binding?.textviewEventTime?.text = DateUtil.getFormattedOnlyTime(it)
            binding?.textviewEventDate?.text = DateUtil.getFormattedOnlyDate(it)
        }
    }

    private fun onTimeSet(hour: Int, minute: Int) {
        mDate?.let { currentDate ->
            val c = Calendar.getInstance(TimeZone.getDefault())
            c.time = currentDate
            c.set(Calendar.HOUR_OF_DAY, hour)
            c.set(Calendar.MINUTE, minute)
            mDate = c.time
            binding?.textviewEventTime?.text = DateUtil.get24HoursFormattedTimeNoLocale(c.time)
        }
    }

    private fun onDateSet(year: Int, month: Int, day: Int) {
        mDate?.let { currentDate ->
            val c = Calendar.getInstance(TimeZone.getDefault())
            c.time = currentDate
            c.set(Calendar.YEAR, year)
            c.set(Calendar.MONTH, month)
            c.set(Calendar.DAY_OF_MONTH, day)
            mDate = c.time
            binding?.textviewEventDate?.text = DateUtil.getFormattedOnlyDate(c.time)
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        binding = null
    }
}
