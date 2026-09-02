package com.sosmartlabs.momotabletpadres.di.module

import javax.inject.Qualifier

/**
 * Annotation for provide default coroutine dispatcher with Hilt
 */
@Retention(AnnotationRetention.RUNTIME)
@Qualifier
annotation class DefaultDispatcher

/**
 * Annotation for provide IO coroutine dispatcher with Hilt
 */
@Retention(AnnotationRetention.RUNTIME)
@Qualifier
annotation class IoDispatcher

/**
 * Annotation for provide main (UI) thread coroutine dispatcher with Hilt
 */
@Retention(AnnotationRetention.RUNTIME)
@Qualifier
annotation class MainDispatcher

/**
 * Annotation for provide main (UI) thread coroutine dispatcher that executes immediately with Hilt
 */
@Retention(AnnotationRetention.BINARY)
@Qualifier
annotation class MainImmediateDispatcher