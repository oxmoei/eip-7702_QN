const contractABI = [
    "function execute((address,uint256,bytes)[] calls) external payable",
    "function execute((address,uint256,bytes)[] calls, bytes signature) external payable",
    "function nonce() external view returns (uint256)"
];

module.exports = { contractABI };
