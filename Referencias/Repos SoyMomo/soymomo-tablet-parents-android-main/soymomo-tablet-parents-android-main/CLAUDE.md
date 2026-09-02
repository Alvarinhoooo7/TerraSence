# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

SoyMomo Tablet Parents — Android parental control app for SoyMomo tablets. Single-module Kotlin project using Gradle (Groovy DSL).

## Build & Run

```bash
./gradlew assembleDebug          # Build debug APK
./gradlew assembleRelease        # Build release APK (requires signing config in local.properties)
./gradlew lint                   # Run Android lint
./gradlew test                   # Run unit tests
```

Run `./gradlew lint` and `./gradlew assembleDebug` before marking work done to catch issues early.

## Environment Setup

Requires `local.properties` (gitignored) with:
- Signing credentials: `soymomoStoreFileLocal`, `soymomoStorePasswordLocal`, `soymomoTabletKeyAliasLocal`, `soymomoTabletKeyPasswordLocal`
- Parse backend keys: `SOYMOMO_TABLET_PARSE_APPLICATION_ID_*`, `SOYMOMO_TABLET_PARSE_CLIENT_KEY_*`, `SOYMOMO_TABLET_PARSE_REQUEST_URL_*`
- GitHub Maven credentials: `SoyMomoProjectPackagePermissionUser`, `SoyMomoProjectPackagePermissionToken`

## Architecture

- **Pattern**: MVVM with Repository pattern
- **DI**: Hilt (Dagger)
- **Navigation**: Jetpack Navigation Component with SafeArgs
- **Backend**: Parse SDK (Back4App)
- **View layer**: View Binding + Data Binding (no Compose)
- **Async**: RxJava 2
- **Logging**: Timber

## Git Conventions

- Branch prefixes: `feat/`, `fix/`, `chore/`, `refactor/`
- Commit messages follow conventional commits: `feat(scope): description`, `fix(scope): description`, etc.

## Code Style

- Kotlin with official code style (set in `gradle.properties`)
- Java 17 source/target compatibility
- Kotlin JVM target 17

## Key Decisions

- When making architectural decisions, explain the tradeoffs between approaches.
- ProGuard is enabled for release builds — add keep rules in `app/proguard-rules.pro` when introducing new libraries that use reflection.
- The app uses both Glide and Picasso for image loading — prefer Glide for new code.
