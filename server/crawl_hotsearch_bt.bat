@echo off
REM 静默执行 — 零命令行窗口
REM 宝塔面板 / Windows计划任务 定时抓取热搜数据

cd /d "%~dp0"

REM 使用 PowerShell 隐藏窗口执行 curl
powershell -WindowStyle Hidden -Command "& {curl -s -X GET 'http://139.196.185.197:7070/doo/server/api/crawl_hotsearch.php' >> '%~dp0crawl_hotsearch.log' 2>&1; Add-Content '%~dp0crawl_hotsearch.log' \"%date% %time% - done\"}"