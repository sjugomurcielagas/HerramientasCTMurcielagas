param(
  [Parameter(Mandatory = $true)]
  [string]$Message,
  [string]$Branch = "main",
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

Write-Host "==> QA rapido" -ForegroundColor Cyan
powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "qa-fast.ps1")
if ($LASTEXITCODE -ne 0) {
  Write-Host "QA fallo. Se cancela ship." -ForegroundColor Red
  exit 2
}

Write-Host "==> Stage" -ForegroundColor Cyan
& $git add .

$staged = & $git diff --cached --name-only
if ([string]::IsNullOrWhiteSpace(($staged -join ""))) {
  Write-Host "No hay cambios para commitear." -ForegroundColor Yellow
  exit 0
}

Write-Host "==> Commit" -ForegroundColor Cyan
& $git commit -m $Message

Write-Host "==> Push" -ForegroundColor Cyan
& $git push origin $Branch

Write-Host "==> Listo" -ForegroundColor Green
