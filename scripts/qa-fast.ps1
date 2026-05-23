param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$ErrorActionPreference = "Stop"
Set-Location $RepoRoot

$git = "C:\Program Files\Git\cmd\git.exe"
if (-not (Test-Path $git)) { $git = "git" }

function Ok($msg){ Write-Host "[OK] $msg" -ForegroundColor Green }
function Warn($msg){ Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Fail($msg){ Write-Host "[FAIL] $msg" -ForegroundColor Red }

$failed = $false
$hasRg = $null -ne (Get-Command rg -ErrorAction SilentlyContinue)

function FindMatches {
  param(
    [string]$Pattern,
    [string[]]$Paths
  )

  if ($hasRg) {
    return (& rg -n $Pattern @Paths 2>$null)
  }

  $results = @()
  foreach ($p in $Paths) {
    if (-not (Test-Path $p)) { continue }
    $matches = Select-String -Path $p -Pattern $Pattern -AllMatches -CaseSensitive:$false -ErrorAction SilentlyContinue
    foreach ($m in $matches) {
      $results += ("{0}:{1}:{2}" -f $m.Path.Replace("$RepoRoot\", ""), $m.LineNumber, $m.Line.Trim())
    }
  }
  return $results
}

try {
  & $git rev-parse --is-inside-work-tree *> $null
  Ok "Repo detectado"
} catch {
  Fail "No se detecto un repo git valido en $RepoRoot"
  exit 1
}

try {
  $status = & $git status --short
  if ([string]::IsNullOrWhiteSpace(($status -join ""))) { Ok "Working tree clean" } else { Warn "Hay cambios locales (ok si estas trabajando)" }
} catch {
  Warn "No se pudo leer git status"
}

$checks = @(
  @{ Name = "Vencimientos en ficha (base-datos)"; Pattern = "DNI_Vto|Pasaporte_Vto|CUD_Vto|Apto_Medico_Vto"; Paths = @("base-datos\index.html") },
  @{ Name = "SW actualizacion inmediata"; Pattern = "skipWaiting|controllerchange|updatefound|updateToast|Actualizar"; Paths = @("service-worker.js","index.html") },
  @{ Name = "Mensajes tecnicos visibles"; Pattern = "API interna|base interna|uso interno del cuerpo|Red/CORS"; Paths = @("antidoping\index.html","reportes\index.html","tactica\index.html","base-datos\index.html","concentraciones\index.html","analisis\index.html","index.html") }
)

foreach ($check in $checks) {
  try {
    $out = FindMatches -Pattern $check.Pattern -Paths $check.Paths
    if ($check.Name -eq "Mensajes tecnicos visibles") {
      if ([string]::IsNullOrWhiteSpace(($out -join ""))) {
        Ok $check.Name
      } else {
        Warn "$($check.Name): revisar coincidencias"
        $out | ForEach-Object { Write-Host "  $_" }
      }
    } else {
      if ([string]::IsNullOrWhiteSpace(($out -join ""))) {
        Fail "$($check.Name): sin coincidencias"
        $failed = $true
      } else {
        Ok $check.Name
      }
    }
  } catch {
    Fail "$($check.Name): error al ejecutar chequeo"
    $failed = $true
  }
}

if ($failed) {
  Fail "QA rapido finalizo con errores"
  exit 2
}

Ok "QA rapido finalizo correctamente"
exit 0
