package com.sosmartlabs.momo.calendarevent.ui

import android.app.ProgressDialog
import android.content.Context
import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.LinearLayoutManager
import com.google.firebase.crashlytics.FirebaseCrashlytics
import com.parse.ParseObject
import com.parse.ParseQuery
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.FragmentCalendarEventListBinding
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import java.text.SimpleDateFormat
import java.util.*

/**
 * @author mrgcl
 */
class CalendarEventListFragment : Fragment() {
    private val TAG = javaClass.simpleName
    private var mListener: CalendarEventListener? = null
    private var mAdapter: CalendarEventAdapter? = null
    private var binding: FragmentCalendarEventListBinding? = null
    private var mContext: Context? = null

    override fun onAttach(context: Context) {
        super.onAttach(context)
        try {
            mListener = context as CalendarEventListener
            mContext = context
        } catch (e: ClassCastException) {
            Log.e(TAG, "Activity must implement CalendarEventListener.")
            val crashlytics = FirebaseCrashlytics.getInstance()
            crashlytics.log("Error on CalendarEventListFragment: Activity must implement CalendarEventListener.")
            crashlytics.recordException(e)
        }
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        binding = FragmentCalendarEventListBinding.inflate(inflater, container, false)
        binding?.buttonAddEvent?.setOnClickListener { 
            mListener?.editEvent(ParseObject("CalendarEvent")) 
        }
        binding?.eventsRecyclerView?.setHasFixedSize(true)
        binding?.eventsRecyclerView?.layoutManager = LinearLayoutManager(mContext)
        mAdapter = CalendarEventAdapter(ArrayList(), mContext)
        binding?.eventsRecyclerView?.adapter = mAdapter
        return binding?.root
    }

    override fun onResume() {
        super.onResume()
        mListener?.setTitle(getString(R.string.title_calendar))
        val now = Date()
        val format = SimpleDateFormat("yyyyMMdd", Locale.getDefault())
        val progressDialog = ProgressDialog(mContext)
        progressDialog.setMessage(getString(R.string.progress_loading_events))
        progressDialog.show()
        val query = ParseQuery.getQuery<ParseObject>("CalendarEvent")
        query.whereEqualTo("watch", mListener?.wearer)
        query.whereGreaterThanOrEqualTo("date", now)
        query.addAscendingOrder("date")
        query.findInBackground { objects, e ->
            progressDialog.dismiss()
            if (e != null) {
                Toast.makeText(mContext, R.string.toast_error_loading_calendar, Toast.LENGTH_LONG).show()
                Log.e(TAG, e.message ?: "Unknown error")
                CrashlyticsLog.recordNonFatalError(e, "Error finding CalendarEvents")
            } else {
                if (objects.isEmpty()) {
                    if (R.id.layout_no_events == binding?.viewSwitcher?.nextView?.id) {
                        binding?.viewSwitcher?.showNext()
                    }
                } else {
                    if (R.id.events_recycler_view == binding?.viewSwitcher?.nextView?.id) {
                        binding?.viewSwitcher?.showNext()
                    }
                    var date = format.format(Date(now.time - 24 * 60 * 60 * 1000))
                    for (obj in objects) {
                        val objectDate = format.format(obj.getDate("date"))
                        if (objectDate == date) {
                            obj.put("first", false)
                        } else {
                            obj.put("first", true)
                            date = objectDate
                        }
                    }
                    mAdapter?.updateData(objects)
                }
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        binding = null
    }
}
