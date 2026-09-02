package com.sosmartlabs.momotabletpadres.di.module

import android.content.Context
import com.sosmartlabs.momotabletpadres.appicon.AppIconRepository
import com.sosmartlabs.momotabletpadres.contacts.repository.AllowedNumbersRepository
import com.sosmartlabs.momotabletpadres.contacts.repository.ContactsRepository
import com.sosmartlabs.momotabletpadres.appinfo.AppInfoRepository
import com.sosmartlabs.momotabletpadres.appinfo.model.remote.ParseAppInfoDataSource
import com.sosmartlabs.momotabletpadres.core.common.dug.detectedconversation.model.DetectedConversationsRepository
import com.sosmartlabs.momotabletpadres.encryption.EncryptionHelper
import com.sosmartlabs.momotabletpadres.core.common.dug.detectedconversation.model.remote.ParseDetectedConversationDataSource
import com.sosmartlabs.momotabletpadres.core.common.dug.explicitmusic.model.ExplicitMusicRepository
import com.sosmartlabs.momotabletpadres.core.common.dug.explicitmusic.model.remote.ParseExplicitMusicDataSource
import com.sosmartlabs.momotabletpadres.core.common.dug.smartdetection.model.SmartDetectionRepository
import com.sosmartlabs.momotabletpadres.core.common.dug.smartdetection.model.remote.ParseSmartDetectionDataSource
import com.sosmartlabs.momotabletpadres.core.common.dug.unsafesearch.UnsafeSearchRepository
import com.sosmartlabs.momotabletpadres.core.common.dug.unsafesearch.model.adulttitle.AdultTitleRepository
import com.sosmartlabs.momotabletpadres.core.common.dug.unsafesearch.model.adulttitle.remote.ParseAdultTitleDataSource
import com.sosmartlabs.momotabletpadres.core.common.dug.unsafesearch.model.dangerousinfluencer.DangerousInfluencerRepository
import com.sosmartlabs.momotabletpadres.core.common.dug.unsafesearch.model.dangerousinfluencer.remote.ParseDangerousInfluencerDataSource
import com.sosmartlabs.momotabletpadres.core.common.dug.unsafesearch.model.dangerousviral.DangerousViralRepository
import com.sosmartlabs.momotabletpadres.core.common.dug.unsafesearch.model.dangerousviral.remote.ParseDangerousViralDataSource
import com.sosmartlabs.momotabletpadres.core.common.dug.unsafesearch.model.remote.ParseUnsafeSearchDataSource
import com.sosmartlabs.momotabletpadres.core.settings.dug.common.model.DugFeaturesRepository
import com.sosmartlabs.momotabletpadres.models.mapper.AdBlockerSettingsToEntityMapper
import com.sosmartlabs.momotabletpadres.models.mapper.BlockedAdsHistoryMapper
import com.sosmartlabs.momotabletpadres.models.mapper.SchoolModeSettingsToEntityMapper
import com.sosmartlabs.momotabletpadres.models.mapper.UserToEntityMapper
import com.sosmartlabs.momotabletpadres.repositories.AppStatsRepository
import com.sosmartlabs.momotabletpadres.repositories.RemoteScreenshotRepository
import com.sosmartlabs.momotabletpadres.repositories.RequestTimeRepository
import com.sosmartlabs.momotabletpadres.tabletsettings.times.usetime.UseTimeRepository
import com.sosmartlabs.momotabletpadres.repositories.WebsitesRepository
import com.sosmartlabs.momotabletpadres.repositories.adblocker.AdBlockerSettingsRepository
import com.sosmartlabs.momotabletpadres.repositories.adblocker.BlockedAdsHistoryRepository
import com.sosmartlabs.momotabletpadres.repositories.adblocker.api.AdBlockerSettingsParseAPI
import com.sosmartlabs.momotabletpadres.repositories.adblocker.api.BlockedAdsHistoryParseAPI
import com.sosmartlabs.momotabletpadres.dispatch.repository.FcmRepository
import com.sosmartlabs.momotabletpadres.dispatch.repository.GcmSenderKeyRepository
import com.sosmartlabs.momotabletpadres.dispatch.repository.ParseConfigRepository
import com.sosmartlabs.momotabletpadres.dispatch.repository.ParseInstallationRepository
import com.sosmartlabs.momotabletpadres.dispatch.repository.SharedPreferencesRepository
import com.sosmartlabs.momotabletpadres.tabletsettings.times.schoolmode.SchoolModeSettingsRepository
import com.sosmartlabs.momotabletpadres.tabletsettings.times.schoolmode.api.SchoolModeSettingsParseAPI
import com.sosmartlabs.momotabletpadres.tablet.TabletRepository
import com.sosmartlabs.momotabletpadres.tablet.api.TabletParseAPI
import com.sosmartlabs.momotabletpadres.repositories.user.UserRepository
import com.sosmartlabs.momotabletpadres.repositories.user.api.UserParseAPI
import com.sosmartlabs.momotabletpadres.tabletsettings.appprotection.model.installedapp.InstalledAppsRepository
import com.sosmartlabs.momotabletpadres.tabletsettings.appprotection.model.installedapp.remote.ParseInstalledAppDataSource
import com.sosmartlabs.momotabletpadres.utils.exception.DebugExceptionHandler
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object RepositoryModule {
    @Provides
    @Singleton
    fun provideAppStatsRepository(@ApplicationContext context: Context): AppStatsRepository {
        return AppStatsRepository(context)
    }

    @Provides
    @Singleton
    fun provideRemoteScreenshotRepository(@ApplicationContext context: Context): RemoteScreenshotRepository {
        return RemoteScreenshotRepository(context)
    }

    @Provides
    @Singleton
    fun provideWebsitesRepository(@ApplicationContext context: Context): WebsitesRepository {
        return WebsitesRepository(context)
    }

    @Provides
    @Singleton
    fun provideUseTimeRepository(@ApplicationContext context: Context): UseTimeRepository {
        return UseTimeRepository(context)
    }

    @Provides
    @Singleton
    fun provideContactsRepository(@ApplicationContext context: Context): ContactsRepository {
        return ContactsRepository(context)
    }

    @Provides
    @Singleton
    fun provideAllowedNumbersRepository(@ApplicationContext context: Context): AllowedNumbersRepository {
        return AllowedNumbersRepository(context)
    }

    @Provides
    @Singleton
    fun provideRequestTimeRepository(): RequestTimeRepository {
        return RequestTimeRepository()
    }

    @Provides
    @Singleton
    fun provideInstalledAppsRepository(
        parseInstalledAppDataSource: ParseInstalledAppDataSource,
        schoolModeSettingsRepository: SchoolModeSettingsRepository
    ): InstalledAppsRepository {
        return InstalledAppsRepository(parseInstalledAppDataSource, schoolModeSettingsRepository)
    }

    @Provides
    @Singleton
    fun provideAppInfoRepository(
        parseAppInfoDataSource: ParseAppInfoDataSource
    ): AppInfoRepository {
        return AppInfoRepository(parseAppInfoDataSource)
    }

    @Provides
    @Singleton
    fun provideParseAppInfoDataSource(
        @ApplicationContext context: Context
    ): ParseAppInfoDataSource {
        return ParseAppInfoDataSource(context)
    }

    @Provides
    @Singleton
    fun provideUserRepository(
        userParseAPI: UserParseAPI
    ): UserRepository {
        return UserRepository(userParseAPI)
    }

    @Provides
    @Singleton
    fun provideUserParseAPI(
        mapper: UserToEntityMapper
    ): UserParseAPI {
        return UserParseAPI(mapper)
    }

    @Provides
    @Singleton
    fun provideTabletRepository(
        tabletParseAPI: TabletParseAPI
    ): TabletRepository {
        return TabletRepository(tabletParseAPI)
    }

    @Provides
    @Singleton
    fun provideTabletParseAPI(
        debugExceptionHandler: DebugExceptionHandler,
        encryptionHelper: EncryptionHelper
    ): TabletParseAPI {
        return TabletParseAPI(debugExceptionHandler, encryptionHelper)
    }

    @Provides
    @Singleton
    fun provideSchoolModeSettingsRepository(
        parseAPI: SchoolModeSettingsParseAPI
    ): SchoolModeSettingsRepository {
        return SchoolModeSettingsRepository(parseAPI)
    }

    @Provides
    @Singleton
    fun provideSchoolModeSettingsParseAPI(
        tabletParseAPI: TabletParseAPI,
        mapper: SchoolModeSettingsToEntityMapper,
        deh: DebugExceptionHandler
    ): SchoolModeSettingsParseAPI {
        return SchoolModeSettingsParseAPI(tabletParseAPI, mapper, deh)
    }

    @Provides
    @Singleton
    fun provideFcmRepository(): FcmRepository {
        return FcmRepository()
    }

    @Provides
    @Singleton
    fun provideGcmSenderKeyRepository(): GcmSenderKeyRepository {
        return GcmSenderKeyRepository()
    }

    @Provides
    @Singleton
    fun provideParseConfigRepository(): ParseConfigRepository {
        return ParseConfigRepository()
    }

    @Provides
    @Singleton
    fun provideParseInstallationRepository(): ParseInstallationRepository {
        return ParseInstallationRepository()
    }

    @Provides
    @Singleton
    fun provideSharedPreferencesRepository(@ApplicationContext context: Context): SharedPreferencesRepository {
        return SharedPreferencesRepository(context)
    }

    @Provides
    @Singleton
    fun provideAdBlockerSettingsRepository(
        parseAPI: AdBlockerSettingsParseAPI,
        tabletRepository: TabletRepository,
        deh: DebugExceptionHandler
    ): AdBlockerSettingsRepository {
        return AdBlockerSettingsRepository(parseAPI, tabletRepository, deh)
    }

    @Provides
    @Singleton
    fun provideAdBlockerSettingsParseAPI(
        tabletParseAPI: TabletParseAPI,
        mapper: AdBlockerSettingsToEntityMapper,
        deh: DebugExceptionHandler
    ): AdBlockerSettingsParseAPI {
        return AdBlockerSettingsParseAPI(tabletParseAPI, mapper, deh)
    }

    @Provides
    @Singleton
    fun provideBlockedAdsHistoryParseAPI(
        mapper: BlockedAdsHistoryMapper,
        deh: DebugExceptionHandler
    ): BlockedAdsHistoryParseAPI {
        return BlockedAdsHistoryParseAPI(mapper, deh)
    }

    @Provides
    @Singleton
    fun provideBlockedAdsHistoryRepository(
        parseAPI: BlockedAdsHistoryParseAPI,
        appIconRepository: AppIconRepository
    ): BlockedAdsHistoryRepository {
        return BlockedAdsHistoryRepository(parseAPI, appIconRepository)
    }

    @Provides
    @Singleton
    fun provideDugFeaturesRepository(
        @ApplicationContext context: Context
    ): DugFeaturesRepository {
        return DugFeaturesRepository(context)
    }

    @Provides
    @Singleton
    fun provideDetectedConversationsRepository(
        detectedConversationDataSource: ParseDetectedConversationDataSource
    ): DetectedConversationsRepository {
        return DetectedConversationsRepository(detectedConversationDataSource)
    }

    @Provides
    @Singleton
    fun provideParseDetectedConversationDataSource(): ParseDetectedConversationDataSource {
        return ParseDetectedConversationDataSource()
    }

    @Provides
    @Singleton
    fun provideExplicitMusicRepository(
        parseExplicitMusicDataSource: ParseExplicitMusicDataSource
    ): ExplicitMusicRepository {
        return ExplicitMusicRepository(parseExplicitMusicDataSource)
    }

    @Provides
    @Singleton
    fun provideParseExplicitMusicDataSource(): ParseExplicitMusicDataSource {
        return ParseExplicitMusicDataSource()
    }

    @Provides
    @Singleton
    fun provideSmartDetectionRepository(
        parseSmartDetectionDataSource: ParseSmartDetectionDataSource
    ): SmartDetectionRepository {
        return SmartDetectionRepository(parseSmartDetectionDataSource)
    }

    @Provides
    @Singleton
    fun provideParseSmartDetectionDataSource(): ParseSmartDetectionDataSource {
        return ParseSmartDetectionDataSource()
    }

    @Provides
    @Singleton
    fun provideUnsafeSearchRepository(
        parseUnsafeSearchDataSource: ParseUnsafeSearchDataSource
    ): UnsafeSearchRepository {
        return UnsafeSearchRepository(parseUnsafeSearchDataSource)
    }

    @Provides
    @Singleton
    fun provideParseUnsafeSearchDataSource(): ParseUnsafeSearchDataSource {
        return ParseUnsafeSearchDataSource()
    }

    @Provides
    @Singleton
    fun provideAdultTitleRepository(
        parseAdultTitleDataSource: ParseAdultTitleDataSource
    ): AdultTitleRepository {
        return AdultTitleRepository(parseAdultTitleDataSource)
    }

    @Provides
    @Singleton
    fun provideParseAdultTitleDataSource(): ParseAdultTitleDataSource {
        return ParseAdultTitleDataSource()
    }

    @Provides
    @Singleton
    fun provideDangerousInfluencerRepository(
        parseDangerousInfluencerDataSource: ParseDangerousInfluencerDataSource
    ): DangerousInfluencerRepository {
        return DangerousInfluencerRepository(parseDangerousInfluencerDataSource)
    }

    @Provides
    @Singleton
    fun provideParseDangerousInfluencerDataSource(): ParseDangerousInfluencerDataSource {
        return ParseDangerousInfluencerDataSource()
    }

    @Provides
    @Singleton
    fun provideDangerousViralRepository(
        parseDangerousViralDataSource: ParseDangerousViralDataSource
    ): DangerousViralRepository {
        return DangerousViralRepository(parseDangerousViralDataSource)
    }

    @Provides
    @Singleton
    fun provideParseDangerousViralDataSource(): ParseDangerousViralDataSource {
        return ParseDangerousViralDataSource()
    }
}