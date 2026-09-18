$source = "C:\Users\Marcus\OneDrive\Desktop\app garimpo leilao\marcus-mobile-ai"
$dest = "C:\Users\Marcus\OneDrive\Desktop\app garimpo leilao\app-marcus-main\app-marcus-main"

if (Test-Path $dest) {
  Write-Output "Copying src..."
  robocopy (Join-Path $source "src") (Join-Path $dest "src") /E /NFL /NDL /NJH /NJS
  
  Write-Output "Copying dist..."
  robocopy (Join-Path $source "dist") (Join-Path $dest "dist") /E /NFL /NDL /NJH /NJS
  
  Write-Output "Copying public..."
  robocopy (Join-Path $source "public") (Join-Path $dest "public") /E /NFL /NDL /NJH /NJS

  $files = @(
    "server.ts",
    "geocodeService.ts",
    "portalScraper.ts",
    "geocode_cache.json",
    "street_coords_cache.json",
    "data_store.json",
    "data_store.json.gz",
    "index.html",
    "vite.config.ts",
    "launch_app.vbs",
    "Marcus_Assessoria.bat",
    "INICIAR_APP_MOBILE.bat"
  )

  foreach ($f in $files) {
    $sf = Join-Path $source $f
    $df = Join-Path $dest $f
    if (Test-Path $sf) {
      Copy-Item -Path $sf -Destination $df -Force
      Write-Output "Synced $f"
    }
  }

  Write-Output "Synchronization completed successfully!"
}
