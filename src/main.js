const path = require("path");
const dotenv = require("dotenv");
const { ethers } = require("ethers");
const { contractABI } = require(path.join(__dirname, "..", "modules", "contract"));
const ConfigManager = require(path.join(__dirname, "..", "lib", "config-manager"));
const chalk = require("chalk");

dotenv.config();

// 添加延迟函数以避免请求频率限制
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 全局变量
let provider, firstSigner, targetAddress;

/**
 * 初始化签名者和连接
 */
async function initializeSigners() {
  // 检查环境变量
  if (
    !process.env.FIRST_PRIVATE_KEY ||
    !process.env.DELEGATION_CONTRACT_ADDRESS ||
    !process.env.RPC_URL
  ) {
    console.error(chalk.red.bold("❌ 请在 .env 文件中设置必要的环境变量。"));
    process.exit(1);
  }

  const rpcUrl = process.env.RPC_URL;
  provider = new ethers.JsonRpcProvider(rpcUrl);

  firstSigner = new ethers.Wallet(process.env.FIRST_PRIVATE_KEY, provider);
  targetAddress = process.env.DELEGATION_CONTRACT_ADDRESS;

  // 获取链信息
  await delay(300);
  const network = await provider.getNetwork();
  const chainId = network.chainId;
  const chainName = getChainName(chainId);
  
  console.log(chalk.blue(`🌐 网络信息: ${chalk.yellowBright(chainName)} (Chain ID: ${chalk.white(chainId)})`));
  console.log(chalk.blue(`🏠 钱包地址: ${chalk.yellowBright(firstSigner.address)}`));

  // 检查余额
  await delay(300);
  const firstBalance = await provider.getBalance(firstSigner.address);
  console.log(chalk.blue(`💰 主币余额: ${chalk.yellowBright(ethers.formatEther(firstBalance))}`));
}

/**
 * 根据 Chain ID 获取链名称
 * @param {number} chainId - 链 ID
 * @returns {string} 链名称
 */
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



/**
 * 检查委托状态
 * @param {string} address - 要检查的地址
 * @returns {string|null} 委托的合约地址或null
 */
async function checkDelegationStatus(address = firstSigner.address) {
  console.log(chalk.greenBright.bold("\n🔍 检查钱包地址委托状态"));
  console.log(chalk.gray("-----------------------------------------------------------"));

  try {
    await delay(300);
    // 获取EOA地址的代码
    const code = await provider.getCode(address);

    if (code === "0x") {
      console.log(chalk.red(`❌ 未找到 ${chalk.white(address)} 的委托`));
      return null;
    }

    // 检查是否为EIP-7702委托（以0xef0100开头）
    if (code.startsWith("0xef0100")) {
      // 提取委托地址（移除0xef0100前缀）
      const delegatedAddress = "0x" + code.slice(8);

      console.log(chalk.green(`✅ 找到 ${chalk.white(address)} 的委托合约`));
      console.log(chalk.gray(`   ┗━📍 委托给: ${chalk.yellowBright(delegatedAddress)}`));

      return delegatedAddress;
    } else {
      console.log(chalk.yellow(`❓ 地址有代码但不是EIP-7702委托: ${chalk.gray(code)}`));
      return null;
    }
  } catch (error) {
    console.error(chalk.red("❌ 检查委托状态时出错:"), error);
    return null;
  }
}

/**
 * 验证合约地址
 * @param {string} address - 合约地址
 * @returns {Promise<boolean>} 是否为有效合约
 */
async function validateContractAddress(address) {
  try {
    const code = await provider.getCode(address);
    return code !== "0x";
  } catch (error) {
    console.log(chalk.yellow(`⚠️ 验证合约地址失败: ${address}`));
    return false;
  }
}



/**
 * 创建授权
 * @param {number} nonce - nonce值
 * @returns {object} 授权对象
 */
async function createAuthorization(nonce) {
  const auth = await firstSigner.authorize({
    address: targetAddress,
    nonce: nonce,
  });

  console.log(chalk.green("✅ 授权创建成功"));
  console.log(chalk.gray(`   ┗━🆔 Nonce: ${chalk.white(auth.nonce)}`));
  return auth;
}

/**
 * 执行批量交易
 */
async function sendNonSponsoredTransaction() {
  console.log(chalk.greenBright.bold("\n🚀 批量交易开始"));
  console.log(chalk.gray("-----------------------------------------------------------"));

  // 加载配置文件
  const configManager = new ConfigManager();
  const config = configManager.loadConfig("config");

  await delay(300);
  const currentNonce = await firstSigner.getNonce();
  console.log(chalk.blue(`🆔 当前nonce: ${chalk.white(currentNonce)}`));

  // 为同一钱包交易创建递增nonce的授权
  const auth = await createAuthorization(currentNonce + 1);

  // 从配置文件构建调用数组
  const calls = [];
  console.log(chalk.blue("\n📜 准备执行以下交易:"));
  console.log(chalk.gray("   -----------------------------------------------"));
  
  config.transactions.forEach((tx, index) => {
    const description = tx.description || `交易 ${index + 1}`;
    
    try {
      if (tx.type === 'ETH_TRANSFER') {
        // 处理 value 字段，支持十进制和十六进制格式
        let value;
        if (tx.value.startsWith('0x')) {
          // 十六进制格式
          value = ethers.getBigInt(tx.value);
        } else {
          // 十进制格式，转换为 wei
          value = ethers.parseEther(tx.value);
        }
        calls.push([tx.to, value, "0x"]);
        console.log(chalk.gray(`  ${index + 1}. ${description} (${tx.type})`));
        console.log(chalk.cyan(`       目标地址: ${chalk.white(tx.to)}`));
        console.log(chalk.cyan(`       转账数额: ${chalk.yellowBright(tx.value)} 个主币`));
      } else if (tx.type === 'ERC20_TRANSFER') {
        // 对于ERC20转账，使用配置文件中的合约地址
        if (!tx.contract) {
          throw new Error(`ERC20_TRANSFER交易 ${index} 需要指定 contract 字段`);
        }
        const erc20ABI = ["function transfer(address to, uint256 amount) external returns (bool)"];
        const erc20Interface = new ethers.Interface(erc20ABI);
        // 使用 rawValue 字段，如果不存在则使用 value 字段
        const amount = tx.rawValue ? ethers.getBigInt(tx.rawValue) : ethers.getBigInt(tx.value);
        const callData = erc20Interface.encodeFunctionData("transfer", [tx.to, amount]);
        calls.push([tx.contract, 0n, callData]);
        
        // 计算并显示转账数额
        let displayAmount;
        if (tx.rawValue) {
          // 如果有 rawValue，将其转换为可读格式
          const rawAmount = ethers.getBigInt(tx.rawValue);
          if (tx.decimals) {
            displayAmount = ethers.formatUnits(rawAmount, tx.decimals);
          } else {
            displayAmount = ethers.formatUnits(rawAmount, 18); // 默认18位小数
          }
        } else {
          displayAmount = tx.value;
        }
        
        console.log(chalk.gray(`  ${index + 1}. ${description} (${tx.type})`));
        console.log(chalk.cyan(`       目标地址: ${chalk.white(tx.to)}`));
        console.log(chalk.cyan(`       转账数额: ${chalk.yellowBright(displayAmount)} 个代币`));
      } else if (tx.type === 'CONTRACT_CALL') {
        // 对于合约调用，使用指定的合约地址
        const contractInterface = new ethers.Interface(tx.abi || []);
        
        // 处理 args 中的十进制字符串，转换为适当的格式
        const processedArgs = tx.args.map((arg, argIndex) => {
          if (typeof arg === 'string' && !arg.startsWith('0x') && !isNaN(parseFloat(arg))) {
            // 如果是十进制字符串，根据函数参数类型进行转换
            const functionFragment = contractInterface.getFunction(tx.function);
            const paramType = functionFragment.inputs[argIndex];
            
            if (paramType.type === 'uint256' || paramType.type === 'uint') {
              // 对于 uint256 参数，如果有 rawAmount 字段，使用它；否则转换为 wei
              if (tx.rawAmount && argIndex === 1) { // 假设第二个参数是 amount
                return ethers.getBigInt(tx.rawAmount);
              } else {
                // 尝试解析为数字并转换为 wei
                const numValue = parseFloat(arg);
                if (tx.decimals) {
                  return ethers.parseUnits(arg, tx.decimals);
                } else {
                  return ethers.parseEther(arg);
                }
              }
            }
          }
          return arg;
        });
        
        const encodedData = contractInterface.encodeFunctionData(tx.function, processedArgs);
        // CONTRACT_CALL 的 value 应该为 "0"，不需要处理
        calls.push([tx.contract, 0n, encodedData]);
        console.log(chalk.gray(`  ${index + 1}. ${description} (${tx.type})`));
        console.log(chalk.cyan(`       合约地址: ${chalk.white(tx.contract)}`));
        console.log(chalk.cyan(`       函数调用: ${chalk.white(tx.function)}`));
        console.log(chalk.cyan(`       参数: ${chalk.gray(JSON.stringify(tx.args))}`));
      } else if (tx.type === 'RAW_CALL') {
        // 对于原始调用，使用指定的合约地址
        // RAW_CALL 的 value 应该为 "0"，不需要处理
        calls.push([tx.contract, 0n, tx.data || "0x"]);
        console.log(chalk.gray(`  ${index + 1}. ${description} (${tx.type})`));
        console.log(chalk.cyan(`       合约地址: ${chalk.white(tx.contract)}`));
        console.log(chalk.cyan(`       原始数据: ${chalk.gray(tx.data || "0x")}`));
      }
      console.log('');
    } catch (error) {
      console.error(chalk.red(`❌ 构建交易 ${index + 1} 失败:`), error.message);
      throw error;
    }
  });
  console.log(chalk.gray("   -----------------------------------------------"));

  // 创建合约实例并执行
  const delegatedContract = new ethers.Contract(
    firstSigner.address,
    contractABI,
    firstSigner
  );

  await delay(config.settings.delay_between_calls);
  
  const tx = await delegatedContract["execute((address,uint256,bytes)[])"](
    calls,
    {
      type: 4,
      authorizationList: [auth],
    }
  );

  console.log(chalk.green("✅ 交易已捆绑发送"));
  console.log(chalk.gray(`   ┗━🆔 交易哈希: ${chalk.yellowBright(tx.hash)}`));

  await delay(1000);
  const receipt = await tx.wait();
  console.log(chalk.green("\n✅ 交易确认成功"));
  console.log(chalk.gray(`   ┣━📊 交易状态: ${receipt.status === 1 ? chalk.green("✅ 成功") : chalk.red("❌ 失败")}`));
  console.log(chalk.gray(`   ┣━🔢 区块号: ${chalk.white(receipt.blockNumber)}`));
  console.log(chalk.gray(`   ┗━⛽ Gas使用: ${chalk.white(receipt.gasUsed.toString())}`));

  return receipt;
}

/**
 * 主函数：执行非赞助交易演示
 */
async function executeNonSponsoredDemo() {
  try {
    // 打印精美的标题横幅
    console.log(chalk.cyan.bold(`
✦  ˚  ✦  . ⋆ ˚   ✦  . ⋆ ˚   ✦  . ⋆ ˚   ✦ ˚ . ⋆   ˚ ✦  ˚  ✦  . ⋆   ˚ ✦  ˚       
          ███████╗██╗██████╗    ███████╗███████╗ ██████╗ ██████╗ 
          ██╔════╝██║██╔══██╗   ╚════██║╚════██║██╔═████╗╚════██╗
          █████╗  ██║██████╔╝█████╗ ██╔╝    ██╔╝██║██╔██║ █████╔╝
          ██╔══╝  ██║██╔═══╝ ╚════╝██╔╝    ██╔╝ ████╔╝██║██╔═══╝ 
          ███████╗██║██║           ██║     ██║  ╚██████╔╝███████╗
          ╚══════╝╚═╝╚═╝           ╚═╝     ╚═╝   ╚═════╝ ╚══════╝
                                                       
          ╔══════════════════════════════════════════════════════╗
          ║              🎯 EIP-7702 批量交易                    ║
          ║       Non-Sponsored Smart Account Operations         ║
          ╚══════════════════════════════════════════════════════╝
✦  ˚  ✦  . ⋆ ˚   ✦  . ⋆ ˚   ✦  . ⋆ ˚   ✦ ˚ . ⋆   ˚ ✦  ˚  ✦  . ⋆   ˚ ✦  ˚
`));
    
    // 初始化签名者
    console.log(chalk.magenta.bold("\n※※※※※※※※ 步骤1:初始化签名者和连接※※※※※※※※"));
    console.log(chalk.gray("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"));
    await initializeSigners();
    console.log("");

    // 检查初始委托状态
    console.log(chalk.magenta.bold("\n※※※※※※※※ 步骤2:检查初始委托状态※※※※※※※※"));
    console.log(chalk.gray("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"));
    await checkDelegationStatus();
    console.log("");

    // 执行批量交易
    console.log(chalk.magenta.bold("\n※※※※※※※※ 步骤3:执行批量交易※※※※※※※※"));
    console.log(chalk.gray("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"));
    const receipt = await sendNonSponsoredTransaction();
    console.log("");

    // 完成总结
    console.log(chalk.green.bold(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                            🎉 批量交易完成！                                 ║
╚══════════════════════════════════════════════════════════════════════════════╝
`));

    return receipt;
  } catch (error) {
    console.log(chalk.red.bold(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                             💥 脚本执行失败                                   ║
║                            Script Execution Failed                           ║
╚══════════════════════════════════════════════════════════════════════════════╝
`));
    console.log(chalk.red.bold(`❌ 错误详情: ${error.message}`));
    console.log(chalk.gray("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"));
    console.log(chalk.yellow("💡 请检查以下可能的问题:"));
    console.log(chalk.yellow("   1. 环境变量配置是否正确"));
    console.log(chalk.yellow("   2. 网络连接是否正常"));
    console.log(chalk.yellow("   3. 私钥和地址是否有效"));
    console.log(chalk.yellow("   4. 配置文件是否存在且格式正确"));
    console.log(chalk.gray("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"));
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  executeNonSponsoredDemo()
    .catch((error) => {
      console.error(chalk.red.bold("❌ 批量交易失败:"), error);
      process.exit(1);
    });
}

module.exports = { 
  executeNonSponsoredDemo,
  sendNonSponsoredTransaction,
  checkDelegationStatus,
  initializeSigners
};
