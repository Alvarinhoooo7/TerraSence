package com.sosmartlabs.momo.calendarevent.ui;

import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.recyclerview.widget.RecyclerView;

import com.parse.ParseObject;
import com.sosmartlabs.momo.R;
import com.sosmartlabs.momo.utils.DateUtil;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.Locale;

/**
 * @author mrgcl
 */

public class CalendarEventAdapter extends RecyclerView.Adapter<CalendarEventAdapter.CalendarEventViewHolder> {
    private List<ParseObject> mCalendarEvents;
    private final Context mContext;

    public CalendarEventAdapter(List<ParseObject> eventList, Context context){
        mCalendarEvents = eventList;
        mContext = context;
    }

    @Override
    public CalendarEventAdapter.CalendarEventViewHolder onCreateViewHolder(ViewGroup parent, int viewType) {
        View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_calendar_event, parent, false);
        return new CalendarEventViewHolder(v);
    }

    @Override
    public void onBindViewHolder(final CalendarEventAdapter.CalendarEventViewHolder holder, int position) {
        final ParseObject event = mCalendarEvents.get(position);
        Date date = event.getDate("date");
        holder.vName.setText(event.getString("message"));
        holder.vTime.setText(DateUtil.INSTANCE.getFormattedOnlyTime(date));
        holder.vLayout.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                ((CalendarEventListener) mContext).editEvent(event);
            }
        });
        SimpleDateFormat day = new SimpleDateFormat("dd", Locale.getDefault());
        SimpleDateFormat month = new SimpleDateFormat("MMM", Locale.getDefault());
        holder.vMonth.setText(month.format(date));
        holder.vDay.setText(day.format(date));
        holder.vDateLayout.setVisibility(event.getBoolean("first") ? View.VISIBLE : View.INVISIBLE);
    }

    @Override
    public int getItemCount() {
        return mCalendarEvents.size();
    }

    public void updateData(List<ParseObject> newData){
        mCalendarEvents = newData;
        notifyDataSetChanged();
    }

    class CalendarEventViewHolder extends RecyclerView.ViewHolder {
        LinearLayout vLayout, vDateLayout;
        TextView vName, vTime, vMonth, vDay;

        CalendarEventViewHolder(View itemView) {
            super(itemView);
            vDateLayout = itemView.findViewById(R.id.calendar_event_date);
            vLayout = itemView.findViewById(R.id.calendar_event_layout);
            vName = itemView.findViewById(R.id.calendar_event_name);
            vTime = itemView.findViewById(R.id.calendar_event_time);
            vMonth = itemView.findViewById(R.id.calendar_event_month);
            vDay = itemView.findViewById(R.id.calendar_event_day);
        }
    }
}
