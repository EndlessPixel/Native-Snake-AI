#Requires -Version 5.1
$ErrorActionPreference = "Stop"

function Write-Info  { param($m) Write-Host "[INFO]  $m" -ForegroundColor Cyan   }
function Write-Error { param($m) Write-Host "[ERROR] $m" -ForegroundColor Red    }
function Write-Tip   { param($m) Write-Host "[TIP]   $m" -ForegroundColor Yellow }

function Show-Banner {
    Write-Host "==============================================" -ForegroundColor Green
    Write-Host " HTTP Server Launcher  (Bulky Edition v1.0)   " -ForegroundColor Green
    Write-Host "==============================================" -ForegroundColor Green
}

function Test-Python {
    Write-Info "STEP 1/4  Detecting Python Interpreter"
    try {
        $py = Get-Command python -ErrorAction Stop
        $ver = & python --version 2>&1
        Write-Info "Python $ver detected."
        return $true
    } catch {
        Write-Error "Python interpreter not found or not executable."
        return $false
    }
}

function Test-Version {
    Write-Info "STEP 2/4  Checking Minimum Version"
    $ok = & python -c "import sys,os; os.exit(0 if sys.version_info>=(3,6) else 1)" 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Python 3.6+ required."
        return $false
    }
    Write-Info "Version constraint satisfied."
    return $true
}

function Show-FakeProgress {
    param($Seconds = 3)
    Write-Info "STEP 3/4  Initialising Sub-modules"
    $jobs = @('urllib','ssl','argparse','http.server','datetime','platform','sys','os','random')
    $step = 1 / $jobs.Count
    foreach ($j in $jobs) {
        Write-Progress -Activity "Loading $j" -PercentComplete ($step*100)
        Start-Sleep -Milliseconds (Get-Random -Min 80 -Max 220)
        $step++
    }
    Write-Progress -Activity "Done" -Completed
}

function Show-RandomTip {
    $tips = @(
        "Press Ctrl-C twice to force-stop the server.",
        "Add '--directory $HOME' to serve your home folder.",
        "Use 8000 instead of 8080 if the port is taken.",
        "Run 'python -m http.server --help' for more options."
    )
    Write-Tip ($tips | Get-Random)
}

# ---------- main ----------
Show-Banner
if (-not (Test-Python)) { exit 1 }
if (-not (Test-Version)) { exit 1 }
Show-FakeProgress
Show-RandomTip
Write-Info "STEP 4/4  Starting HTTP Server"
Write-Info "Serving on http://localhost:8080  [Ctrl-C to stop]"
try {
    python -m http.server 8080
} catch {
    Write-Error $_.Exception.Message
    exit 1
}