const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

/**
 * 配置管理器类
 * 用于加载、验证和管理交易配置文件
 */
class ConfigManager {
  constructor() {
    this.configDir = path.join(__dirname, '..', 'call_data');
  }

  /**
   * 加载配置文件
   * @param {string} configName - 配置文件名（不包含扩展名）
   * @returns {Object} 配置对象
   */
  loadConfig(configName) {
    try {
      const configPath = path.join(this.configDir, `${configName}.json`);
      
      if (!fs.existsSync(configPath)) {
        throw new Error(`配置文件不存在: ${configPath}`);
      }

      const configData = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(configData);

      // 验证配置
      this.validateConfig(config);

      console.log(chalk.green(`✅ 成功加载配置文件: ${configName}.json`));
      this.displayConfigSummary(config);

      return config;
    } catch (error) {
      console.error(chalk.red(`❌ 加载配置文件失败: ${error.message}`));
      throw error;
    }
  }

  /**
   * 验证配置文件的完整性
   * @param {Object} config - 配置对象
   */
  validateConfig(config) {
    const requiredFields = ['transactions'];
    
    for (const field of requiredFields) {
      if (!config[field]) {
        throw new Error(`缺少必需字段: ${field}`);
      }
    }

    // 验证交易配置
    if (!Array.isArray(config.transactions) || config.transactions.length === 0) {
      throw new Error('transactions 字段必须是非空数组');
    }

    // 验证每个交易
    config.transactions.forEach((tx, index) => {
      this.validateTransaction(tx, index);
    });

    // 验证 gas 设置（如果存在）
    if (config.gasSettings) {
      this.validateGasSettings(config.gasSettings);
    }
  }

  /**
   * 验证单个交易配置
   * @param {Object} transaction - 交易对象
   * @param {number} index - 交易索引
   */
  validateTransaction(transaction, index) {
    // 根据交易类型验证必需字段
    const txType = transaction.type;
    
    if (!txType) {
      throw new Error(`交易 ${index}: 缺少交易类型字段 'type'`);
    }
    
    // 验证 value 和 data 字段（所有交易类型都需要）
    if (!transaction.hasOwnProperty('value')) {
      throw new Error(`交易 ${index}: 缺少必需字段 'value'`);
    }
    
    if (!transaction.hasOwnProperty('data')) {
      throw new Error(`交易 ${index}: 缺少必需字段 'data'`);
    }
    
    // 验证数值格式 - 根据交易类型进行不同的验证
    if (typeof transaction.value !== 'string') {
      throw new Error(`交易 ${index}: value 字段必须是字符串`);
    }
    
    // 根据交易类型验证 value 字段格式
    switch (txType) {
      case 'ETH_TRANSFER':
        // ETH_TRANSFER 的 value 可以是十进制或十六进制格式
        if (!transaction.value.match(/^0x[0-9a-fA-F]+$/) && !transaction.value.match(/^\d+(\.\d+)?$/)) {
          throw new Error(`交易 ${index}: ETH_TRANSFER 的 value 格式无效，应为十六进制字符串或十进制数字`);
        }
        break;
        
      case 'ERC20_TRANSFER':
        // ERC20_TRANSFER 的 value 应该为 "0"，但必须有 rawValue 字段
        if (transaction.value !== "0") {
          throw new Error(`交易 ${index}: ERC20_TRANSFER 的 value 应该为 "0"`);
        }
        if (!transaction.rawValue) {
          throw new Error(`交易 ${index}: ERC20_TRANSFER 缺少必需字段 'rawValue'`);
        }
        if (!transaction.rawValue.match(/^0x[0-9a-fA-F]+$/)) {
          throw new Error(`交易 ${index}: rawValue 字段必须是十六进制字符串`);
        }
        break;
        
      case 'CONTRACT_CALL':
        // CONTRACT_CALL 的 value 应该为 "0"
        if (transaction.value !== "0") {
          throw new Error(`交易 ${index}: CONTRACT_CALL 的 value 应该为 "0"`);
        }
        break;
        
      case 'RAW_CALL':
        // RAW_CALL 的 value 应该为 "0"
        if (transaction.value !== "0") {
          throw new Error(`交易 ${index}: RAW_CALL 的 value 应该为 "0"`);
        }
        break;
        
      default:
        throw new Error(`交易 ${index}: 未知的交易类型 '${txType}'`);
    }

    // 验证数据格式
    if (typeof transaction.data !== 'string' || !transaction.data.match(/^0x[0-9a-fA-F]*$/)) {
      throw new Error(`交易 ${index}: 无效的 data 格式，应为十六进制字符串`);
    }
    
    // 根据交易类型验证特定字段
    switch (txType) {
      case 'ETH_TRANSFER':
        if (!transaction.hasOwnProperty('to')) {
          throw new Error(`交易 ${index}: ETH_TRANSFER 缺少必需字段 'to'`);
        }
        if (!this.isValidAddress(transaction.to)) {
          throw new Error(`交易 ${index}: 无效的目标地址 ${transaction.to}`);
        }
        break;
        
      case 'ERC20_TRANSFER':
        if (!transaction.hasOwnProperty('to')) {
          throw new Error(`交易 ${index}: ERC20_TRANSFER 缺少必需字段 'to'`);
        }
        if (!transaction.hasOwnProperty('contract')) {
          throw new Error(`交易 ${index}: ERC20_TRANSFER 缺少必需字段 'contract'`);
        }
        if (!this.isValidAddress(transaction.to)) {
          throw new Error(`交易 ${index}: 无效的目标地址 ${transaction.to}`);
        }
        if (!this.isValidAddress(transaction.contract)) {
          throw new Error(`交易 ${index}: 无效的合约地址 ${transaction.contract}`);
        }
        break;
        
      case 'CONTRACT_CALL':
        if (!transaction.hasOwnProperty('contract')) {
          throw new Error(`交易 ${index}: CONTRACT_CALL 缺少必需字段 'contract'`);
        }
        if (!this.isValidAddress(transaction.contract)) {
          throw new Error(`交易 ${index}: 无效的合约地址 ${transaction.contract}`);
        }
        break;
        
      case 'RAW_CALL':
        if (!transaction.hasOwnProperty('contract')) {
          throw new Error(`交易 ${index}: RAW_CALL 缺少必需字段 'contract'`);
        }
        if (!this.isValidAddress(transaction.contract)) {
          throw new Error(`交易 ${index}: 无效的合约地址 ${transaction.contract}`);
        }
        break;
        
      default:
        throw new Error(`交易 ${index}: 未知的交易类型 '${txType}'`);
    }
  }

  /**
   * 验证 gas 设置
   * @param {Object} gasSettings - gas 设置对象
   */
  validateGasSettings(gasSettings) {
    if (typeof gasSettings !== 'object' || gasSettings === null) {
      throw new Error('gasSettings 必须是对象');
    }

    // 验证 gas limit
    if (gasSettings.gasLimit && (typeof gasSettings.gasLimit !== 'number' || gasSettings.gasLimit <= 0)) {
      throw new Error('gasLimit 必须是正整数');
    }

    // 验证 gas price
    if (gasSettings.gasPrice && (typeof gasSettings.gasPrice !== 'string' || !gasSettings.gasPrice.match(/^0x[0-9a-fA-F]+$/))) {
      throw new Error('gasPrice 必须是十六进制字符串');
    }
  }

  /**
   * 验证以太坊地址格式
   * @param {string} address - 地址字符串
   * @returns {boolean} 是否为有效地址
   */
  isValidAddress(address) {
    return typeof address === 'string' && 
           address.match(/^0x[0-9a-fA-F]{40}$/) !== null;
  }

  /**
   * 显示配置摘要
   * @param {Object} config - 配置对象
   */
  displayConfigSummary(config) {
    console.log(chalk.blue('\n📝 配置摘要:'));
    
    // 显示交易数量
    console.log(chalk.gray(`   ┣━📊 交易数量: ${chalk.yellow(config.transactions.length)}`));
    
    // 显示 gas 设置
    if (config.gasSettings) {
      console.log(chalk.gray('⛽ Gas 设置:'));
      if (config.gasSettings.gasLimit) {
        console.log(chalk.gray(`   ┣━ Gas Limit: ${chalk.yellow(config.gasSettings.gasLimit)}`));
      }
      if (config.gasSettings.gasPrice) {
        console.log(chalk.gray(`   ┗━ Gas Price: ${chalk.yellow(config.gasSettings.gasPrice)}`));
      }
    } else {
      console.log(chalk.gray('   ┣━⛽ Gas 设置: 使用默认值'));
    }

    // 显示前几个交易的目标地址
    console.log(chalk.gray('   ┗━🎯 交易目标:'));
    config.transactions.slice(0, 3).forEach((tx, index) => {
      console.log(chalk.gray(`      ${index + 1}. ${chalk.yellow(tx.to)}`));
    });
    
    if (config.transactions.length > 3) {
      console.log(chalk.gray(`   ... 还有 ${config.transactions.length - 3} 个交易`));
    }
    
    console.log(chalk.gray('-----------------------------------------------------------\n'));
  }

  /**
   * 保存配置到文件
   * @param {string} configName - 配置文件名
   * @param {Object} config - 配置对象
   */
  saveConfig(configName, config) {
    try {
      const configPath = path.join(this.configDir, `${configName}.json`);
      const configData = JSON.stringify(config, null, 2);
      
      fs.writeFileSync(configPath, configData, 'utf8');
      console.log(chalk.green(`✅ 配置已保存到: ${configPath}`));
    } catch (error) {
      console.error(chalk.red(`❌ 保存配置文件失败: ${error.message}`));
      throw error;
    }
  }

  /**
   * 获取配置目录中的所有配置文件
   * @returns {Array} 配置文件列表
   */
  listConfigs() {
    try {
      const files = fs.readdirSync(this.configDir);
      return files.filter(file => file.endsWith('.json'));
    } catch (error) {
      console.error(chalk.red(`❌ 读取配置目录失败: ${error.message}`));
      return [];
    }
  }

  /**
   * 检查配置文件是否存在
   * @param {string} configName - 配置文件名
   * @returns {boolean} 是否存在
   */
  configExists(configName) {
    const configPath = path.join(this.configDir, `${configName}.json`);
    return fs.existsSync(configPath);
  }
}

module.exports = ConfigManager;
