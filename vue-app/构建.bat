@echo off
chcp 65001 >nul
echo ========================================
echo    Vue 应用构建脚本
echo ========================================
echo.

echo [1/3] 检查 Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 未找到 Node.js，请先安装 Node.js
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)
node --version
echo.

echo [2/3] 安装依赖...
call npm install
if %errorlevel% neq 0 (
    echo ❌ 依赖安装失败
    pause
    exit /b 1
)
echo.

echo [3/3] 构建生产版本...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ 构建失败
    pause
    exit /b 1
)
echo.

echo ========================================
echo ✅ 构建完成！
echo 输出目录: dist/
echo ========================================
echo.
echo 现在可以运行桌面应用程序了
pause