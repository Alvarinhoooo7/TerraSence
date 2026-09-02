package com.sosmartlabs.momo.calendarevent.ui;

import com.parse.ParseObject;

/**
 * @author mrgcl
 */

public interface CalendarEventListener {
    void setTitle(String title);
    ParseObject getWearer();
    ParseObject getSelectedEvent();
    void editEvent(ParseObject event);
    void onEditedEvent();
}
