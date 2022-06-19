const hre = require("hardhat");
const fs = require('fs');
const path = require('path');
let parfaitProxyFactoryAddress = "0x68B2CF907b04153aDF79ABA0DA8d69f02E592206";

async function main() {

  const parentDir = path.normalize(path.join(__dirname, '..'));

  // Deploy Parfait contract
  const Parfait = await hre.ethers.getContractFactory("Parfait");
  const parfait = await Parfait.deploy();
  await parfait.deployed();
  console.log("Parfait deployed to:", parfait.address);

  // Deploy ParfaitProxyFactory contract
  // ! If you do this, you need to update the data project with the new address and redeploy the subgraph
  // const ParfaitProxyFactory = await hre.ethers.getContractFactory("ParfaitProxyFactory");
  // const parfaitProxyFactory = await ParfaitProxyFactory.deploy(parfait.address);
  // await parfaitProxyFactory.deployed();
  // console.log("ParfaitProxyFactory deployed to:", parfaitProxyFactory.address);
  // parfaitProxyFactoryAddress = parfaitProxyFactory.address;

   // Write the deployment addresses to a config file 
  const config = { parfaitProxyFactoryAddress: parfaitProxyFactoryAddress,  parfaitAddress: parfait.address}
  fs.writeFileSync("./app/src/__config.json", JSON.stringify(config, null, 2));

  // Copy the ABIs to a directory accessible to the app  
  fs.copyFileSync(path.normalize(parentDir + "/artifacts/contracts/ParfaitProxyFactory.sol/ParfaitProxyFactory.json"), path.normalize(parentDir + "/app/src/utils/ParfaitProxyFactory.json"));
  fs.copyFileSync(path.normalize(parentDir + "/artifacts/contracts/Parfait.sol/Parfait.json"), path.normalize(parentDir + "/app/src/utils/Parfait.json"));

  console.log("Config files created.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
