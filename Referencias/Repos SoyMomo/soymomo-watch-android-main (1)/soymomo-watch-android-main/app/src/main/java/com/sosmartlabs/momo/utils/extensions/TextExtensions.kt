package com.sosmartlabs.momo.utils.extensions

import android.os.Build
import android.text.Html
import android.widget.TextView

fun TextView.setHtmlText() {
    text = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
        Html.fromHtml(text.toString(), Html.FROM_HTML_MODE_LEGACY);
    } else {
        Html.fromHtml(text.toString());
    }
}

