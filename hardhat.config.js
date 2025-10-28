require("@nomicfoundation/hardhat-toolbox");

/**
 * @type import('hardhat/config').HardhatUserConfig
 * Hardhat project configuration setup for compiling Solidity smart contracts.
 * By default, compiles with Solidity version 0.8.28.
 */
module.exports = {
  solidity: "0.8.28",
  // Local network settings default to localhost:8545 when running hardhat node
};
