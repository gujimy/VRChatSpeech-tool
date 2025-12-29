@echo off
chcp 65001 >nul
echo ========================================
echo   实时语音识别 Vue 应用 - 开发服务器
echo ========================================
echo.

cd /d "%~dp0"

echo [1/2] 检查依赖...
if not exist "node_modules" (
    echo 首次运行，正在安装依赖...
    call npm install
    if errorlevel 1 (
        echo.
        echo 依赖安装失败！
        pause
        exit /b 1
    )
)

echo [2/2] 启动开发服务器...
echo.
echo 服务器将在 http://localhost:3000 启动
echo 按 Ctrl+C 停止服务器
echo.

call npm run dev

pause