$ErrorActionPreference = 'Stop'

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$jdkRoot = Join-Path $projectRoot '.jdk'
$sdkRoot = Join-Path $projectRoot '.android-sdk'
$javac = Get-ChildItem -LiteralPath $jdkRoot -Filter javac.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1

if (-not $javac) { throw 'JDK not found. Run scripts/setup-android-toolchain.ps1 first.' }
if (-not (Test-Path -LiteralPath (Join-Path $sdkRoot 'platforms\android-36'))) { throw 'Android API 36 not found. Run scripts/setup-android-toolchain.ps1 first.' }

$env:JAVA_HOME = Split-Path (Split-Path $javac.FullName -Parent) -Parent
$env:ANDROID_HOME = $sdkRoot
$env:ANDROID_SDK_ROOT = $sdkRoot
$env:GRADLE_USER_HOME = Join-Path $projectRoot '.gradle-cache'
$env:Path = "$env:JAVA_HOME\bin;$sdkRoot\platform-tools;$env:Path"

$buildTools = Join-Path $sdkRoot 'build-tools\36.0.0'
$androidJar = Join-Path $sdkRoot 'platforms\android-36\android.jar'
$nativeRoot = Join-Path $projectRoot 'native-android'
$nativeBuild = Join-Path $nativeRoot 'build'
$resourceDirectory = Join-Path $nativeRoot 'res'
$drawableDirectory = Join-Path $resourceDirectory 'drawable'
$androidAssets = Join-Path $projectRoot 'android\app\src\main\assets'
$classesDirectory = Join-Path $nativeBuild 'classes'
$dexDirectory = Join-Path $nativeBuild 'dex'
$compiledResources = Join-Path $nativeBuild 'compiled-res.zip'
$unsignedApk = Join-Path $nativeBuild 'MindMitra-unsigned.apk'
$alignedApk = Join-Path $nativeBuild 'MindMitra-aligned.apk'
$classesJar = Join-Path $nativeBuild 'classes.jar'
$classesDex = Join-Path $nativeBuild 'classes.dex'
$compilerAndroidJar = Join-Path $nativeBuild 'android-36-compiler.jar'
$assetStageRoot = Join-Path $nativeBuild 'apk-assets'
$releaseDirectory = Join-Path $projectRoot 'releases'
$versionCode = 4
$versionName = '1.3'
$releaseApk = Join-Path $releaseDirectory "MindMitra-$versionName-debug.apk"
$keyStoreDirectory = Join-Path $projectRoot '.android-debug'
$keyStore = Join-Path $keyStoreDirectory 'mindmitra-debug.keystore'

Push-Location $projectRoot
try {
  & npm.cmd run mobile:build
  if ($LASTEXITCODE -ne 0) { throw 'The mobile web build failed.' }
  & npx.cmd cap sync android
  if ($LASTEXITCODE -ne 0) { throw 'Capacitor sync failed.' }
  & npm.cmd run android:assets
  if ($LASTEXITCODE -ne 0) { throw 'Android asset generation failed.' }

  New-Item -ItemType Directory -Path $nativeBuild -Force | Out-Null
  New-Item -ItemType Directory -Path $classesDirectory -Force | Out-Null
  New-Item -ItemType Directory -Path $dexDirectory -Force | Out-Null
  New-Item -ItemType Directory -Path $drawableDirectory -Force | Out-Null
  New-Item -ItemType Directory -Path $releaseDirectory -Force | Out-Null
  New-Item -ItemType Directory -Path $keyStoreDirectory -Force | Out-Null
  Copy-Item -LiteralPath (Join-Path $projectRoot 'public\icon-512.png') -Destination (Join-Path $drawableDirectory 'ic_launcher.png') -Force

  foreach ($artifact in @($compiledResources, $unsignedApk, $alignedApk, $classesJar, $classesDex, $releaseApk)) {
    if (Test-Path -LiteralPath $artifact) { Remove-Item -LiteralPath $artifact -Force }
  }
  Copy-Item -LiteralPath $androidJar -Destination $compilerAndroidJar -Force

  & (Join-Path $buildTools 'aapt2.exe') compile --dir $resourceDirectory -o $compiledResources
  if ($LASTEXITCODE -ne 0) { throw 'Android resource compilation failed.' }
  & (Join-Path $buildTools 'aapt2.exe') link -o $unsignedApk -I $androidJar --manifest (Join-Path $nativeRoot 'AndroidManifest.xml') --min-sdk-version 24 --target-sdk-version 36 --version-code $versionCode --version-name $versionName $compiledResources
  if ($LASTEXITCODE -ne 0) { throw 'Android package linking failed.' }

  & (Join-Path $env:JAVA_HOME 'bin\javac.exe') -encoding UTF-8 -source 17 -target 17 -classpath $compilerAndroidJar -d $classesDirectory (Join-Path $nativeRoot 'src\com\mindmitra\app\MainActivity.java')
  if ($LASTEXITCODE -ne 0) { throw 'Native Android activity compilation failed.' }
  & (Join-Path $env:JAVA_HOME 'bin\jar.exe') cf $classesJar -C $classesDirectory .
  if ($LASTEXITCODE -ne 0) { throw 'Native Android class packaging failed.' }
  & (Join-Path $buildTools 'd8.bat') --lib $compilerAndroidJar --min-api 24 --output $dexDirectory $classesJar
  if ($LASTEXITCODE -ne 0) { throw 'Android DEX compilation failed.' }
  Copy-Item -LiteralPath (Join-Path $dexDirectory 'classes.dex') -Destination $classesDex -Force

  $normalizedStage = [System.IO.Path]::GetFullPath($assetStageRoot)
  $normalizedBuild = [System.IO.Path]::GetFullPath($nativeBuild) + [System.IO.Path]::DirectorySeparatorChar
  if (-not $normalizedStage.StartsWith($normalizedBuild, [System.StringComparison]::OrdinalIgnoreCase)) { throw 'Refusing to prepare assets outside the native build directory.' }
  if (Test-Path -LiteralPath $assetStageRoot) { Remove-Item -LiteralPath $assetStageRoot -Recurse -Force }
  New-Item -ItemType Directory -Path (Join-Path $assetStageRoot 'assets') -Force | Out-Null
  Copy-Item -Path (Join-Path $androidAssets '*') -Destination (Join-Path $assetStageRoot 'assets') -Recurse -Force
  Copy-Item -LiteralPath $classesDex -Destination (Join-Path $assetStageRoot 'classes.dex') -Force

  Push-Location $assetStageRoot
  try {
    $apkEntries = Get-ChildItem -LiteralPath $assetStageRoot -Recurse -File | ForEach-Object {
      $_.FullName.Substring($assetStageRoot.Length + 1).Replace('\', '/')
    }
    & (Join-Path $buildTools 'aapt.exe') add $unsignedApk @apkEntries
    if ($LASTEXITCODE -ne 0) { throw 'Adding app bytecode to the APK failed.' }
  } finally {
    Pop-Location
  }

  & (Join-Path $buildTools 'zipalign.exe') -f 4 $unsignedApk $alignedApk
  if ($LASTEXITCODE -ne 0) { throw 'APK alignment failed.' }

  if (-not (Test-Path -LiteralPath $keyStore)) {
    & (Join-Path $env:JAVA_HOME 'bin\keytool.exe') -genkeypair -noprompt -keystore $keyStore -alias androiddebugkey -storepass android -keypass android -dname 'CN=Android Debug,O=Android,C=US' -keyalg RSA -keysize 2048 -validity 10000
    if ($LASTEXITCODE -ne 0) { throw 'Debug signing key creation failed.' }
  }

  & (Join-Path $buildTools 'apksigner.bat') sign --ks $keyStore --ks-key-alias androiddebugkey --ks-pass pass:android --key-pass pass:android --out $releaseApk $alignedApk
  if ($LASTEXITCODE -ne 0) { throw 'APK signing failed.' }
  & (Join-Path $buildTools 'apksigner.bat') verify --verbose --print-certs $releaseApk
  if ($LASTEXITCODE -ne 0) { throw 'APK signature verification failed.' }
  & (Join-Path $buildTools 'aapt.exe') dump badging $releaseApk | Select-Object -First 5 | Out-Host
  Write-Host "APK=$releaseApk"
} finally {
  Pop-Location
}
