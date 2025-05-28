# 基金投资记录助手

一个简单易用的基金投资记录管理工具，帮助您跟踪基金投资组合的表现。

## 功能特点

- 📊 **投资概览**：查看总投入、当前市值、总盈亏和收益率
- 💼 **持仓管理**：详细的基金持仓信息和实时盈亏计算
- 📝 **交易记录**：完整的买入卖出交易历史
- ☁️ **云端同步**：支持 Google Drive 数据同步，多设备访问
- 🔄 **实时更新**：手动更新基金净值，获得准确的收益计算
- 💾 **本地存储**：数据安全保存在浏览器本地

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

### 3. 访问应用

打开浏览器访问 [http://localhost:3000](http://localhost:3000)

## Google Drive 同步设置

要使用 Google Drive 数据同步功能，您需要设置 Google Drive API：

### 步骤 1：创建 Google Cloud 项目

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目或选择现有项目
3. 在项目中启用 Google Drive API

### 步骤 2：创建 API 凭据

1. 在 Google Cloud Console 中，转到"API 和服务" > "凭据"
2. 点击"创建凭据" > "API 密钥"
3. 复制生成的 API 密钥
4. 点击"创建凭据" > "OAuth 2.0 客户端 ID"
5. 选择"Web 应用程序"
6. 在"已获授权的 JavaScript 来源"中添加：
   - `http://localhost:3000` (开发环境)
   - 您的生产域名 (如果有)
7. 复制生成的客户端 ID

### 步骤 3：配置应用

1. 在应用中点击"数据同步"标签页
2. 点击"配置 API"按钮
3. 输入您的 Client ID 和 API Key
4. 保存配置

### 步骤 4：开始同步

1. 点击"登录 Google"按钮
2. 授权应用访问您的 Google Drive
3. 使用"上传数据"和"下载数据"按钮进行同步

## 使用说明

### 添加交易记录

1. 点击"添加交易"按钮
2. 填写基金代码、名称、交易类型等信息
3. 提交后系统会自动计算持仓和收益

### 更新基金净值

1. 在"持仓详情"页面找到要更新的基金
2. 点击净值旁边的编辑按钮
3. 输入最新净值并确认

### 数据同步

- **上传数据**：将本地数据保存到 Google Drive
- **下载数据**：从 Google Drive 获取最新数据

## 技术栈

- **前端框架**：Next.js 15 + React 19
- **UI 组件**：shadcn/ui + Tailwind CSS
- **状态管理**：Zustand
- **表单处理**：React Hook Form
- **云端同步**：Google Drive API
- **通知系统**：Sonner

## 项目结构

```
src/
├── app/                 # Next.js 应用页面
├── components/          # React 组件
│   ├── ui/             # shadcn/ui 组件
│   └── GoogleDriveSync.tsx  # Google Drive 同步组件
├── lib/                # 工具库
│   └── google-drive-sync.ts # Google Drive API 封装
└── store/              # Zustand 状态管理
    └── fund.ts         # 基金数据状态
```

## 数据安全

- 所有数据默认保存在浏览器本地存储中
- Google Drive 同步是可选功能
- API 凭据保存在本地，不会上传到服务器
- 支持随时导出和备份数据

## 开发

### 构建生产版本

```bash
npm run build
```

### 代码检查

```bash
npm run check
```

### 类型检查

```bash
npm run typecheck
```

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！