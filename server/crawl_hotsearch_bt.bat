@echo off
REM 宝塔面板定时抓取热搜数据并发布文章的批处理文件
REM 每天中午12点执行

REM 设置工作目录为脚本所在目录
cd /d "%~dp0"

REM 执行抓取热搜的API
curl -X GET "http://139.196.185.197:7070/doo/server/api/crawl_hotsearch.php"

REM 记录执行日志
echo %date% %time% - 热搜抓取任务执行完成 >> "%~dp0crawl_hotsearch.log"
