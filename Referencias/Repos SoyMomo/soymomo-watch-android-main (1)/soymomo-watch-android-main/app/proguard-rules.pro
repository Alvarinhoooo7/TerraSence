# General ProGuard rules for retaining attributes
-keepattributes EnclosingMethod, InnerClasses, SourceFile, LineNumberTable, Signature, *Annotation*

# Keep public classes that extend java.lang.Exception
-keep public class * extends java.lang.Exception

# Parse SDK rules
-keep class com.parse.** { *; }
-keepnames class com.parse.** { *; }
-dontwarn com.parse.**
-keep @com.parse.ParseClassName class *
-keepclassmembers class * extends com.parse.ParseObject {
    <fields>;
    <methods>;
}

# Android support library rules (for legacy support)
-keep class android.support.** { *; }
-keep interface android.support.** { *; }
-dontwarn android.support.**

# Google Maps rules
-keep class com.google.android.gms.maps.** { *; }
-keep interface com.google.android.gms.maps.** { *; }

# OkHttp3 rules
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }
-dontwarn okhttp3.**

# Wootric rules
-keep class com.wootric.** { *; }

# Retrofit rules
-keep class retrofit.** { *; }
-keepclassmembernames interface * {
    @retrofit.http.* <methods>;
}

# Fragment navigation rules
-keepnames class androidx.navigation.fragment.NavHostFragment
-keep public class * extends androidx.fragment.app.Fragment {
    public <init>();
}

# WebRTC rules
-keep class org.webrtc.** { *; }
-keepclasseswithmembernames class * { native <methods>; }

# Parcelable implementations
-keep class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator *;
}

# Specific libraries and models used in the project
-keep class com.mikepenz.** { *; }
-keep class org.jetbrains.** { *; }
-keep class com.makeramen.** { *; }
-keep class com.androidplot.** { *; }
-keep class com.codemybrainsout.** { *; }
-keep class com.crashlytics.** { *; }
-dontwarn com.crashlytics.**
-keep class com.github.mikephil.charting.** { *; }

# =====================================================
# App Models - Parcelable support
# =====================================================
# Keep all model classes (they extend ParseObject which implements Parcelable)
# Using -keep instead of -keepnames to preserve full class structure for Parcelable
-keep class com.sosmartlabs.momo.models.** { *; }
-keepclassmembers class com.sosmartlabs.momo.models.** {
    public static final ** CREATOR;
    <fields>;
    <methods>;
}

# Keep videocall model classes
-keep class com.sosmartlabs.momo.videocall.model.** { *; }
-keepclassmembers class com.sosmartlabs.momo.videocall.model.** {
    public static final ** CREATOR;
    <fields>;
    <methods>;
}

# Ensure ParseObject subclasses maintain Parcelable functionality
-keepclassmembers class * extends com.parse.ParseObject {
    public static final ** CREATOR;
}

# GSON specific rules
-keepattributes Signature
-keepattributes *Annotation*
-dontwarn sun.misc.**
-keep class com.google.gson.** { *; }
-keep class * implements com.google.gson.TypeAdapterFactory
-keep class * implements com.google.gson.JsonSerializer
-keep class * implements com.google.gson.JsonDeserializer

# Keep the watchinfo model classes that are (de)serialized by Gson
-keep class com.sosmartlabs.momo.watchinfo.model.** { *; }
-keep class com.sosmartlabs.momo.watchinfo.model.jsonparse.** { *; }
-keepclassmembers class com.sosmartlabs.momo.watchinfo.model.jsonparse.InfoRaw { <fields>; }
-keepclassmembers class com.sosmartlabs.momo.watchinfo.model.jsonparse.InfoApp { <fields>; }

# WebRTC
-keep class com.cloudwebrtc.webrtc.** { *; }
-keep class org.webrtc.** { *; }
-keep class org.jni_zero.** { *; }

# =====================================================
# Push Notifications & Chat Messaging
# =====================================================
# Keep push notification classes and handlers
-keep class com.sosmartlabs.momo.pushnotifications.** { *; }
-keepclassmembers class com.sosmartlabs.momo.pushnotifications.** { *; }

# Keep chat notification data class
-keep class com.sosmartlabs.momo.pushnotifications.ui.chat.ChatNotificationMessage { *; }
-keep class com.sosmartlabs.momo.pushnotifications.ui.chat.ChatMessagingNotificationBuilder { *; }

# =====================================================
# AndroidX Core Notifications (MessagingStyle support)
# =====================================================
# Keep NotificationCompat and related classes for MessagingStyle notifications
-keep class androidx.core.app.NotificationCompat** { *; }
-keep class androidx.core.app.Person { *; }
-keep class androidx.core.app.Person$Builder { *; }
-keep class androidx.core.graphics.drawable.IconCompat { *; }
-keepclassmembers class androidx.core.app.NotificationCompat$MessagingStyle { *; }
-keepclassmembers class androidx.core.app.NotificationCompat$MessagingStyle$Message { *; }

# =====================================================
# Watch Models (sealed class with data objects)
# =====================================================
# Keep WatchModel sealed class and all data objects
-keep class com.sosmartlabs.momo.models.WatchModel { *; }
-keep class com.sosmartlabs.momo.models.Original { *; }
-keep class com.sosmartlabs.momo.models.H2OChile { *; }
-keep class com.sosmartlabs.momo.models.H2OSpain { *; }
-keep class com.sosmartlabs.momo.models.H2OEurope { *; }
-keep class com.sosmartlabs.momo.models.H2OChileAmPm { *; }
-keep class com.sosmartlabs.momo.models.Space1 { *; }
-keep class com.sosmartlabs.momo.models.Space2 { *; }
-keep class com.sosmartlabs.momo.models.Space3 { *; }
-keep class com.sosmartlabs.momo.models.Space4 { *; }
-keep class com.sosmartlabs.momo.models.Lite1 { *; }

# =====================================================
# Parse SDK - Additional rules for Kotlin delegates
# =====================================================
# Keep Parse Kotlin extension delegates
-keep class com.parse.ktx.delegates.** { *; }
-keepclassmembers class * {
    @com.parse.ktx.delegates.* <fields>;
}

# =====================================================
# Firebase Cloud Messaging
# =====================================================
-keep class com.google.firebase.messaging.** { *; }
-keep class com.parse.fcm.** { *; }
-dontwarn com.google.firebase.messaging.**

# =====================================================
# Kotlin support
# =====================================================
# Keep Kotlin metadata for reflection
-keep class kotlin.Metadata { *; }
-keepclassmembers class kotlin.Metadata {
    public <methods>;
}

# =====================================================
# Google Places support
# =====================================================
-keep class com.google.maps.** { *; }
-keep class com.google.android.libraries.places.internal.** { <init>(); }