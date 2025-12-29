@echo off
chcp 65001 >nul
echo ========================================
echo  VRChat 语音识别桌面版 - 一键构建（开发版）
echo ========================================
echo.

:: 检查是否在正确的目录
if not exist "vue-app" (
    echo [错误] 未找到 vue-app 目录
    echo 请确保在 web 目录下运行此脚本
    pause
    exit /b 1
)

if not exist "DesktopBridge.csproj" (
    echo [错误] 未找到 DesktopBridge.csproj 文件
    echo 请确保在 web 目录下运行此脚本
    pause
    exit /b 1
)

:: 步骤 1: 构建 Vue 前端
echo [1/3] 正在构建 Vue 前端...
echo ----------------------------------------
cd vue-app
call npm run build
if errorlevel 1 (
    echo.
    echo [错误] Vue 前端构建失败
    cd ..
    pause
    exit /b 1
)
cd ..
echo.
echo [✓] Vue 前端构建成功
echo.

:: 步骤 2: 构建 C# 后端（Debug 模式）
echo [2/3] 正在构建 C# 后端（Debug 模式）...
echo ----------------------------------------
dotnet build --configuration Debug
if errorlevel 1 (
    echo.
    echo [错误] C# 后端构建失败
    pause
    exit /b 1
)
echo.
echo [✓] C# 后端构建成功
echo.

:: 步骤 3: 显示构建结果
echo [3/3] 构建完成！
echo ========================================
echo.
echo 构建输出位置:
echo   前端: web\dist\
echo   后端: web\bin\Debug\net8.0-windows\
echo.
echo 可执行文件:
echo   web\bin\Debug\net8.0-windows\DesktopBridge.exe
echo.
echo ========================================
echo.

:: 询问是否运行程序
set /p run="是否立即运行程序？(Y/N): "
if /i "%run%"=="Y" (
    echo.
    echo 正在启动程序...
    start "" "bin\Debug\net8.0-windows\DesktopBridge.exe"
    echo 程序已启动
) else (
    echo.
    echo 构建完成，未启动程序
)

echo.
pause