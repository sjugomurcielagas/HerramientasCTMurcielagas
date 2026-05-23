param(
  [Parameter(Mandatory = $true)]
  [string]$Message,
  [string]$Branch = "main",
  [int]$MaxFiles = 40,
  [switch]$NoPush,
  [string]$RepoRoot = ""
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($PSScriptRoot)) {
  $PSScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
}
if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
  $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}
Set-Location $RepoRoot

$git = "C:\Program Files\Git\cmd\git.exe"
if (-not (Test-Path $git)) { $git = "git" }

function StopFail($msg) { Write-Host "[FAIL] $msg" -ForegroundColor Red; exit 2 }
function Info($msg) { Write-Host "[INFO] $msg" -ForegroundColor Cyan }

Info "QA rapido"
powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "qa-fast.ps1")
if ($LASTEXITCODE -ne 0) { StopFail "QA fallo. Se cancela." }

# Guardrails de seguridad/costo
$blockedPatterns = @(
  "\.env$",
  "secrets?\.",
  "credentials?\.",
  "id_rsa",
  "\.pem$",
  "\.p12$",
  "service-account",
  "token"
)

$changed = & $git status --porcelain
$changedFiles = @()
foreach ($line in $changed) {
  if ($line.Length -ge 4) { $changedFiles += $line.Substring(3).Trim() }
}

if ($changedFiles.Count -eq 0) {
  Write-Host "[INFO] No hay cambios para commitear." -ForegroundColor Yellow
  exit 0
}

if ($changedFiles.Count -gt $MaxFiles) {
  StopFail "Hay $($changedFiles.Count) archivos cambiados (max $MaxFiles). Revisar scope antes de ship."
}

$sensitiveHits = @()
foreach ($f in $changedFiles) {
  foreach ($p in $blockedPatterns) {
    if ($f -match $p) { $sensitiveHits += $f; break }
  }
}
if ($sensitiveHits.Count -gt 0) {
  StopFail ("Archivos sensibles detectados: " + (($sensitiveHits | Sort-Object -Unique) -join ", "))
}

Info "Stage"
& $git add .

$staged = & $git diff --cached --name-only
if ([string]::IsNullOrWhiteSpace(($staged -join ""))) {
  Write-Host "[INFO] No hay cambios stageados." -ForegroundColor Yellow
  exit 0
}

Info "Commit"
& $git commit -m $Message

if (-not $NoPush) {
  Info "Push"
  & $git push origin $Branch
}

Write-Host "[OK] Ship seguro completado." -ForegroundColor Green
exit 0
