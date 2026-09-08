#!/bin/bash
# MyHR macOS 安装包构建脚本
# 在 Mac 上运行：bash build-mac.sh
# 产出：release/MyHR-<version>-arm64.dmg（Apple Silicon）
#       release/MyHR-<version>-x64.dmg（Intel）

set -e

echo "========================================="
echo "  MyHR macOS 安装包构建"
echo "========================================="

# 1. 检查 Node
if ! command -v node &> /dev/null; then
  echo "[错误] 未检测到 Node.js，请先安装 Node.js 18+"
  echo "  下载地址：https://nodejs.org/"
  exit 1
fi
echo "[1/4] Node 版本：$(node -v)"

# 2. 安装依赖
echo "[2/4] 安装依赖..."
npm install --no-audit --no-fund

# 3. 构建 Web 资源
echo "[3/4] 构建前端资源..."
npm run build

# 4. 打包 macOS dmg（双架构）
echo "[4/4] 打包 macOS 安装包..."
echo "  - Apple Silicon (arm64)..."
npx electron-builder --mac --arm64
echo "  - Intel (x64)..."
npx electron-builder --mac --x64

echo ""
echo "========================================="
echo "  构建完成！"
echo "  安装包位于 release/ 目录："
ls -lh release/*.dmg 2>/dev/null || echo "  （未找到 dmg 文件，请检查上方报错）"
echo "========================================="
echo ""
echo "提示："
echo "  - 未签名的 .dmg 在首次打开时会被 macOS 拦截，"
echo "    请右键 .app → 打开，或在「系统设置 → 隐私与安全性」中允许。"
echo "  - 如需正式签名（避免警告），需 Apple 开发者账号，"
echo "    参考 electron-builder 文档配置身份。"
