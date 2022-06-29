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
      parfait = await Parfait.deploy();
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

      /*     //IT APPEARS LOCAL TESTNETS CAN LISTEN FOR EVENTS, GET CLONE ADDRESS BELOW VIA RECEIPT EVENTS
    //setup event listener on factory
    console.log("\nadding event listener...")
    ppf.on("NewClone", (cloneAddress) => {
      console.log("New clone at: ", cloneAddress);
    }); */

      //create a parfait proxy contract from signer[1]
      console.log("\ncreating parfait proxy contract...");
      const ppfUser1 = ppf.connect(signers[1]);
      const tx = await ppfUser1.createNewProxy(85, 10, 5, {
        value: ethers.utils.parseEther("1"),
      });
      const receipt = await tx.wait();
      //get clone address from receipt.events
      const clone1Address = receipt.events[0].address;
      console.log("clone address: ", clone1Address);
      //create contract from clone address
      clone1User1 = await ethers.getContractAt(
        "Parfait",
        clone1Address,
        signers[1]
      );
    }
  );

  it("owner set", async function () {
    assert.equal(await clone1User1.owner(), signers[1].address);
  });

  it("owner can call rebalance()", async function () {
    const balances1 = await clone1User1.getBalances();
    console.log(balances1);
    const tx1 = await clone1User1.updateAllocationsAndRebalance(5, 35, 60);
    await tx1.wait();
    const balances2 = await clone1User1.getBalances();
    console.log(balances2);
    assert(balance1[0] > balance2[0]);
  });

  it("other user can not call rebalance()", async function () {
    const clone1User2 = clone1User1.connect(signers[2]);
    await expect(clone1User2.updateAllocationsAndRebalance(33, 33, 34)).to.be.reverted;
  });

});