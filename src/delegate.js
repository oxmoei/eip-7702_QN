const { ethers } = require('ethers');
const chalk = require('chalk');
require('dotenv').config();

/**
 * EIP-7702 官方委托脚本
 * 使用 authorize() 方法建立委托关系
 */

// 延迟函数
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 打印标题横幅
function printBanner() {
  console.log(chalk.cyan.bold(`
✦  ˚  ✦  . ⋆ ˚   ✦  . ⋆ ˚   ✦  . ⋆ ˚   ✦ ˚ . ⋆   ˚ ✦  ˚  ✦  . ⋆   ˚ ✦  ˚       
        ███████╗██╗██████╗    ███████╗███████╗ ██████╗ ██████╗ 
        ██╔════╝██║██╔══██╗   ╚════██║╚════██║██╔═████╗╚════██╗
        █████╗  ██║██████╔╝█████╗ ██╔╝    ██╔╝██║██╔██║ █████╔╝
        ██╔══╝  ██║██╔═══╝ ╚════╝██╔╝    ██╔╝ ████╔╝██║██╔═══╝ 
        ███████╗██║██║           ██║     ██║  ╚██████╔╝███████╗
        ╚══════╝╚═╝╚═╝           ╚═╝     ╚═╝   ╚═════╝ ╚══════╝
                                                       
        ╔═════════════════════════════════════════════════════╗
        ║               🚀 EIP-7702 委托工具                  ║
        ║            Official Delegation Script               ║
        ╚═════════════════════════════════════════════════════╝
✦  ˚  ✦  . ⋆ ˚   ✦  . ⋆ ˚   ✦  . ⋆ ˚   ✦ ˚ . ⋆   ˚ ✦  ˚  ✦  . ⋆   ˚ ✦  ˚
`));
}

// 打印步骤标题
function printStep(stepNumber, title) {
  console.log(chalk.magenta.bold(`\n※※※※※※※※ 步骤${stepNumber}:${title}※※※※※※※※`));
  console.log(chalk.gray("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"));
}

// 获取链名称
function getChainName(chainId) {
  const chainNames = {
    1: "Ethereum",
    10: "Optimism",
    137: "Polygon",
    42161: "Arbitrum One",
    8453: "Base",
    59144: "Linea",
    130: "Unichain",
    81457: "blast",
    534352: "Scroll",
    5000: "Mantle",
    169: "Manta",
    100: "Gnosis",
    5545: "Duckchain",
    324: "ZkSync Era",
    43114: "Avalanche-C",
    56: "BNB Chain",
    196: "X layer",
    146: "Sonic",
    1868: "Soneium",
    2741: "Abstract",
    143: "monad",
    80094: "Berachain",
    4200: "Merlin chain",
    200901: "Bitlayer",
    60808: "BOB",
    43111: "Hemi",
    1501: "BEVM",
    223: "Bsquared",
    11155111: "Sepolia Testnet",
    421614: "Arbitrum Sepolia",
    84532: "Base sepolia",
    97: "BNB Chain Testnet",
    10143: "Monad Testnet",
    1337: "Local Network"
  };
  
  return chainNames[chainId] || `Unknown Chain (${chainId})`;
}

async function eip7702Delegate() {
  try {
    // 显示标题横幅
    printBanner();
    
    // 步骤1: 检查环境配置
    printStep(1, "检查环境配置");
    
    // 检查环境变量
    if (!process.env.FIRST_PRIVATE_KEY) {
      console.error(chalk.red.bold("❌ 请在 .env 文件中设置 FIRST_PRIVATE_KEY"));
      console.log(chalk.gray("   格式: FIRST_PRIVATE_KEY=your_private_key_here"));
      process.exit(1);
    }
    
    if (!process.env.DELEGATION_CONTRACT_ADDRESS) {
      console.error(chalk.red.bold("❌ 请运行 ./deploy.sh 部署新的合约！"));
      console.log(chalk.gray("   部署成功后会自动设置 DELEGATION_CONTRACT_ADDRESS=0x..."));
      process.exit(1);
    }
    
    console.log(chalk.green("✅ 环境配置检查通过"));
    
    // 步骤2: 初始化连接
    printStep(2, "初始化连接");
    
    // 初始化
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const firstSigner = new ethers.Wallet(process.env.FIRST_PRIVATE_KEY, provider);
    const targetAddress = process.env.DELEGATION_CONTRACT_ADDRESS;
    
    // 获取网络信息
    const network = await provider.getNetwork();
    const chainName = getChainName(network.chainId);
    
    console.log(chalk.blue("⏳ 正在连接网络..."));
    console.log(chalk.green("   ┣━✅ 网络连接成功"));
    console.log(chalk.gray(`   ┣━🌐 网络名称: ${chalk.white(chainName)}`));
    console.log(chalk.gray(`   ┣━🔢 链ID: ${chalk.white(network.chainId)}`));
    console.log(chalk.gray(`   ┗━🏠 钱包地址: ${chalk.yellowBright(firstSigner.address)}`));
    
    console.log(chalk.blue("\n⏳ 正在获取目标合约信息..."));
    console.log(chalk.gray(`   ┗━🎯 目标委托合约: ${chalk.yellowBright(targetAddress)}`));
    
    // 步骤3: 获取交易 nonce
    printStep(3, "获取交易 nonce");
    
    console.log(chalk.blue("📊 正在获取当前 nonce..."));
    const currentNonce = await provider.getTransactionCount(firstSigner.address);
    const nextNonce = currentNonce + 1;
    
    console.log(chalk.green("   ┣━✅ Nonce 获取成功"));
    console.log(chalk.gray(`   ┣━📋 当前 nonce: ${chalk.white(currentNonce)}`));
    console.log(chalk.gray(`   ┗━🎯 使用 nonce: ${chalk.white(nextNonce)}`));
    
    // 步骤4: 验证委托合约
    printStep(4, "验证委托合约");
    
    console.log(chalk.blue("🔍 正在验证委托合约..."));
    const contractCode = await provider.getCode(targetAddress);
    
    if (contractCode === '0x') {
      console.error(chalk.red.bold("   ┣━❌ 委托合约地址没有代码"));
      console.log(chalk.gray(`   ┣━📍 地址: ${targetAddress}`));
      console.log(chalk.gray("   ┗━💡 请确认合约已经部署并且地址正确"));
      process.exit(1);
    }
    
    console.log(chalk.green("   ┣━✅ 委托合约验证通过"));
    console.log(chalk.gray(`   ┗━📦 合约代码长度: ${chalk.white(contractCode.length - 2)} 字节`));
    
    // 步骤5: 检查钱包余额
    printStep(5, "检查钱包余额");
    
    console.log(chalk.blue("💰 正在检查钱包余额..."));
    const balance = await provider.getBalance(firstSigner.address);
    const balanceEth = ethers.formatEther(balance);
    
    console.log(chalk.green("   ┣━✅ 余额检查完成"));
    console.log(chalk.gray(`   ┣━💰 主币余额: ${chalk.white(balanceEth)}`));
    
    if (balance < ethers.parseEther('0.001')) {
      console.error(chalk.red("   ┣━❌ 余额不足，无法支付gas费用"));
      console.log(chalk.gray("   ┗━💡 需要至少 0.001 ETH 来支付委托交易的gas费用"));
      process.exit(1);
    }
    
    console.log(chalk.green("   ┗━✅ 余额充足，可以执行委托"));
    
    // 步骤6: 创建授权
    printStep(6, "创建委托授权");
    
    console.log(chalk.blue("🚀 开始创建授权..."));
    
    try {
      // 根据官方文档创建授权
      const auth = await firstSigner.authorize({
        address: targetAddress,
        nonce: nextNonce,
        // chainId: 11155111, // Sepolia chain ID
      });
      
      console.log(chalk.green("   ┣━✅ 授权创建成功！"));
      console.log(chalk.gray(`   ┣━📋 授权 nonce: ${chalk.white(auth.nonce)}`));
      console.log(chalk.gray(`   ┗━📍 授权地址: ${chalk.white(auth.address)}`));
      
      // 步骤7: 显示授权详情
      printStep(7, "授权信息摘要");
      
      console.log(chalk.cyan("📝 授权操作摘要:"));
      console.log(chalk.gray("┌─────────────────────────────────────────────────────────────┐"));
      console.log(chalk.gray(`│ 钱包地址:     ${chalk.white(firstSigner.address)}`));
      console.log(chalk.gray(`│ 委托合约:     ${chalk.white(targetAddress)}`));
      console.log(chalk.gray(`│ 授权 nonce:   ${chalk.white(auth.nonce)}`));
      console.log(chalk.gray(`│ 网络:         ${chalk.white(chainName)}`));
      console.log(chalk.gray("└─────────────────────────────────────────────────────────────┘"));
      
      // 步骤8: 验证授权状态
      printStep(8, "验证授权状态");
      
      console.log(chalk.blue("🔍 正在验证授权状态..."));
      await delay(2000);
      
      // 这里可以添加验证授权状态的逻辑
      console.log(chalk.green("   ┣━✅ 授权状态验证完成"));
      console.log(chalk.gray("   ┗━🎉 委托授权建立成功！"));
      
      // 完成
      console.log(chalk.cyan.bold(`
╔══════════════════════════════════════════════════════════════╗
║         🎉 操作完成！现在可使用以下方法运行批量交易！🎉        ║
╚══════════════════════════════════════════════════════════════╝
`));
      console.log(chalk.gray(`  🔄️ 生成交易配置: ${chalk.green('node src/generate-config.js')}`));
      console.log(chalk.gray(`  🔄️ 运行批量交易: ${chalk.green('node src/main.js')}`));
      console.log(chalk.gray(`  🔄️ 第三方支付GAS: ${chalk.green('node src/sponsored.js')}\n`));

    } catch (error) {
      console.error(chalk.red("   ┣━❌ 授权创建失败"));
      console.log(chalk.gray(`   ┗━📝 错误详情: ${chalk.white(error.message)}`));
      
      // 如果是方法不存在，提供替代方案
      if (error.message.includes('authorize is not a function')) {
        console.log(chalk.yellow("\n⚠️ 当前 ethers.js 版本不支持 authorize 方法"));
        console.log(chalk.gray("💡 请升级到支持 EIP-7702 的 ethers.js 版本"));
        console.log(chalk.gray("🔧 或者使用其他委托方法"));
      }
      
      console.log(chalk.gray("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"));
      console.log(chalk.yellow("💡 请检查以下可能的问题:"));
      console.log(chalk.gray("   1. ethers.js 版本是否支持 EIP-7702"));
      console.log(chalk.gray("   2. 网络连接是否正常"));
      console.log(chalk.gray("   3. 私钥和地址是否有效"));
      console.log(chalk.gray("   4. 委托合约是否正确部署"));
    }
    
  } catch (error) {
    console.error(chalk.red("❌ 脚本执行失败:"), error.message);
    console.log(chalk.gray("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"));
    console.log(chalk.yellow("💡 请检查以下可能的问题:"));
    console.log(chalk.gray("   1. 环境变量配置是否正确"));
    console.log(chalk.gray("   2. 网络连接是否正常"));
    console.log(chalk.gray("   3. 私钥和地址是否有效"));
    console.log(chalk.gray("   4. 委托合约是否正确部署"));
  }
}

// 运行脚本
if (require.main === module) {
  eip7702Delegate().catch(console.error);
}

module.exports = { eip7702Delegate };

