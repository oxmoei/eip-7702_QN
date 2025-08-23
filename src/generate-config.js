const fs = require("fs");
const path = require("path");
const readline = require("readline");
const chalk = require("chalk");

// 创建readline接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 配置模板
const configTemplate = {
  description: "批量交易配置 - 自动生成",
  version: "1.0.0",
  transactions: [],
  settings: {
    delay_between_calls: 500,
    max_retries: 3,
    timeout: 30000
  }
};

// 交易类型定义
const TRANSACTION_TYPES = {
  1: { name: "ETH_TRANSFER", label: "原生代币转账" },
  2: { name: "ERC20_TRANSFER", label: "ERC20代币转账" },
  3: { name: "CONTRACT_CALL", label: "ERC20代币授权" },
  4: { name: "RAW_CALL", label: "调用原始HEX数据" }
};

/**
 * 验证以太坊地址格式
 */
function isValidAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * 验证数值格式
 */
function isValidNumber(value) {
  return !isNaN(parseFloat(value)) && parseFloat(value) >= 0;
}

/**
 * 生成交易描述
 */
function getTransactionDescription(tx) {
  switch (tx.type) {
    case 'ETH_TRANSFER':
      return `向${tx.to.slice(0, 10)}...转账${tx.value} ETH`;
    case 'ERC20_TRANSFER':
      return `转账${tx.value} 代币给${tx.to.slice(0, 10)}... (${tx.decimals}位小数)`;
    case 'CONTRACT_CALL':
      if (tx.function === 'approve') {
        return `授权${tx.args[1]} 代币给${tx.args[0].slice(0, 10)}... (${tx.decimals}位小数)`;
      }
      return `调用${tx.function}函数`;
    case 'RAW_CALL':
      return `执行原始调用数据`;
    default:
      return `未知交易类型`;
  }
}

/**
 * 询问用户输入
 */
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * 显示交易类型选择菜单
 */
function showTransactionTypeMenu() {
  console.log(chalk.cyan.bold("\n" + "=".repeat(50)));
  console.log(chalk.cyan.bold("🎯 选择交易类型"));
  console.log(chalk.cyan.bold("=".repeat(50)));
  Object.entries(TRANSACTION_TYPES).forEach(([key, value]) => {
    console.log(chalk.yellow(`${key}.`) + chalk.white(` ${value.label}`));
  });
  console.log(chalk.red("\n0.") + chalk.red(" 完成配置"));
  console.log(chalk.cyan.bold("=".repeat(50)));
}

/**
 * 获取ETH转账配置
 */
async function getETHTransferConfig() {
  console.log(chalk.cyan.bold("\n" + "=".repeat(50)));
  console.log(chalk.cyan.bold("💰 配置原生代币转账（如ETH、BNB）"));
  console.log(chalk.cyan.bold("=".repeat(50)));
  
  const to = await askQuestion(chalk.green("📤 请输入目标地址 (0x...): "));
  if (!isValidAddress(to)) {
    throw new Error(chalk.red("❌ 无效的以太坊地址格式"));
  }
  
  const value = await askQuestion(chalk.green("🪙 请输入转账数额 (如1.5): "));
  if (!isValidNumber(value)) {
    throw new Error(chalk.red("❌ 无效的转账金额"));
  }
  
  console.log(chalk.cyan.bold("\n✅ 原生代币转账配置完成"));
  
  return {
    id: `eth_transfer_${Date.now()}`,
    type: "ETH_TRANSFER",
    to: to,
    value: value,
    data: "0x" // ETH转账的data字段为空
  };
}

/**
 * 获取ERC20转账配置
 */
async function getERC20TransferConfig() {
  console.log(chalk.cyan.bold("\n" + "=".repeat(50)));
  console.log(chalk.cyan.bold("💸 配置ERC20代币转账（如USDT、WETH）"));
  console.log(chalk.cyan.bold("=".repeat(50)));
  
  const contract = await askQuestion(chalk.green("📋 请输入代币合约地址 (0x...): "));
  if (!isValidAddress(contract)) {
    throw new Error(chalk.red("❌ 无效的合约地址格式"));
  }
  
  const to = await askQuestion(chalk.green("📤 请输入目标地址 (0x...): "));
  if (!isValidAddress(to)) {
    throw new Error(chalk.red("❌ 无效的目标地址格式"));
  }
  
  const value = await askQuestion(chalk.green("🪙 请输入转账数额 (支持小数，如10.52): "));
  if (!value || isNaN(parseFloat(value)) || parseFloat(value) < 0) {
    throw new Error(chalk.red("❌ 无效的转账数额"));
  }
  
  const decimals = await askQuestion(chalk.green("🔢 请输入该代币的小数位数 (如WETH为18，USDC为6。留空默认为18): "));
  const decimalsNum = decimals ? parseInt(decimals) : 18;
  if (isNaN(decimalsNum) || decimalsNum < 0 || decimalsNum > 18) {
    throw new Error(chalk.red("❌ 无效的小数位数，请输入0-18之间的数字"));
  }
  
  // 将小数转换为原始单位，使用BigInt避免精度丢失
  const multiplier = Math.pow(10, decimalsNum);
  const valueFloat = parseFloat(value);
  const rawValueBig = BigInt(Math.floor(valueFloat * multiplier));
  const rawValue = "0x" + rawValueBig.toString(16);

  console.log(chalk.cyan(`   ┗━📊 转换结果: ${value} → ${rawValue} (${decimalsNum}位小数)`));
  console.log(chalk.cyan.bold("\n✅ ERC20转账配置完成"));
  
  return {
    id: `erc20_transfer_${Date.now()}`,
    type: "ERC20_TRANSFER",
    contract: contract,
    to: to,
    value: "0", // ERC20转账不需要发送ETH
    rawValue: rawValue, // 保存转换后的原始单位值（十六进制格式）
    decimals: decimalsNum,
    data: "0xa9059cbb" // ERC20 transfer函数的选择器
  };
}

/**
 * 获取ERC20授权配置
 */
async function getERC20ApproveConfig() {
  console.log(chalk.cyan.bold("\n" + "=".repeat(50)));
  console.log(chalk.cyan.bold("🔐 配置ERC20代币授权（如USDT、WETH）"));
  console.log(chalk.cyan.bold("=".repeat(50)));
  
  const contract = await askQuestion(chalk.green("📋 请输入代币合约地址 (0x...): "));
  if (!isValidAddress(contract)) {
    throw new Error(chalk.red("❌ 无效的合约地址格式"));
  }
  
  const spender = await askQuestion(chalk.green("🎯 请输入授权地址 (0x...): "));
  if (!isValidAddress(spender)) {
    throw new Error(chalk.red("❌ 无效的授权地址格式"));
  }
  
  const amount = await askQuestion(chalk.green("🪙 请输入授权数额 (支持小数，如1000.52。留空默认为无限): "));
  let finalAmount;
  
  if (!amount || amount.trim() === '') {
    // 留空时设置为无限授权（使用最大值）
    finalAmount = "115792089237316195423570985008687907853269984665640564039457584007913129639935";
  } else if (isNaN(parseFloat(amount)) || parseFloat(amount) < 0) {
    throw new Error(chalk.red("❌ 无效的授权数额"));
  } else {
    finalAmount = amount;
  }
  
  const decimals = await askQuestion(chalk.green("🔢 请输入该代币的小数位数 (如WETH为18，USDC为6。留空默认为18): "));
  const decimalsNum = decimals ? parseInt(decimals) : 18;
  if (isNaN(decimalsNum) || decimalsNum < 0 || decimalsNum > 18) {
    throw new Error(chalk.red("❌ 无效的小数位数，请输入0-18之间的数字"));
  }
  
  // 将小数转换为原始单位
  let rawAmount;
  if (finalAmount === "115792089237316195423570985008687907853269984665640564039457584007913129639935") {
    // 无限授权，直接使用最大值
    rawAmount = "0x" + BigInt(finalAmount).toString(16);
    console.log(chalk.cyan(`   ┗━📊 无限授权: ${rawAmount}`));
  } else {
    // 普通授权，进行小数转换
    const multiplier = Math.pow(10, decimalsNum);
    const amountFloat = parseFloat(finalAmount);
    const rawAmountBig = BigInt(Math.floor(amountFloat * multiplier));
    rawAmount = "0x" + rawAmountBig.toString(16);
    console.log(chalk.cyan(`   ┗━📊 转换结果: ${finalAmount} → ${rawAmount} (${decimalsNum}位小数)`));
  }
  console.log(chalk.cyan.bold("\n✅ ERC20授权配置完成"));
  return {
    id: `erc20_approve_${Date.now()}`,
    type: "CONTRACT_CALL",
    contract: contract,
    function: "approve",
    args: [spender, finalAmount], // 保存用户输入的原始值
    amount: finalAmount, // 保存用户输入的原始值
    rawAmount: rawAmount, // 保存转换后的原始单位值
    decimals: decimalsNum,
    value: "0", // ERC20授权不需要发送ETH
    data: "0x095ea7b3", // ERC20 approve函数的选择器
    abi: [
      "function approve(address spender, uint256 amount) external returns (bool)"
    ]
  };
}

/**
 * 获取RAW_CALL配置
 */
async function getRawCallConfig() {
  console.log(chalk.cyan.bold("\n" + "=".repeat(50)));
  console.log(chalk.cyan.bold("⚡ 配置调用原始HEX数据"));
  console.log(chalk.cyan.bold("=".repeat(50)));
  
  const contract = await askQuestion(chalk.green("🎯 请输入目标合约地址 (0x...): "));
  if (!isValidAddress(contract)) {
    throw new Error(chalk.red("❌ 无效的目标合约地址格式"));
  }
  
  const data = await askQuestion(chalk.green("📄 请输入调用HEX数据 (0x...): "));
  if (!data.startsWith("0x")) {
    throw new Error(chalk.red("❌ 调用数据必须以0x开头"));
  }
  
  // 验证HEX数据格式
  if (!/^0x[a-fA-F0-9]*$/.test(data)) {
    throw new Error(chalk.red("❌ 调用数据格式无效，只能包含0-9和a-f字符"));
  }
  
  console.log(chalk.cyan(`   ┣━📊 数据长度: ${data.length - 2} 字节`));
  console.log(chalk.cyan(`   ┗━🪙 发送数量: 0 ETH (默认)`));
  console.log(chalk.cyan.bold("\n✅ 调用原始HEX数据配置完成"));

  return {
    id: `raw_call_${Date.now()}`,
    type: "RAW_CALL",
    contract: contract,
    data: data,
    value: "0"
  };
}

/**
 * 获取交易配置
 */
async function getTransactionConfig() {
  showTransactionTypeMenu();
  
  const choice = await askQuestion("\n👉 请选择交易类型 (0-4): ");
  const choiceNum = parseInt(choice);
  
  if (choiceNum === 0) {
    return null; // 结束配置
  }
  
  if (!TRANSACTION_TYPES[choiceNum]) {
    throw new Error("⚠️ 无效的选择，请输入0-4之间的数字");
  }
  
  try {
    switch (choiceNum) {
      case 1:
        return await getETHTransferConfig();
      case 2:
        return await getERC20TransferConfig();
      case 3:
        return await getERC20ApproveConfig();
      case 4:
        return await getRawCallConfig();
      default:
        throw new Error("无效的选择");
    }
  } catch (error) {
    console.error(chalk.red.bold(`❌ 配置错误: ${error.message}`));
    console.log(chalk.yellow("🔄 请重新配置..."));
    return await getTransactionConfig(); // 重新配置
  }
}

/**
 * 显示艺术字横幅
 */
function showBanner() {
  console.log(chalk.cyan.bold("✦  ˚  ✦  . ⋆ ˚   ✦  . ⋆ ˚   ✦  . ⋆ ˚   ✦ ˚ . ⋆   ˚ ✦  ˚ "));
  console.log(chalk.cyan.bold("    ┏━╸┏━╸┏┓╻┏━╸┏━┓┏━┓╺┳╸┏━╸   ┏━╸┏━┓┏┓╻┏━╸╻┏━╸"));
  console.log(chalk.cyan.bold("    ┃╺┓┣╸ ┃┗┫┣╸ ┣┳┛┣━┫ ┃ ┣╸ ╺━╸┃  ┃ ┃┃┗┫┣╸ ┃┃╺┓"));
  console.log(chalk.cyan.bold("    ┗━┛┗━╸╹ ╹┗━╸╹┗╸╹ ╹ ╹ ┗━╸   ┗━╸┗━┛╹ ╹╹  ╹┗━┛"));
  console.log(chalk.yellowBright.bold("    ※※※※※※※※※※※※批量交易配置生成器※※※※※※※※※※※※"));
  console.log(chalk.cyan.bold("✦  ˚  ✦  . ⋆ ˚   ✦  . ⋆ ˚   ✦  . ⋆ ˚   ✦ ˚ . ⋆   ˚ ✦  ˚ "));
  console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.blueBright("★★★ 自助生成 config.json 配置文件★★★"));
}

/**
 * 生成配置文件
 */
async function generateConfig() {
  showBanner();
  
  const config = { ...configTemplate };
  let transactionCount = 0;
  
  while (true) {
    const transaction = await getTransactionConfig();
    
    if (!transaction) {
      break; // 用户选择结束
    }
    
    config.transactions.push(transaction);
    transactionCount++;
    
    console.log(chalk.magentaBright.bold(`   ┗━☑️ 已添加第 ${transactionCount} 笔交易`));
    
    const continueChoice = await askQuestion(chalk.yellow("\n🫴 是否继续添加交易? (y/n): "));
    if (continueChoice.toLowerCase() !== 'y' && continueChoice.toLowerCase() !== 'yes') {
      break;
    }
  }
  
  if (transactionCount === 0) {
    console.log(chalk.red.bold("❌ 未配置任何交易，退出"));
    rl.close();
    return;
  }
  
  // 保存配置文件
  const configPath = path.join(__dirname, "..", "call_data", "config.json");
  
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(chalk.gray("━".repeat(50)));
    console.log(chalk.blueBright.bold("\n🗃️ 配置文件生成成功！🎉"));
    console.log(chalk.cyan(`   ┣━📁 文件路径: ${chalk.yellow(configPath)}`));
    console.log(chalk.cyan(`   ┗━📊 交易数量: ${chalk.yellow(transactionCount)}`));
    
    // 显示配置摘要
    console.log(chalk.blueBright.bold("\n📜 批量交易详情"));
    console.log(chalk.blueBright.bold("   "+"-".repeat(50)));
    config.transactions.forEach((tx, index) => {
      console.log(chalk.yellow(`    ${index + 1}. ${getTransactionDescription(tx)} (${tx.type})`));
      
      if (tx.type === 'ETH_TRANSFER') {
        console.log(chalk.white(`       ┣━📤 目标: ${tx.to}`));
        console.log(chalk.white(`       ┗━🪙 数额: ${tx.value} ETH`));
      } else if (tx.type === 'ERC20_TRANSFER') {
        console.log(chalk.white(`       ┣━📤 目标: ${tx.to}`));
        console.log(chalk.white(`       ┣━🪙 数额: ${tx.value} 代币 (${tx.decimals}位小数)`));
        console.log(chalk.white(`       ┗━📋 合约: ${tx.contract}`));
      } else if (tx.type === 'CONTRACT_CALL') {
        if (tx.function === 'approve') {
          console.log(chalk.white(`       ┣━📋 合约地址: ${tx.contract}`));
          console.log(chalk.white(`       ┣━🎯 授权地址: ${tx.args[0]}`));
          console.log(chalk.white(`       ┗━🪙 授权数额: ${tx.args[1]} (${tx.decimals}位小数)`));
        } else {
          console.log(chalk.white(`       ┣━📋 合约: ${tx.contract}`));
          console.log(chalk.white(`       ┣━🆔 函数: ${tx.function}`));
          console.log(chalk.white(`       ┗━©️ 参数: ${JSON.stringify(tx.args)}`));
        }
      } else if (tx.type === 'RAW_CALL') {
        console.log(chalk.white(`       ┣━📋 合约: ${tx.contract}`));
        console.log(chalk.white(`       ┗━📄 数据: ${tx.data}`));
        if (tx.value && tx.value !== "0") {
          console.log(chalk.white(`       ┗━🪙 数额: ${tx.value} ETH`));
        }
      }
      console.log("");
    });
    
    // 显示结束横幅
    console.log(chalk.magentaBright.bold("\n" + "━".repeat(50)));
    console.log(chalk.magentaBright.bold("✨ 配置完成，感谢使用！"));
    console.log(chalk.magentaBright.bold("━".repeat(50)));
    
  } catch (error) {
    console.error(chalk.red.bold(`❌ 保存配置文件失败: ${error.message}`));
  }
  
  rl.close();
}

/**
 * 主函数
 */
async function main() {
  try {
    await generateConfig();
  } catch (error) {
    console.error(chalk.red.bold(`❌ 生成配置失败: ${error.message}`));
    rl.close();
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = { generateConfig };
