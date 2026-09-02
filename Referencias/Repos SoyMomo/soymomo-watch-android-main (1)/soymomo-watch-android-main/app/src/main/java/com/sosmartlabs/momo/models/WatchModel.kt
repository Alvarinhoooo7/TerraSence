package com.sosmartlabs.momo.models

sealed class WatchModel {
    abstract fun hasAmPmTime(): Boolean
    abstract fun hasAutoAnswer(): Boolean
    abstract fun hasBatterySaving(): Boolean
    abstract fun hasCustomApps(): Boolean
    abstract fun hasDialPad(): Boolean
    abstract fun hasImageMessage(): Boolean
    abstract fun hasLanguageSettings(): Boolean
    abstract fun hasTimeAndTimeZoneSettings(): Boolean
    abstract fun hasVibration(): Boolean
    abstract fun hasVideoCalls(): Boolean
    abstract fun hasVoice(): Boolean
    abstract fun hasChatGroups(): Boolean
}

data object Original : WatchModel() {
    override fun hasAmPmTime() = false
    override fun hasAutoAnswer() = true
    override fun hasBatterySaving() = false
    override fun hasCustomApps() = false
    override fun hasDialPad() = false
    override fun hasImageMessage() = false
    override fun hasLanguageSettings() = false
    override fun hasTimeAndTimeZoneSettings() = false
    override fun hasVibration() = true
    override fun hasVideoCalls() = false
    override fun hasVoice() = false
    override fun hasChatGroups() = false
}

data object H2OChile : WatchModel() {
    override fun hasAmPmTime() = false
    override fun hasAutoAnswer() = true
    override fun hasBatterySaving() = false
    override fun hasCustomApps() = false
    override fun hasDialPad() = false
    override fun hasImageMessage() = false
    override fun hasLanguageSettings() = false
    override fun hasTimeAndTimeZoneSettings() = true
    override fun hasVibration() = false
    override fun hasVideoCalls() = false
    override fun hasVoice() = true
    override fun hasChatGroups() = false
}

data object H2OSpain : WatchModel() {
    override fun hasAmPmTime() = false
    override fun hasAutoAnswer() = false
    override fun hasBatterySaving() = false
    override fun hasCustomApps() = false
    override fun hasDialPad() = false
    override fun hasImageMessage() = false
    override fun hasLanguageSettings() = false
    override fun hasTimeAndTimeZoneSettings() = true
    override fun hasVibration() = false
    override fun hasVideoCalls() = false
    override fun hasVoice() = true
    override fun hasChatGroups() = false
}

data object H2OEurope : WatchModel() {
    override fun hasAmPmTime() = false
    override fun hasAutoAnswer() = false
    override fun hasBatterySaving() = false
    override fun hasCustomApps() = false
    override fun hasDialPad() = false
    override fun hasImageMessage() = false
    override fun hasLanguageSettings() = true
    override fun hasTimeAndTimeZoneSettings() = true
    override fun hasVibration() = false
    override fun hasVideoCalls() = false
    override fun hasVoice() = true
    override fun hasChatGroups() = false
}

data object H2OChileAmPm : WatchModel() {
    override fun hasAmPmTime() = true
    override fun hasAutoAnswer() = true
    override fun hasBatterySaving() = false
    override fun hasCustomApps() = false
    override fun hasDialPad() = false
    override fun hasImageMessage() = false
    override fun hasLanguageSettings() = false
    override fun hasTimeAndTimeZoneSettings() = true
    override fun hasVibration() = false
    override fun hasVideoCalls() = false
    override fun hasVoice() = true
    override fun hasChatGroups() = false
}

data object Space1 : WatchModel() {
    override fun hasAmPmTime() = false
    override fun hasAutoAnswer() = false
    override fun hasBatterySaving() = true
    override fun hasCustomApps() = false
    override fun hasDialPad() = true
    override fun hasImageMessage() = true
    override fun hasLanguageSettings() = true
    override fun hasTimeAndTimeZoneSettings() = true
    override fun hasVibration() = false
    override fun hasVideoCalls() = true
    override fun hasVoice() = true
    override fun hasChatGroups() = false
}

data object Space2 : WatchModel() {
    override fun hasAmPmTime() = false
    override fun hasAutoAnswer() = false
    override fun hasBatterySaving() = true
    override fun hasCustomApps() = true
    override fun hasDialPad() = true
    override fun hasImageMessage() = true
    override fun hasLanguageSettings() = true
    override fun hasTimeAndTimeZoneSettings() = true
    override fun hasVibration() = true
    override fun hasVideoCalls() = true
    override fun hasVoice() = true
    override fun hasChatGroups() = false
}

data object Space3 : WatchModel() {
    override fun hasAmPmTime() = true
    override fun hasAutoAnswer() = false
    override fun hasBatterySaving() = true
    override fun hasCustomApps() = true
    override fun hasDialPad() = true
    override fun hasImageMessage() = true
    override fun hasLanguageSettings() = false
    override fun hasTimeAndTimeZoneSettings() = false
    override fun hasVibration() = true
    override fun hasVideoCalls() = true
    override fun hasVoice() = true
    override fun hasChatGroups() = false
}

data object Space4 : WatchModel() {
    override fun hasAmPmTime() = true
    override fun hasAutoAnswer() = false
    override fun hasBatterySaving() = true
    override fun hasCustomApps() = true
    override fun hasDialPad() = true
    override fun hasImageMessage() = true
    override fun hasLanguageSettings() = false
    override fun hasTimeAndTimeZoneSettings() = false
    override fun hasVibration() = true
    override fun hasVideoCalls() = true
    override fun hasVoice() = true
    override fun hasChatGroups() = true
}

/*
* Sub-models Lite
*/
data object Lite1 : WatchModel() {
    override fun hasAmPmTime() = true
    override fun hasAutoAnswer() = false
    override fun hasBatterySaving() = true
    override fun hasCustomApps() = false
    override fun hasDialPad() = false
    override fun hasImageMessage() = false
    override fun hasLanguageSettings() = true
    override fun hasTimeAndTimeZoneSettings() = true
    override fun hasVibration() = false
    override fun hasVideoCalls() = false
    override fun hasVoice() = true
    override fun hasChatGroups() = false
}
