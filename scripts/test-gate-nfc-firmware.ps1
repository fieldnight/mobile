param([string]$FirmwareMain = 'D:\open\main')
$ErrorActionPreference = 'Stop'
$testRoot = Join-Path $PSScriptRoot 'nfc-host'
$vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
$vsRoot = & $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
if (-not $vsRoot) { throw 'Visual Studio C++ host test compiler is required.' }
$compilerEnv = Join-Path $vsRoot 'VC\Auxiliary\Build\vcvars64.bat'
$output = Join-Path $env:TEMP ('ourbee-nfc-host-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $output | Out-Null
$source = Join-Path $FirmwareMain 'nfc_payload.c'
$hostTest = Join-Path $testRoot 'test_nfc_payload.c'
$exe = Join-Path $output 'nfc-test.exe'
# Only compile the desktop test harness with mocked hardware. No ESP-IDF build or flashing.
$compile = 'call "{0}" >nul && cl.exe /nologo /utf-8 /std:c11 /D_CRT_SECURE_NO_WARNINGS /I"{1}" /I"{2}" /I"D:\open\main" "{3}" "{4}" /Fe:"{5}" /Fo:"{6}\\" && "{5}"' -f $compilerEnv,$testRoot,$FirmwareMain,$source,$hostTest,$exe,$output
& $env:ComSpec /d /s /c $compile
if ($LASTEXITCODE -ne 0) { throw "NFC firmware host test failed ($LASTEXITCODE)." }
