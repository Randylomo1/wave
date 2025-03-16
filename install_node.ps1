# Download Node.js installer
$nodeVersion = "18.16.0"
$nodeUrl = "https://nodejs.org/dist/v$nodeVersion/node-v$nodeVersion-x64.msi"
$installerPath = "$env:TEMP\node-installer.msi"

Write-Host "Downloading Node.js $nodeVersion..."
Invoke-WebRequest -Uri $nodeUrl -OutFile $installerPath

# Install Node.js
Write-Host "Installing Node.js..."
Start-Process msiexec.exe -Wait -ArgumentList "/i $installerPath /quiet"

# Clean up
Remove-Item $installerPath

# Verify installation
Write-Host "Verifying installation..."
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
node --version
npm --version 