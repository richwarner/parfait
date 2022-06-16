const { expect, assert } = require("chai");
const { ethers } = require("hardhat");

async function main() {
  //deploy Parfait.sol (Implementation Contract) from admin
  console.log("\ndeploying Parfait.sol...");
  const Parfait = await ethers.getContractFactory("Parfait");
  parfait = await Parfait.deploy();
  await parfait.deployed();
  console.log("parfait address: ", parfait.address);

  //deploy ParfaitProxyFactory.sol
  console.log("\ndeploying ParfaitProxyFactory.sol...");
  const Ppf = await ethers.getContractFactory("ParfaitProxyFactory");
  ppf = await Ppf.deploy(parfait.address);
  await ppf.deployed();
  console.log("ParfaitProxyFactory address: ", ppf.address);

  //create a parfait proxy contract from signer[1]
  console.log("\ncreating parfait proxy contract...");
  const tx = await ppf.createNewProxy(50, 30, 20, {
    value: ethers.utils.parseEther(".001"),
  });
  const receipt = await tx.wait();
  //get clone address from receipt.events
  const cloneAddress = receipt.events[0].address;
  console.log("clone address: ", cloneAddress);
  //create contract from clone address
  clone = await ethers.getContractAt("Parfait", cloneAddress);

  console.log("\nDeployment Finished, starting testing: \n", receiptBalances);
  const txBalances = await clone.getBalances();
  const receiptBalances = await txBalances.wait();
  console.log("Balances Receipt: \n", receiptBalances);

  const txPrices = await clone.getPrices();
  const receiptPrices = await txPrices.wait();
  console.log("Prices Receipt: \n", receiptPrices);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
