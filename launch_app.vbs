Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Resolve a pasta do script dinamicamente
appDir = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = appDir

Function IsServerOnline()
    On Error Resume Next
    Dim http
    Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
    http.open "GET", "http://localhost:3000/api/network/host-info", False
    http.setTimeouts 800, 800, 800, 800
    http.send
    If Err.Number = 0 Then
        If http.status = 200 Or http.status = 304 Or http.status = 404 Then
            IsServerOnline = True
        Else
            IsServerOnline = False
        End If
    Else
        IsServerOnline = False
    End If
    Err.Clear
End Function

' Se o servidor nao estiver ativo, inicia o Node em segundo plano
If Not IsServerOnline() Then
    If fso.FileExists(appDir & "\dist\server.cjs") Then
        WshShell.Run "cmd.exe /c node dist/server.cjs", 0, False
    Else
        WshShell.Run "cmd.exe /c npm run dev", 0, False
    End If
    
    ' Aguarda ativamente o servidor responder em loop (ate 30 segundos)
    Dim attempts
    attempts = 0
    Do While Not IsServerOnline() And attempts < 30
        WScript.Sleep 500
        attempts = attempts + 1
    Loop
End If

' Localiza o Chrome e mantém o Edge apenas como contingência
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
