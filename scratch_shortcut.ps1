$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("C:\Users\Marcus\OneDrive\Desktop\Marcus - Assessoria Imobiliaria.lnk")
Write-Output "TargetPath: $($Shortcut.TargetPath)"
Write-Output "Arguments: $($Shortcut.Arguments)"
Write-Output "WorkingDirectory: $($Shortcut.WorkingDirectory)"
