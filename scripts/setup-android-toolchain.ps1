$ErrorActionPreference = 'Stop'

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$jdkRoot = Join-Path $projectRoot '.jdk'
$sdkRoot = Join-Path $projectRoot '.android-sdk'
$commandLineTools = Join-Path $sdkRoot 'cmdline-tools\latest\bin\sdkmanager.bat'

if (-not (Get-ChildItem -LiteralPath $jdkRoot -Filter javac.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1)) {
  New-Item -ItemType Directory -Path $jdkRoot -Force | Out-Null
  $jdkArchive = Join-Path $env:TEMP 'mindmitra-temurin-jdk21.zip'
  Write-Host 'Downloading Eclipse Temurin JDK 21...'
  Invoke-WebRequest -UseBasicParsing -Uri 'https://api.adoptium.net/v3/binary/latest/21/ga/windows/x64/jdk/hotspot/normal/eclipse' -OutFile $jdkArchive
  Expand-Archive -LiteralPath $jdkArchive -DestinationPath $jdkRoot -Force
  Remove-Item -LiteralPath $jdkArchive -Force
}

$javac = Get-ChildItem -LiteralPath $jdkRoot -Filter javac.exe -Recurse | Select-Object -First 1
if (-not $javac) { throw 'The JDK compiler was not found after extraction.' }
$env:JAVA_HOME = Split-Path (Split-Path $javac.FullName -Parent) -Parent
$env:Path = "$env:JAVA_HOME\bin;$env:Path"

if (-not (Test-Path -LiteralPath $commandLineTools)) {
  $toolsArchive = Join-Path $env:TEMP 'mindmitra-android-command-line-tools.zip'
  $toolsStage = Join-Path $sdkRoot 'cmdline-tools\staging'
  $toolsLatest = Join-Path $sdkRoot 'cmdline-tools\latest'
  New-Item -ItemType Directory -Path $toolsStage -Force | Out-Null
  New-Item -ItemType Directory -Path $toolsLatest -Force | Out-Null
  Write-Host 'Downloading Android command-line tools...'
  Invoke-WebRequest -UseBasicParsing -Uri 'https://dl.google.com/android/repository/commandlinetools-win-15859902_latest.zip' -OutFile $toolsArchive
  $actualHash = (Get-FileHash -LiteralPath $toolsArchive -Algorithm SHA256).Hash.ToLowerInvariant()
  $expectedHash = '90ae805d20434428bffcb699c290860f19bb5f66a67e6b330067e3de801fb04a'
  if ($actualHash -ne $expectedHash) { throw "Android tools checksum mismatch: $actualHash" }
  Expand-Archive -LiteralPath $toolsArchive -DestinationPath $toolsStage -Force
  Copy-Item -Path (Join-Path $toolsStage 'cmdline-tools\*') -Destination $toolsLatest -Recurse -Force
  Remove-Item -LiteralPath $toolsArchive -Force
}

$env:ANDROID_HOME = $sdkRoot
$env:ANDROID_SDK_ROOT = $sdkRoot
Write-Host 'Accepting Android SDK licenses required by the build...'
1..50 | ForEach-Object { 'y' } | & $commandLineTools --sdk_root=$sdkRoot --licenses | Out-Host
Write-Host 'Installing Android API 36 and build tools...'
& $commandLineTools --sdk_root=$sdkRoot 'platform-tools' 'platforms;android-36' 'build-tools;36.0.0'
if ($LASTEXITCODE -ne 0) { throw "sdkmanager failed with exit code $LASTEXITCODE." }

Write-Host "JAVA_HOME=$env:JAVA_HOME"
Write-Host "ANDROID_HOME=$env:ANDROID_HOME"
