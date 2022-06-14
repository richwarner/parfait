const hre = require("hardhat");
const fs = require('fs');

async function main() {

  const Parfait = await hre.ethers.getContractFactory("Parfait");
  const parfait = await Parfait.deploy("Hello, Parfait App!");

  await parfait.deployed();

  // Write the deployment address to a config file 
  const config = { parfaitAddress: parfait.address }
  fs.writeFileSync(".\\app\\src\\__config.json", JSON.stringify(config, null, 2));

  // Copy the ABI to a directory accessible to the app
  fs.copyFileSync(".\\artifacts\\contracts\\Parfait.sol\\Parfait.json", ".\\app\\src\\utils\\Parfait.json");

  console.log("Parfait deployed to:", parfait.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
