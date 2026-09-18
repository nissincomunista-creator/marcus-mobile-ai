$WshShell = New-Object -ComObject WScript.Shell

$appDir = "C:\Users\Marcus\OneDrive\Desktop\app garimpo leilao\marcus-mobile-ai"
$vbsPath = Join-Path $appDir "launch_app.vbs"
$icoPath = Join-Path $appDir "app_icon.ico"

$desktopPaths = @(
  "C:\Users\Marcus\OneDrive\Desktop",
  "C:\Users\Marcus\Desktop"
)

foreach ($dt in $desktopPaths) {
  if (Test-Path $dt) {
    $shortcutPath = Join-Path $dt "Marcus - Assessoria Imobiliaria.lnk"
    $sc = $WshShell.CreateShortcut($shortcutPath)
    $sc.TargetPath = "wscript.exe"
    $sc.Arguments = "`"$vbsPath`""
    $sc.WorkingDirectory = $appDir
    if (Test-Path $icoPath) {
      $sc.IconLocation = "$icoPath, 0"
    }
    $sc.Description = "Marcus Assessoria Imobiliária & Garimpo de Leilões"
    $sc.Save()
    Write-Output "Updated shortcut at: $shortcutPath -> $vbsPath"
  }
}
