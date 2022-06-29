const hre = require("hardhat");
const fs = require('fs');
const path = require('path');
let parfaitProxyFactoryAddress = "0xaCCd03b9783Ed377d089551f1e2Bf3f8527246D0";
let parfaitAddress = "0x6DE93898A1E64Ba83c5D1357822613ceCC3F69FA";
// let testProxyFactoryAddress = "0xCBce12E686BEC16D54D2118c42022dAEA2dDeD26";
// let testAddress = "0xD5D1Ce9f79c63010e9eaa8Be37a22f8b8e89d19D";

async function main() {

  const parentDir = path.normalize(path.join(__dirname, '..'));

  // Deploy Parfait contract
  const Parfait = await hre.ethers.getContractFactory("Parfait");
  const parfait = await Parfait.deploy();
  await parfait.deployed();
  console.log("Parfait deployed to:", parfait.address);
  parfaitAddress = parfait.address;

  // Deploy ParfaitProxyFactory contract
  // ! If you do this, you need to update the data project with the new address and redeploy the subgraph
  // (Do a project search on the value stored in parfaitProxyFactoryAddress above)
  // (Then run graph deploy --product hosted-service richwarner/parfait from data/parfait folder)
  const ParfaitProxyFactory = await hre.ethers.getContractFactory("ParfaitProxyFactory");
  const parfaitProxyFactory = await ParfaitProxyFactory.deploy(parfait.address);
  await parfaitProxyFactory.deployed();
  console.log("ParfaitProxyFactory deployed to:", parfaitProxyFactory.address);
  parfaitProxyFactoryAddress = parfaitProxyFactory.address;

  // // Deploy Test contract
  // const Test = await hre.ethers.getContractFactory("Test");
  // const test = await Test.deploy();
  // await test.deployed();
  // console.log("Test deployed to:", test.address);
  // testAddress = test.address;
  
  // // Deploy TestProxyFactory contract  
  // const TestProxyFactory = await hre.ethers.getContractFactory("TestProxyFactory");
  // const testProxyFactory = await TestProxyFactory.deploy(test.address);
  // await testProxyFactory.deployed();
  // console.log("TestProxyFactory deployed to:", testProxyFactory.address);
  // testProxyFactoryAddress = testProxyFactory.address;

   // Write the deployment addresses to a config file 
  // const config = { parfaitProxyFactoryAddress: parfaitProxyFactoryAddress, parfaitAddress: parfaitAddress, testProxyFactoryAddress: testProxyFactoryAddress, testAddress: testAddress}
  const config = { parfaitProxyFactoryAddress: parfaitProxyFactoryAddress, parfaitAddress: parfaitAddress}
  fs.writeFileSync("./app/src/__config.json", JSON.stringify(config, null, 2));

  // Copy the ABIs to a directory accessible to the app  
  fs.copyFileSync(path.normalize(parentDir + "/artifacts/contracts/ParfaitProxyFactory.sol/ParfaitProxyFactory.json"), path.normalize(parentDir + "/app/src/utils/ParfaitProxyFactory.json"));
  fs.copyFileSync(path.normalize(parentDir + "/artifacts/contracts/Parfait.sol/Parfait.json"), path.normalize(parentDir + "/app/src/utils/Parfait.json"));
  // fs.copyFileSync(path.normalize(parentDir + "/artifacts/contracts/TestProxyFactory.sol/TestProxyFactory.json"), path.normalize(parentDir + "/app/src/utils/TestProxyFactory.json"));
  // fs.copyFileSync(path.normalize(parentDir + "/artifacts/contracts/Test.sol/Test.json"), path.normalize(parentDir + "/app/src/utils/Test.json"));

  console.log("Config files created.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
