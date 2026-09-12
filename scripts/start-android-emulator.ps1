param([string]$SdkRoot = 'D:\Android\Sdk', [int]$Port = 8081)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$avdHome = Join-Path $projectRoot 'tmp\android-avd'
$logRoot = Join-Path $projectRoot 'tmp\hive-ux'
$tempRoot = Join-Path $projectRoot 'tmp\android-temp'
foreach ($folder in @($avdHome, $logRoot, $tempRoot)) {
    New-Item -ItemType Directory -Force -Path $folder | Out-Null
}
$env:ANDROID_HOME = $SdkRoot
$env:ANDROID_SDK_ROOT = $SdkRoot
$env:ANDROID_AVD_HOME = $avdHome
$env:TEMP = $tempRoot
$env:TMP = $tempRoot
$env:REACT_NATIVE_PACKAGER_HOSTNAME = '127.0.0.1'
$env:EXPO_NO_TELEMETRY = '1'
$env:__UNSAFE_EXPO_HOME_DIRECTORY = Join-Path $projectRoot 'tmp\expo-home'
Remove-Item Env:CI -ErrorAction SilentlyContinue
$adb = Join-Path $SdkRoot 'platform-tools\adb.exe'
$emulator = Join-Path $SdkRoot 'emulator\emulator.exe'
if (!(Test-Path -LiteralPath $adb) -or !(Test-Path -LiteralPath $emulator)) {
    throw "Android SDK not found in $SdkRoot"
}
if (!(Test-Path -LiteralPath (Join-Path $avdHome 'Webee_API_36.ini'))) {
    throw "Webee_API_36 AVD not found in $avdHome"
}

function Find-WebeeDevice {
    $lines = & $adb devices
    foreach ($line in $lines) {
        if ($line -match '^(emulator-\d+)\s+device\b') {
            $serial = $Matches[1]
            $name = (& $adb -s $serial emu avd name 2>$null | Select-Object -First 1)
            if ($name -eq 'Webee_API_36') { return $serial }
        }
    }
    return $null
}

$device = Find-WebeeDevice
if (!$device) {
    $running = Get-CimInstance Win32_Process -Filter "name='qemu-system-x86_64.exe'" |
        Where-Object { $_.CommandLine -match '\bWebee_API_36\b' }
    if (!$running) {
        Write-Host 'Starting Webee Android emulator...'
        Start-Process -FilePath $emulator -ArgumentList @('-avd', 'Webee_API_36', '-memory', '2048', '-no-boot-anim', '-gpu', 'auto') |
            Out-Null
    }
}

$serverUrl = "http://127.0.0.1:$Port"
try { $status = Invoke-WebRequest "$serverUrl/status" -UseBasicParsing -TimeoutSec 3 } catch { $status = $null }
if (!$status) {
    $node = (Get-Command node.exe).Source
    Write-Host 'Starting Expo Go development server...'
    Start-Process -FilePath $node -ArgumentList @('node_modules\expo\bin\cli', 'start', '--go', '--host', 'lan', '--port', "$Port", '--max-workers', '1') `
        -WorkingDirectory $projectRoot -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $logRoot 'metro.log') `
        -RedirectStandardError (Join-Path $logRoot 'metro-error.log') | Out-Null
}

$deadline = (Get-Date).AddMinutes(5)
do {
    $device = Find-WebeeDevice
    $booted = $device -and ((& $adb -s $device shell getprop sys.boot_completed 2>$null) -eq '1')
    if ($booted) { break }
    Start-Sleep -Seconds 3
} while ((Get-Date) -lt $deadline)
if (!$booted) { throw 'Emulator boot timed out. Check tmp\hive-ux\emulator.log.' }

$deadline = (Get-Date).AddMinutes(2)
do {
    try { $status = Invoke-WebRequest "$serverUrl/status" -UseBasicParsing -TimeoutSec 3 } catch { $status = $null }
    if ($status) { break }
    Start-Sleep -Seconds 2
} while ((Get-Date) -lt $deadline)
if (!$status) { throw 'Expo server did not start. Check tmp\hive-ux\metro-error.log.' }
& $adb -s $device reverse "tcp:$Port" "tcp:$Port"
if ($LASTEXITCODE -ne 0) { throw 'Could not connect emulator to Expo.' }
Write-Host 'Opening app in Expo Go...'
$expoInstalled = & $adb -s $device shell pm path host.exp.exponent
if (!$expoInstalled) { throw 'Expo Go is not installed on this virtual device.' }
& $adb -s $device shell am start -a android.intent.action.VIEW -d "exp://127.0.0.1:$Port"
if ($LASTEXITCODE -ne 0) { throw 'Could not open Expo Go.' }
Write-Host 'Ready. Save code changes to update the app. No APK build is needed.'
