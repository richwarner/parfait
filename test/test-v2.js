const { expect, assert } = require("chai");
const { ethers } = require("hardhat");

describe("ParfaitProxyFactory", function () {
  let clone1User1, signers;

  before(
    "deploy Parfait, ParfaitContractFactory & 1 Parfait Proxy",
    async function () {
      signers = await hre.ethers.getSigners();
      console.log("admin: ", signers[0].address);
      console.log("user1: ", signers[1].address);
      console.log("user2: ", signers[2].address);
      //deploy Parfait.sol (Implementation Contract) from admin
      console.log("\ndeploying Parfait.sol...");
      const Parfait = await ethers.getContractFactory("Parfait", signers[0]);
      const parfait = await Parfait.deploy();
      // console.log("parfait interface:\n%s\n", JSON.stringify(parfait.interface));
      await parfait.deployed();
      console.log("parfait address: ", parfait.address);

      //deploy ParfaitProxyFactory.sol
      console.log("\ndeploying ParfaitProxyFactory.sol...");
      const Ppf = await ethers.getContractFactory(
        "ParfaitProxyFactory",
        signers[0]
      );
      ppf = await Ppf.deploy(parfait.address);
      await ppf.deployed();
      console.log("ParfaitProxyFactory address: ", ppf.address);

      // IT APPEARS LOCAL TESTNETS CAN'T LISTEN FOR EVENTS, GET CLONE ADDRESS BELOW VIA RECEIPT EVENTS
      //setup event listener on factory
      // console.log("\nadding event listener...")
      // ppf.on("NewClone", (cloneAddress) => {
      //   console.log("New clone at: ", cloneAddress);
      // }); 

      //create a parfait proxy contract from signer[1]
      console.log("\ncreating parfait proxy contract...");
      const ppfUser1 = ppf.connect(signers[1]);
      // console.log("interface:\n" + JSON.stringify(ppfUser1.interface));
      console.log("\nusing signer: %s", signers[1].address);
        const tx = await ppfUser1.createNewProxy(50, 30, 20, {
        value: ethers.utils.parseEther("1"),
      });
      const receipt = await tx.wait();
      //get clone address from receipt.events
      console.log(receipt.events);
      const clone1Address = receipt.events[23].args[1];
      console.log("clone address: ", clone1Address);
      //create contract from clone address
      clone1User1 = await ethers.getContractAt(
        "Parfait",
        clone1Address,
        signers[1]
      );
      // console.log(hre.ethers.provider);
    }
  );

  it("owner set", async function () {
    assert.equal(await clone1User1.owner(), signers[1].address);
  });

  it("user can call updateAllocationsAndRebalance", async function () {
    const tx = await clone1User1.updateAllocationsAndRebalance(33,33,34);
    const success = await tx.wait();
    assert(success);
  });

  it("owner can call getBalances()", async function () {
    const result = await clone1User1.getBalances();    
    const {0: ETHBalance, 1: WBTCBalance, 2: DAIBalance} = result;
    console.log(`ETHBalance: ${ETHBalance} | WBTCBalance: ${WBTCBalance} | DAIBalance: ${DAIBalance}`);
    assert(result);
  });

  it("owner can withdraw ", async function () {
    const tx = await clone1User1.withdraw();
    const success = await tx.wait();
    assert(success);    
    const result = await clone1User1.getBalances();
    const {0: ETHBalance, 1: WBTCBalance, 2: DAIBalance} = result;
    console.log(`ETHBalance: ${ETHBalance} | WBTCBalance: ${WBTCBalance} | DAIBalance: ${DAIBalance}`);
    expect(ETHBalance).equal(0);
    expect(WBTCBalance).equal(0);
    expect(DAIBalance).equal(0);
  });

  it("other user can not call updateAllocationsAndRebalance", async function () {
    const clone1User2 = clone1User1.connect(signers[2]);
    expect(clone1User2.updateAllocationsAndRebalance(10,90,0)).to.be.reverted;
  });

});
