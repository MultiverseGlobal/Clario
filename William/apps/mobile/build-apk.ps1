$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot"
$env:Path = "$env:JAVA_HOME\bin;$env:LOCALAPPDATA\Android\Sdk\platform-tools;$env:Path"

Write-Host "Building Orion Android APK..." -ForegroundColor Cyan
Set-Location "C:\Users\SUDO\Documents\Pseudonyms\William\apps\mobile\android"

cmd.exe /c "gradlew.bat assembleDebug"

$apkSource = "C:\Users\SUDO\Documents\Pseudonyms\William\apps\mobile\android\app\build\outputs\apk\debug\app-debug.apk"
$apkDest = "C:\Users\SUDO\Documents\Pseudonyms\Orion.apk"

if (Test-Path $apkSource) {
    Copy-Item $apkSource $apkDest -Force
    Write-Host "SUCCESS: Orion APK built -> $apkDest" -ForegroundColor Green
} else {
    Write-Host "Build finished. Checking APK output..." -ForegroundColor Yellow
}
