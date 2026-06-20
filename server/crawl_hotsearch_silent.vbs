' Silent crawler — zero window, zero popup
' Use this in Windows Task Scheduler instead of .bat
' Configure task: "Run whether user is logged on or not"

Dim objHTTP, objFSO, logFile, logMsg

Set objHTTP = CreateObject("MSXML2.ServerXMLHTTP")
objHTTP.Open "GET", "http://139.196.185.197:7070/doo/server/api/crawl_hotsearch.php", False
objHTTP.SetRequestHeader "User-Agent", "SimpleServer-Crawler/2.0"
objHTTP.Send

Set objFSO = CreateObject("Scripting.FileSystemObject")
logFile = objFSO.GetParentFolderName(WScript.ScriptFullName) & "\crawl_hotsearch.log"
logMsg = Now() & " HTTP " & objHTTP.Status & " — hotsearch crawl done" & vbCrLf

Dim objFile
Set objFile = objFSO.OpenTextFile(logFile, 8, True)
objFile.Write logMsg
objFile.Close
