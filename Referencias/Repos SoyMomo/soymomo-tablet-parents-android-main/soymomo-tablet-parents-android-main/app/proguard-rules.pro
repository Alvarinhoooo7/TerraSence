# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

-keepattributes *Annotation*
-keepattributes SourceFile,LineNumberTable
-keep public class * extends java.lang.Exception

# For faster builds with ProGuard, exclude Crashlytics
-keep class com.crashlytics.** { *; }
-dontwarn com.crashlytics.**

# Gson uses generic type information stored in a class file when working with fields. Proguard
# removes such information by default, so configure it to keep all of it.
-keepattributes Signature

# Gson specific classes
-keep class sun.misc.Unsafe { *; }
#-keep class com.google.gson.stream.** { *; }

# Application classes that will be serialized/deserialized over Gson
-keep class com.sosmartlabs.momotabletpadres.** { *; }
-keep class com.sosmartlabs.momotablet.** { *; }

# Prevent proguard from stripping interface information from TypeAdapter, TypeAdapterFactory,
# JsonSerializer, JsonDeserializer instances (so they can be used in @JsonAdapter)
-keep class * extends com.google.gson.TypeAdapter
-keep class * implements com.google.gson.TypeAdapterFactory
-keep class * implements com.google.gson.JsonSerializer
-keep class * implements com.google.gson.JsonDeserializer

# Prevent R8 from leaving Data object members always null
-keepclassmembers,allowobfuscation class * {
  @com.google.gson.annotations.SerializedName <fields>;
}

-keep class * extends androidx.fragment.app.Fragment{}

-keep class com.parse.** { *; }
-keepnames class com.parse.** { *; }

-keep class com.androidplot.** { *; }

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

# Google Places SDK
# Fixes runtime crash under R8/minify:
# java.util.ServiceConfigurationError: Provider com.google.android.libraries.places.internal.* could not be instantiated
-keep class com.google.android.libraries.places.** { *; }
-dontwarn com.google.android.libraries.places.**

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
-keepnames class com.sosmartlabs.momo.models.*
-keepnames class com.sosmartlabs.momo.videocall.model.*

# Hilt (release/minify) - keep internal manager classes used by generated code
-keep class dagger.hilt.android.internal.managers.** { *; }
-keep class dagger.hilt.android.internal.lifecycle.** { *; }
-keep class dagger.hilt.internal.** { *; }
-dontwarn dagger.hilt.internal.**