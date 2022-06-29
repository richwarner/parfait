require("dotenv").config();
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");

module.exports = {
  solidity: "0.8.4",
  networks: {
    hardhat: {
      forking: {
        url: "https://eth-rinkeby.alchemyapi.io/v2/03qzbt-DuDaxm4hRUF9NADWsj6DYN1EP",
        blockNumber: 10931335
      }
    },
    kovan: {
      url: process.env.KOVAN_URL,
      accounts: [process.env.PRIVATE_KEY],
    },
    rinkeby: {
      url: process.env.RINKEBY_URL,
      accounts: [process.env.PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_KEY,
  },
};
