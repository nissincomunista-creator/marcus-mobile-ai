Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Resolve a pasta do script dinamicamente
appDir = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = appDir

Function CheckUrl(url)
    On Error Resume Next
    Dim http
    Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
    http.open "GET", url, False
    http.setTimeouts 2500, 2500, 2500, 2500
    http.send
    If Err.Number = 0 Then
        If http.status = 200 Or http.status = 304 Or http.status = 404 Then
            CheckUrl = True
        Else
            CheckUrl = False
        End If
    Else
        CheckUrl = False
    End If
    Err.Clear
End Function

Function IsServerOnline()
    If CheckUrl("http://127.0.0.1:3000/api/network/host-info") Then
        IsServerOnline = True
    ElseIf CheckUrl("http://localhost:3000/api/network/host-info") Then
        IsServerOnline = True
    ElseIf CheckUrl("http://127.0.0.1:3000/") Then
        IsServerOnline = True
    ElseIf CheckUrl("http://localhost:3000/") Then
        IsServerOnline = True
    Else
        IsServerOnline = False
    End If
End Function

Function IsServerProcessRunning()
    On Error Resume Next
    Dim processes, process
    Set processes = GetObject("winmgmts:\\.\root\cimv2").ExecQuery("SELECT ProcessId, CommandLine FROM Win32_Process WHERE Name='node.exe'")
    IsServerProcessRunning = False
    For Each process In processes
        Dim cmd
        cmd = LCase(process.CommandLine & "")
        If InStr(cmd, "server.cjs") > 0 Or InStr(cmd, "server.ts") > 0 Then
            IsServerProcessRunning = True
            Exit For
        End If
    Next
    Err.Clear
End Function

' Se o servidor nao estiver ativo, inicia o Node em segundo plano
If Not IsServerOnline() Then
    If Not IsServerProcessRunning() Then
        If fso.FileExists(appDir & "\dist\server.cjs") Then
            WshShell.Run "cmd.exe /c cd /d """ & appDir & """ && node dist\server.cjs", 0, False
        Else
            WshShell.Run "cmd.exe /c cd /d """ & appDir & """ && npm run dev", 0, False
        End If
    End If
    
    ' Aguarda ativamente o servidor responder em loop (ate 90 segundos).
    Dim attempts
    attempts = 0
    Do While Not IsServerOnline() And attempts < 180
        WScript.Sleep 500
        attempts = attempts + 1
    Loop
End If

If Not IsServerOnline() Then
    WshShell.Popup "O servidor do aplicativo ainda nao respondeu. Aguarde alguns instantes e abra o atalho novamente.", 8, "Marcus - Garimpo de Leiloes", 48
    WScript.Quit 1
End If

' Localiza o Chrome e mantem o Edge apenas como contingencia
edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
If Not fso.FileExists(edgePath) Then
    edgePath = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
End If

chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
If Not fso.FileExists(chromePath) Then
    chromePath = "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
End If

' Abre a janela de aplicativo conectada com sucesso
If fso.FileExists(chromePath) Then
    WshShell.Run """" & chromePath & """ --app=http://localhost:3000 --window-size=1440,900 --start-maximized", 1, False
ElseIf fso.FileExists(edgePath) Then
    WshShell.Run """" & edgePath & """ --app=http://localhost:3000 --window-size=1440,900 --start-maximized", 1, False
Else
    WshShell.Run "http://localhost:3000", 1, False
End If
