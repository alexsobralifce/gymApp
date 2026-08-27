#!/usr/bin/env bash
set -e

# Define ANDROID_HOME se não estiver definido
if [ -z "$ANDROID_HOME" ]; then
  if [ -d "$HOME/Library/Android/sdk" ]; then
    export ANDROID_HOME="$HOME/Library/Android/sdk"
  fi
fi

# Detecta JDK compatível com Gradle (Java 17 ou 21 do Android Studio)
if [ -d "/Applications/Android Studio.app/Contents/jbr/Contents/Home" ]; then
  export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
fi

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "🔨 Compilando APK e AAB com Gradle..."
./gradlew assembleRelease bundleRelease

echo "📦 Copiando artefatos gerados..."
cp app/build/outputs/apk/release/app-release.apk ./endorfinapp-release.apk
cp app/build/outputs/bundle/release/app-release.aab ./endorfinapp-release.aab
cp app/build/outputs/apk/release/app-release.apk ../../apps/web/public/endorfinapp.apk

echo "✅ Build concluído com sucesso!"
echo "👉 APK: $DIR/endorfinapp-release.apk"
echo "👉 AAB (Play Store): $DIR/endorfinapp-release.aab"
echo "👉 Public APK: ../../apps/web/public/endorfinapp.apk"
