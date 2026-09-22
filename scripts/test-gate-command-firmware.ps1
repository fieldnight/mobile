param(
  [string]$FirmwareMain = 'D:\open\main',
  [string]$JsonRoot = 'D:\RelocatedFromC\C\Espressif\frameworks\esp-idf-v5.3.5\components\json\cJSON'
)
$ErrorActionPreference = 'Stop'
$testRoot = Join-Path $PSScriptRoot 'nfc-host'
$vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
$vsRoot = & $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
if (-not $vsRoot) { throw 'Visual Studio C++ compiler required.' }
$compilerEnv = Join-Path $vsRoot 'VC\Auxiliary\Build\vcvars64.bat'
$output = Join-Path $env:TEMP ('ourbee-command-host-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $output | Out-Null
$exe = Join-Path $output 'command-test.exe'
$compile = 'call "{0}" >nul && cl.exe /nologo /utf-8 /std:c11 /D_CRT_SECURE_NO_WARNINGS /I"{1}" /I"{2}" /I"D:\open\main" /I"{3}" "{2}\gate_command.c" "D:\open\main\nfc_payload.c" "{3}\cJSON.c" "{1}\test_gate_command.c" /Fe:"{4}" /Fo:"{5}\\" && "{4}"' -f $compilerEnv,$testRoot,$FirmwareMain,$JsonRoot,$exe,$output
& $env:ComSpec /d /s /c $compile
if ($LASTEXITCODE -ne 0) { throw "Gate command host test failed ($LASTEXITCODE)." }
$transportRoot = Join-Path $PSScriptRoot 'mqtt-host'
$transportExe = Join-Path $output 'transport-test.exe'
# Copy the actual transport source so quoted app_config.h resolves to host-only mocks.
Copy-Item -LiteralPath (Join-Path $FirmwareMain 'mqtt_publisher.c') -Destination $output
$transport = 'call "{0}" >nul && cl.exe /nologo /utf-8 /std:c11 /D_CRT_SECURE_NO_WARNINGS /I"{6}" /I"{1}" /I"{2}" /I"{3}" /I"D:\open\main" /I"{4}" "{3}\gate_command.c" "D:\open\main\nfc_payload.c" "{4}\cJSON.c" "{1}\test_mqtt.c" /Fe:"{5}" /Fo:"{6}\\" && "{5}"' -f $compilerEnv,$transportRoot,$testRoot,$FirmwareMain,$JsonRoot,$transportExe,$output
& $env:ComSpec /d /s /c $transport
if ($LASTEXITCODE -ne 0) { throw "MQTT transport host test failed ($LASTEXITCODE)." }
