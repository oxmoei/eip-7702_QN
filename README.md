# EIP-7702 账户抽象演示项目

```
     ███████╗██╗██████╗    ███████╗███████╗ ██████╗ ██████╗
     ██╔════╝██║██╔══██╗   ╚════██║╚════██║██╔═████╗╚════██╗
     █████╗  ██║██████╔╝█████╗ ██╔╝    ██╔╝██║██╔██║ █████╔╝
     ██╔══╝  ██║██╔═══╝ ╚════╝██╔╝    ██╔╝ ████╔╝██║██╔═══╝
     ███████╗██║██║           ██║     ██║  ╚██████╔╝███████╗
     ╚══════╝╚═╝╚═╝           ╚═╝     ╚═╝   ╚═════╝ ╚══════╝
```

项目提供了完整的 EIP-7702 实现，支持标准批量交易和赞助批量交易两种模式。

## 🚀 项目特性

- **EIP-7702 支持**: 完整的账户抽象实现
- **双模式交易**: 支持非赞助和赞助交易
- **批量操作**: 支持批量交易执行
- **Foundry 部署**: 使用 Foundry 构建和部署“委托合约”
- **配置管理**: 灵活的配置文件系统
- **模块化设计**: 清晰的代码结构

## 📁 项目结构   ➡️[PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)

```
eip-7702_QN/
├── src/                            # 主要脚本目录
│   ├── delegate.js                 # EIP-7702授权委托
│   ├── main.js                     # 标准批量交易脚本
│   ├── sponsored.js                # 赞助批量交易脚本
│   └── generate-config.js          # 配置生成脚本
├── contract/                       # 智能合约目录
│   └── BatchCallAndSponsor.sol     # EIP-7702 合约源码
├── lib/                            # 依赖库目录
│   └── openzeppelin-contracts/     # OpenZeppelin 合约库
├── modules/                        # 核心模块目录
│   └── contract.js                 # 合约 ABI 定义
├── call_data/                      # 配置文件目录
│   ├── config.json                 # 主要交易配置
│   └── example.json                # 配置示例文件
├── install.sh                      # 安装依赖和配置环境变量（Linux/MacOS/WSL）
├── install.ps1                     # 安装依赖和配置环境变量（windows）
├── deploy.sh                       # Foundry 部署脚本
├── foundry.toml                    # Foundry 配置文件
├── package.json                    # Node.js 项目配置
├── package-lock.json               # 依赖锁定文件
├── .env                            # 环境变量配置
├── .gitignore                      # Git 忽略文件
├── .gitmodules                     # Git 子模块配置
├── deployment-info.txt             # 部署信息记录
├── PROJECT_STRUCTURE.md            # 项目结构说明
├── 安装git教程.md                  # 安装git教程
├── CONTRACT_VERIFICATION_GUIDE.md  # 合约验证（开源）指南
└── README.md                       # 项目说明文档
```
## 🖥️ 支持系统

- ![Windows](https://img.shields.io/badge/-Windows-0078D6?logo=windows&logoColor=white)
- ![macOS](https://img.shields.io/badge/-macOS-000000?logo=apple&logoColor=white)
- ![Linux](https://img.shields.io/badge/-Linux-FCC624?logo=linux&logoColor=black)

## 🛠️ 安装和配置

### 1. 克隆仓库并进入项目目录
执行以下命令前确保你已安装 `git`  ➡️[安装git教程](./安装git教程.md)
```
git clone https://github.com/oxmoei/eip-7702_QN.git
cd eip-7702_QN
```
### 2. 环境准备和安装依赖

- **Linux/WSL/macOS 用户：**
```bash
./install.sh
```

- **Windows 用户：**
以管理员身份启动 PowerShell，然后执行以下命令
```powershell
# 设置允许当前用户运行脚本和启用 TLS 1.2
Set-ExecutionPolicy Bypass -Scope CurrentUser -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072;

# 配置环境和自动安装所缺少的依赖
.\install.ps1
```

### 3. 环境变量配置

创建 `.env` 文件并配置以下环境变量：

```env
# 区块链网络配置
RPC_URL="https://sepolia.infura.io/v3/YOUR_API_KEY"

# 私钥配置
FIRST_PRIVATE_KEY="0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
SPONSOR_PRIVATE_KEY="0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"

# 委托合约地址（部署后会自动更新）
DELEGATION_CONTRACT_ADDRESS="0x0000000000000000000000000000000000000000"
```

### 4. 获取必要的配置

#### 4.1 私钥获取
- 使用 MetaMask 或其他钱包导出私钥
- 确保账户有足够的 ETH 用于测试

#### 4.2 RPC URL 获取
- 可在 Alchemy、Infura、Ankr、QuickNode 等提供商上免费注册
- 创建端点
- 复制 RPC URL

## 🎯 使用流程

### 1. 部署合约

```bash
# 授权委托已部署的合约
node src/delegate.js

# 使用 Foundry 部署新的合约
./deploy.sh
```
如需开源合约（验证合约），请参考➡️[开源合约教程](./CONTRACT_VERIFICATION_GUIDE.md)

🚀 **部署流程包括**：
- ✅ 环境配置检查
- ✅ 网络信息检测
- ✅ Foundry 环境验证
- ✅ 合约构建
- ✅ 合约部署
- ✅ 部署信息记录

### 2. 生成交易配置

```bash
# 交互式生成交易配置
node src/generate-config.js
# 或
npm run config
```

⚙️ **配置生成器功能**：
- 支持多种交易类型
- 交互式配置创建
- 配置验证功能
- 用户友好的界面

### 3. 执行标准批量交易

```bash
# 执行用户自己支付 gas 费用的批量交易
node src/main.js
# 或
npm run main
```

💳 **标准批量交易特性**：
- 用户使用自己的 ETH 支付 gas 费用
- 使用 EIP-7702 委托机制
- 执行批量交易操作

### 4. 执行赞助批量交易

```bash
# 执行第三方支付 gas 费用的批量交易
node src/sponsored.js
# 或
npm run sponsored
```

🎁 **赞助批量交易特性**：
- 第三方支付 gas 费用
- 签名验证机制

## 📋 脚本说明

### 主要脚本

| 脚本 | 功能 | 使用场景 |
|------|------|----------|
| `deploy.sh` | 合约部署 | 首次部署或重新部署合约 |
| `src/generate-config.js` | 配置生成 | 创建新的交易配置 |
| `src/main.js` | 标准交易 | 用户自己支付 gas 的交易 |
| `src/sponsored.js` | 赞助交易 | 第三方支付 gas 的交易 |

### 配置文件

| 文件 | 功能 | 说明 |
|------|------|------|
| `.env` | 环境变量 | 私钥、RPC URL 等敏感信息 |
| `call_data/config.json` | 交易配置 | 批量交易的详细配置 |
| `call_data/example.json` | 配置示例 | 配置文件的参考模板 |

## 🔧 开发指南

### 脚本开发

```bash
# 生成新配置
node src/generate-config.js

# 运行标准交易脚本
node src/main.js

# 运行赞助交易脚本
node src/sponsored.js
```

### 添加新功能

1. **新脚本**: 在 `src/` 目录创建
2. **新模块**: 在 `modules/` 目录创建
3. **新合约**: 在 `contract/` 目录创建
4. **新配置**: 在 `call_data/` 目录创建

## 🌐 网络支持

### 支持的 EVM 网络

- **Ethereum 主网**
- **Sepolia 测试网**
- **Polygon 网络**
- **BSC 网络**
- **Arbitrum One**
- **Optimism**
- **其他兼容 EVM 的网络**

### 网络配置

通过修改 `.env` 文件中的 `RPC_URL` 来切换网络：

```env
# Sepolia 测试网
RPC_URL="https://sepolia.infura.io/v3/YOUR_API_KEY"

# Ethereum 主网
RPC_URL="https://mainnet.infura.io/v3/YOUR_API_KEY"

# Polygon 网络
RPC_URL="https://polygon-rpc.com"
```

## 🔒 安全考虑

### 私钥安全
- 使用环境变量存储私钥
- 不要在代码中硬编码私钥
- 定期更换私钥

### 交易安全
- 验证交易参数
- 检查目标地址
- 确认交易金额

### 网络安全
- 使用可信的 RPC 提供商
- 验证网络连接
- 检查交易确认

## 🚀 扩展功能

### 计划中的功能

1. **多签名支持**
   - 多签名钱包集成
   - 阈值签名

2. **监控系统**
   - 交易状态监控
   - Gas 价格监控
   - 错误监控

3. **自动化测试**
   - 合约单元测试
   - 集成测试
   - 端到端测试

4. **文档系统**
   - API 文档
   - 用户指南
   - 开发者文档

## 📞 支持与反馈

### 问题报告
如果您遇到问题或有建议，请：
1. 检查项目文档
2. 查看常见问题
3. 提交 Issue

### 贡献指南
欢迎贡献代码和文档：
1. Fork 项目
2. 创建功能分支
3. 提交 Pull Request

## 📄 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。

## 🙏 致谢

- [EIP-7702](https://eips.ethereum.org/EIPS/eip-7702) 提案
- [OpenZeppelin](https://openzeppelin.com/) 合约库
- [Foundry](https://getfoundry.sh/) 开发框架
- [Ethers.js](https://docs.ethers.org/) 以太坊库

## 💬 联系与支持
- Telegram: [t.me/cryptostar210](https://t.me/cryptostar210)
- 请我喝杯☕：**0xd328426a8e0bcdbbef89e96a91911eff68734e84** ▋**5LmGJmv7Lbjh9K1gEer47xSHZ7mDcihYqVZGoPMRo89s**