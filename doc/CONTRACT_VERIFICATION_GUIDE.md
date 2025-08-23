# EIP-7702 委托合约验证（开源）指南

## 概述

本指南详细介绍了如何验证已部署的 EIP-7702 委托合约。合约验证（开源）是确保合约代码透明度和安全性的重要步骤，让用户可以在区块浏览器上查看和验证合约的源代码。

## 验证（开源）方法

### 方法一：手动验证（推荐）

手动验证是最可靠的方法，适用于所有网络。

#### 步骤 1：访问合约地址
1. 打开对应的区块浏览器
2. 在搜索框中输入您的合约地址
3. 点击合约地址进入详情页面

#### 步骤 2：开始验证
1. 在合约详情页面，点击 **"Contract"** 标签页
2. 点击 **"Verify and Publish"** 按钮
3. 选择验证方式：**"Solidity (Single file)"**

#### 步骤 3：填写验证信息
根据您的网络，填写以下信息：

**编译器设置：**
- **Compiler Type**: Solidity (Single file)
- **Compiler Version**: `0.8.20`
- **Optimization**: `Enabled`
- **Optimization runs**: `200`
- **EVM Version**: `paris`
- **License Type**: `MIT License (MIT)`

**合约信息：**
- **Contract Name**: `EIP7702SmartAccount`
- **Contract Address**: 您的合约地址（自动填充）

#### 步骤 4：上传合约源码
将 [`EIP7702SmartAccount.sol`](src/EIP7702SmartAccount.sol) 文件的完整内容复制到验证页面的合约源码输入框中。

**注意**：确保复制的是完整的合约代码，包括：
- SPDX 许可证标识符
- pragma 声明
- 所有 import 语句
- 完整的合约代码
- 所有注释和文档

#### 步骤 5：提交验证
1. 检查所有信息是否正确
2. 点击 **"Verify and Publish"** 按钮
3. 等待验证完成

### 方法二：使用 Foundry 命令行验证

如果您有区块浏览器的 API Key，可以使用 Foundry 进行命令行验证。

#### 步骤 1：获取 API Key
1. 访问对应网络的区块浏览器
2. 注册/登录账户
3. 在个人设置中生成 API Key

#### 步骤 2：执行验证命令
根据您的网络类型，使用相应的命令：

**Ethereum 系列网络（主网、Sepolia、Optimism）：**
```bash
forge verify-contract <合约地址> contract/SendBatchTransactions.sol:SendBatchTransactions \
    --etherscan-api-key <您的API_KEY> \
    --chain-id <网络ID>
```

**Base 网络：**
```bash
forge verify-contract <合约地址> contract/SendBatchTransactions.sol:SendBatchTransactions \
    --etherscan-api-key <您的API_KEY> \
    --chain-id <网络ID>
```

**Arbitrum 网络：**
```bash
forge verify-contract <合约地址> contract/SendBatchTransactions.sol:SendBatchTransactions \
    --arbiscan-api-key <您的API_KEY> \
    --chain-id <网络ID>
```

**Polygon 网络：**
```bash
forge verify-contract <合约地址> contract/SendBatchTransactions.sol:SendBatchTransactions \
    --polygonscan-api-key <您的API_KEY> \
    --chain-id <网络ID>
```

**BSC 网络：**
```bash
forge verify-contract <合约地址> contract/SendBatchTransactions.sol:SendBatchTransactions \
    --bscscan-api-key <您的API_KEY> \
    --chain-id <网络ID>
```

**Avalanche 网络：**
```bash
forge verify-contract <合约地址> contract/SendBatchTransactions.sol:SendBatchTransactions \
    --snowtrace-api-key <您的API_KEY> \
    --chain-id <网络ID>
```

**Fantom 网络：**
```bash
forge verify-contract <合约地址> contract/SendBatchTransactions.sol:SendBatchTransactions \
    --ftmscan-api-key <您的API_KEY> \
    --chain-id <网络ID>
```

#### 常用网络 ID 参考：
- Ethereum 主网: `1`
- Sepolia 测试网: `11155111`
- Optimism: `10`
- Optimism Sepolia: `11155420`
- Base: `8453`
- Base Sepolia: `84532`
- Arbitrum One: `42161`
- Arbitrum Sepolia: `421614`
- Polygon: `137`
- Polygon Mumbai: `80001`
- BSC: `56`
- BSC 测试网: `97`
- Avalanche C-Chain: `43114`
- Avalanche Fuji: `43113`
- Fantom: `250`
- Fantom 测试网: `4002`

## 验证后检查

验证成功后，您应该能够：

1. **查看合约源码**：在区块浏览器的合约页面看到完整的源代码
2. **查看合约 ABI**：可以查看和复制合约的 ABI
3. **交互合约**：可以直接在区块浏览器上与合约交互
4. **查看交易历史**：查看所有与合约相关的交易

## 常见问题

### Q: 验证失败怎么办？
A: 检查以下几点：
- 编译器版本是否正确（0.8.20）
- 优化设置是否正确（启用，200次）
- 合约源码是否完整且格式正确
- 合约地址是否正确

### Q: 找不到合约地址？
A: 确保：
- 合约已成功部署
- 网络选择正确
- 地址格式正确（0x开头的42位地址）

### Q: API Key 无效？
A: 检查：
- API Key 是否正确复制
- API Key 是否已激活
- 是否在正确的网络使用对应的 API Key

### Q: 验证需要多长时间？
A: 通常需要几分钟到几十分钟不等，取决于网络拥堵情况。

## 安全提醒

1. **保护私钥**：永远不要在任何地方分享您的私钥
2. **验证合约地址**：确保验证的是正确的合约地址
3. **检查网络**：确保在正确的网络上进行验证
4. **备份信息**：保存好验证相关的信息，以备将来需要

## 相关链接

- [EIP-7702 标准文档](https://eips.ethereum.org/EIPS/eip-7702)
- [OpenZeppelin 文档](https://docs.openzeppelin.com/)
- [Foundry 文档](https://book.getfoundry.sh/)

---

**注意**：本指南适用于 EIP-7702 智能账户合约的验证。如果您需要验证其他合约，请相应调整合约源码和验证参数。
