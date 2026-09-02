package com.sosmartlabs.momo.chat.presentation.share

import androidx.annotation.StringRes
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.analytics.FirebaseAnalytics
import com.google.firebase.analytics.logEvent
import com.sosmartlabs.momo.R
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.supervisorScope
import timber.log.Timber
import javax.inject.Inject
import kotlin.coroutines.CoroutineContext

data class ChatPhotoShareUiState(
    val request: ChatPhotoShareRequest? = null,
    val selectedTemplate: ShareTemplate = ShareTemplate.ORIGINAL,
    val previews: Map<ShareTemplate, SharePreviewState> = ShareTemplate.all.associateWith {
        SharePreviewState.Loading
    },
    val isLoadingPreviews: Boolean = false,
    val isProcessing: Boolean = false,
    @param:StringRes @field:StringRes val previewErrorMessageResId: Int? = null,
    @param:StringRes @field:StringRes val errorMessageResId: Int? = null
) {
    val selectedPreviewState: SharePreviewState
        get() = previews[selectedTemplate] ?: SharePreviewState.Loading
}

sealed interface ChatPhotoShareEffect {
    data class LaunchShare(
        val target: ShareTarget,
        val exportedImage: ExportedSharePayload
    ) : ChatPhotoShareEffect

    data class CloseScreen(@param:StringRes @field:StringRes val messageResId: Int? = null) : ChatPhotoShareEffect
}

@HiltViewModel
class ChatPhotoShareViewModel @Inject constructor(
    private val ioContext: CoroutineContext,
    private val shareImageRenderer: ShareImageRenderer,
    private val shareFileManager: ShareFileManager,
    private val firebaseAnalytics: FirebaseAnalytics
) : ViewModel() {

    companion object {
        private const val SOURCE = "chat_share_button"
        private const val ERROR_RENDER_EXPORT = "render_export_failed"
        private const val ERROR_PREVIEW = "preview_failed"
        private const val ERROR_SAVE = "save_to_device_failed"
        private const val ERROR_SAVE_PERMISSION = "storage_permission_denied"
    }

    private val _uiState = MutableStateFlow(ChatPhotoShareUiState())
    val uiState: StateFlow<ChatPhotoShareUiState> = _uiState.asStateFlow()

    private val _effects = Channel<ChatPhotoShareEffect>(Channel.BUFFERED)
    val effects = _effects.receiveAsFlow()

    fun initialize(request: ChatPhotoShareRequest) {
        if (_uiState.value.request != null) return

        _uiState.value = ChatPhotoShareUiState(
            request = request,
            previews = ShareTemplate.all.associateWith { SharePreviewState.Loading },
            isLoadingPreviews = true
        )
        logScreenOpened()

        viewModelScope.launch(ioContext) {
            runCatching { shareFileManager.cleanupStaleCacheFiles() }

            supervisorScope {
                ShareTemplate.all.forEach { template ->
                    launch {
                        runCatching {
                            shareImageRenderer.renderPreview(request, template)
                        }.onSuccess { bitmap ->
                            _uiState.update { state ->
                                state.copy(
                                    previews = state.previews.toMutableMap().apply {
                                        put(template, SharePreviewState.Ready(bitmap))
                                    }
                                )
                            }
                        }.onFailure { throwable ->
                            Timber.e(throwable, "ChatPhotoShareViewModel: preview render failed for %s", template)
                            _uiState.update { state ->
                                state.copy(
                                    previews = state.previews.toMutableMap().apply {
                                        put(template, SharePreviewState.Failed)
                                    }
                                )
                            }
                        }
                    }
                }
            }

            val loadedPreviews = _uiState.value.previews.count { it.value is SharePreviewState.Ready }
            _uiState.update { state ->
                state.copy(
                    isLoadingPreviews = false,
                    previewErrorMessageResId = if (loadedPreviews == 0) {
                        logFailure(
                            target = null,
                            errorType = ERROR_PREVIEW,
                            template = state.selectedTemplate
                        )
                        R.string.chat_photo_share_error_preview
                    } else {
                        null
                    }
                )
            }
        }
    }

    fun onTemplateSelected(template: ShareTemplate) {
        if (_uiState.value.selectedTemplate == template) return
        _uiState.update { it.copy(selectedTemplate = template, errorMessageResId = null) }
        firebaseAnalytics.logEvent("chat_photo_template_selected") {
            param("template", template.analyticsValue())
            param("source", SOURCE)
        }
    }

    fun onGenericShareClicked() {
        exportForShare(ShareTarget.GENERIC)
    }

    fun onInstagramStoriesClicked() {
        exportForShare(ShareTarget.INSTAGRAM_STORIES)
    }

    fun onSaveToDeviceClicked() {
        val request = _uiState.value.request ?: return
        if (_uiState.value.isProcessing || _uiState.value.selectedPreviewState !is SharePreviewState.Ready) {
            return
        }
        val selectedTemplate = _uiState.value.selectedTemplate

        _uiState.update { it.copy(isProcessing = true, errorMessageResId = null) }

        firebaseAnalytics.logEvent("chat_photo_save_clicked") {
            param("template", selectedTemplate.analyticsValue())
            param("target_app", ShareTarget.SAVE_TO_DEVICE.analyticsValue())
            param("source", SOURCE)
        }

        viewModelScope.launch(ioContext) {
            runCatching {
                val exportedImage = exportSelectedTemplate(request, selectedTemplate)
                shareFileManager.saveToGallery(exportedImage.primaryImage)
            }.onSuccess {
                _uiState.update { state -> state.copy(isProcessing = false) }
                logCompleted(
                    target = ShareTarget.SAVE_TO_DEVICE,
                    template = selectedTemplate
                )
                _effects.send(ChatPhotoShareEffect.CloseScreen(messageResId = R.string.chat_photo_share_saved_success))
            }.onFailure { throwable ->
                Timber.e(throwable, "ChatPhotoShareViewModel: failed to save image to gallery")
                _uiState.update {
                    it.copy(
                        isProcessing = false,
                        errorMessageResId = R.string.chat_photo_share_error_save
                    )
                }
                logFailure(
                    target = ShareTarget.SAVE_TO_DEVICE,
                    errorType = ERROR_SAVE,
                    template = selectedTemplate
                )
            }
        }
    }

    fun onSavePermissionDenied() {
        _uiState.update {
            it.copy(errorMessageResId = R.string.chat_photo_share_error_storage_permission)
        }
        logFailure(
            target = ShareTarget.SAVE_TO_DEVICE,
            errorType = ERROR_SAVE_PERMISSION,
            template = _uiState.value.selectedTemplate
        )
    }

    fun onShareDispatched(target: ShareTarget, result: ShareDispatchResult) {
        if (result.success) {
            logCompleted(target = target, template = _uiState.value.selectedTemplate)
        } else {
            logFailure(
                target = target,
                errorType = result.errorType,
                template = _uiState.value.selectedTemplate
            )
            result.messageResId?.let { resId ->
                _uiState.update { state ->
                    state.copy(errorMessageResId = resId)
                }
            }
        }
    }

    override fun onCleared() {
        super.onCleared()
        shareImageRenderer.clearPreviewCache()
    }

    private fun exportForShare(target: ShareTarget) {
        val request = _uiState.value.request ?: return
        if (_uiState.value.isProcessing || _uiState.value.selectedPreviewState !is SharePreviewState.Ready) {
            return
        }
        val selectedTemplate = _uiState.value.selectedTemplate

        _uiState.update { it.copy(isProcessing = true, errorMessageResId = null) }

        firebaseAnalytics.logEvent("chat_photo_share_clicked") {
            param("template", selectedTemplate.analyticsValue())
            param("target_app", target.analyticsValue())
            param("source", SOURCE)
        }

        viewModelScope.launch(ioContext) {
            runCatching {
                exportSelectedTemplate(request, selectedTemplate)
            }.onSuccess { exportedImage ->
                _uiState.update { state -> state.copy(isProcessing = false) }
                _effects.send(
                    ChatPhotoShareEffect.LaunchShare(
                        target = target,
                        exportedImage = exportedImage
                    )
                )
            }.onFailure { throwable ->
                Timber.e(throwable, "ChatPhotoShareViewModel: failed to export image for %s", target)
                _uiState.update {
                    it.copy(
                        isProcessing = false,
                        errorMessageResId = R.string.chat_photo_share_error_generic
                    )
                }
                logFailure(
                    target = target,
                    errorType = ERROR_RENDER_EXPORT,
                    template = selectedTemplate
                )
            }
        }
    }

    private fun exportSelectedTemplate(
        request: ChatPhotoShareRequest,
        template: ShareTemplate
    ): ExportedSharePayload {
        val renderedImage = shareImageRenderer.renderFinal(request, template)
        return try {
            shareFileManager.exportRenderedImage(request, template, renderedImage)
        } finally {
            renderedImage.recycle()
        }
    }

    private fun logScreenOpened() {
        firebaseAnalytics.logEvent("chat_photo_share_opened") {
            param("template", ShareTemplate.ORIGINAL.analyticsValue())
            param("source", SOURCE)
        }
    }

    private fun logCompleted(target: ShareTarget, template: ShareTemplate) {
        firebaseAnalytics.logEvent("chat_photo_share_completed") {
            param("template", template.analyticsValue())
            param("target_app", target.analyticsValue())
            param("source", SOURCE)
            param("result", "success")
        }
    }

    private fun logFailure(
        target: ShareTarget?,
        errorType: String?,
        template: ShareTemplate
    ) {
        firebaseAnalytics.logEvent("chat_photo_share_failed") {
            param("template", template.analyticsValue())
            param("target_app", target?.analyticsValue() ?: "unknown")
            param("source", SOURCE)
            param("result", "failure")
            param("error_type", errorType ?: "unknown")
        }
    }
}
