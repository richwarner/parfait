//const hre = require("hardhat");
import {ethers} from 'ethers';
import './App.css';
import parfaitJSON from './utils/Parfait.json';
import parfaitProxyFactoryJSON from './utils/ParfaitProxyFactory.json';
import React from 'react';
import config from './__config'; 
import { createClient } from 'urql';
const GRAPH_API_URL = 'https://api.thegraph.com/subgraphs/name/richwarner/parfait';
const COMPOUND_API_URL = 'https://api.compound.finance/api/v2/ctoken';
const { ethereum } = window;
let provider;
let signer;
const DISABLE_RESTORE_USER = false;

function App() {

  // State variables
  const [userAddress, setUserAddress] = React.useState("Connect");
  const [proxyAddress, setProxyAddressState] = React.useState("");
  const [deposit, setDeposit] = React.useState("0");
  const [xSavedAllocation, setXSavedAllocation] = React.useState("");
  const [ySavedAllocation, setYSavedAllocation] = React.useState("");
  const [zSavedAllocation, setZSavedAllocation] = React.useState("");
  const [xBalance, setXBalance] = React.useState("");
  const [yBalance, setYBalance] = React.useState("");
  const [zBalance, setZBalance] = React.useState("");  
  const [xCurrentAllocation, setXCurrentAllocation] = React.useState("");
  const [yCurrentAllocation, setYCurrentAllocation] = React.useState("");
  const [zCurrentAllocation, setZCurrentAllocation] = React.useState("");
  const [xAllocation, setXAllocation] = React.useState("");
  const [yAllocation, setYAllocation] = React.useState("");
  const [zAllocation, setZAllocation] = React.useState("");  
  const [xPrice, setXPrice] = React.useState("");
  const [yPrice, setYPrice] = React.useState("");
  const [zPrice, setZPrice] = React.useState(""); 
  const [xRate, setXRate] = React.useState(""); 
  const [yRate, setYRate] = React.useState("");  
  const [zRate, setZRate] = React.useState("");   
  const [totalBalance, setTotalBalance] = React.useState(""); 
  const [submitPortfolioText, setSubmitPortfolioText] = React.useState("Create Portfolio");
  const [successMessage, setSuccessMessage] = React.useState("");
  const [failMessage, setFailMessage] = React.useState("");

  async function connectWallet() {
    // Show loading spinner
    document.querySelector("#btn-connect").classList.add("d-none");
    document.querySelector("#btn-connect-loading").classList.remove("d-none");
    
    // Try to connect
    if(ethereum) {
      let userExistingProxyContract;
      await ethereum.request({ method: 'eth_requestAccounts'});
      provider = new ethers.providers.Web3Provider(ethereum);
      signer = provider.getSigner(0);
      const connectedUserAddress = await signer.getAddress();
      setUserAddress(connectedUserAddress);

      // Retrieve any existing portfolios for this user address
      if(!DISABLE_RESTORE_USER) {
        userExistingProxyContract = await getUserProxyAddress(connectedUserAddress);
        setProxyAddress(userExistingProxyContract); 
      }

      // Fetch portfolio data (if no portfolio yet for this user, still populate pricing)
      populatePortfolio(userExistingProxyContract);

    } else {
      console.log("MetaMask not available");
    }          
    
    // Remove loading spinner
    document.querySelector("#btn-connect").classList.remove("d-none");
    document.querySelector("#btn-connect-loading").classList.add("d-none");
  }

  function setProxyAddress(addr) {
    if(addr) {
      setSubmitPortfolioText("Update Portfolio");
    }
    setProxyAddressState(addr);
  }
 
  // Fetch current balances and allocations
  async function populatePortfolio(userProxyAddress) {
    if(!signer) return;

    let proxyContract;
    let totalBalanceNumeric;

    if(userProxyAddress) {
      proxyContract = new ethers.Contract(userProxyAddress, parfaitJSON.abi, signer);
    }
    
    try {
      // Get allocations
      if(userProxyAddress) {
        const savedAllocationX = await proxyContract.CETHAllocation(); 
        const savedAllocationY = await proxyContract.CWBTCAllocation(); 
        const savedAllocationZ = await proxyContract.CDAIAllocation();
        setXSavedAllocation(savedAllocationX.toString() + "%"); 
        setYSavedAllocation(savedAllocationY.toString() + "%"); 
        setZSavedAllocation(savedAllocationZ.toString() + "%"); 
        console.log("Saved allocation X: %s", savedAllocationX); 
        console.log("Saved allocation Y: %s", savedAllocationY); 
        console.log("Saved allocation Z: %s", savedAllocationZ); 
      }      

      // Get prices, balances, and calculated allocations
      if(userProxyAddress) {
        const prices = await proxyContract.getPrices(); 
        const priceX = prices[0] / 10e7; 
        const priceY = prices[1] / 10e7; 
        const priceZ = prices[2] / 10e7; 
        setXPrice((priceX).toLocaleString('en-US', {style: 'currency', currency: 'USD',})); 
        setYPrice((priceY).toLocaleString('en-US', {style: 'currency', currency: 'USD',}));  
        setZPrice((priceZ).toLocaleString('en-US', {style: 'currency', currency: 'USD',}));    
        console.log("Price X: %s", priceX); 
        console.log("Price Y: %s", priceY); 
        console.log("Price Z: %s", priceZ);  

        const balances = await proxyContract.getBalances();
        const balanceX = balances[0] / 10e16; 
        const balanceY = balances[1] / 10e31; 
        const balanceZ = balances[2] / 10e21; 
        setXBalance(balanceX.toFixed(5).toLocaleString('en-US')); 
        setYBalance(balanceY.toFixed(5).toLocaleString('en-US')); 
        setZBalance(balanceZ.toFixed(5).toLocaleString('en-US')); 
        console.log("Balance X: %s", balanceX); 
        console.log("Balance Y: %s", balanceY); 
        console.log("Balance Z: %s", balanceZ);

        totalBalanceNumeric = (balanceX * priceX) + (balanceY * priceY) + (balanceZ * priceZ);
        setTotalBalance(totalBalanceNumeric.toLocaleString('en-US', {style: 'currency', currency: 'USD',}));
        const currentAllocationX = (balanceX * priceX) / totalBalanceNumeric * 100 || 0;
        const currentAllocationY = (balanceY * priceY) / totalBalanceNumeric * 100 || 0;
        const currentAllocationZ = (balanceZ * priceZ) / totalBalanceNumeric * 100 || 0;
        setXCurrentAllocation((currentAllocationX).toFixed(1).toLocaleString('en-US') + "%"); 
        setYCurrentAllocation((currentAllocationY).toFixed(1).toLocaleString('en-US') + "%"); 
        setZCurrentAllocation((currentAllocationZ).toFixed(1).toLocaleString('en-US') + "%"); 
        console.log("Current Allocation X: %s", currentAllocationX); 
        console.log("Current Allocation Y: %s", currentAllocationY); 
        console.log("Current Allocation Z: %s", currentAllocationZ);
      }

      // Get rates
      try {
        const response = await fetch(COMPOUND_API_URL);
        const cTokens = (await response.json()).cToken;      
        // console.log(cTokens);
        console.log("Fetching Compound supply rates")
        const xRate = (cTokens.find(item => item.symbol === "cETH").supply_rate.value * 100).toFixed(3) + "%";
        const yRate = (cTokens.find(item => item.symbol === "cWBTC2").supply_rate.value * 100).toFixed(3) + "%";
        const zRate = (cTokens.find(item => item.symbol === "cDAI").supply_rate.value * 100).toFixed(3) + "%";
        setXRate(xRate);       
        setYRate(yRate);  
        setZRate(zRate);     
      } catch (err) {
        console.log("Error fetching Compound rates:", err);
      }

      // Set input state
      if(userProxyAddress) {        
        const matches = document.querySelectorAll(".position-details");
        matches.forEach(match => match.classList.remove("d-none"));
        setXAllocation("");
        setYAllocation("");
        setZAllocation("");
        setDeposit("0");
        (totalBalanceNumeric > 0) ? document.querySelector("#btn-withdraw").classList.remove("d-none") : document.querySelector("#btn-withdraw").classList.add("d-none");        
      }

    } catch (err) {
      console.log("Error fetching user portfolio: %s", err);
    }
  }

  // Check subgraph for existing user proxy contract
  async function getUserProxyAddress(addr) {
    const eventQuery = `{ parfaitNewCloneEvents(where: {_owner: "${addr}"}) { id count _owner _clone } }`;
    let userProxyAddr = "";
    const client = createClient({
      url: GRAPH_API_URL,
    })
    try {
      const result = await client.query(eventQuery).toPromise();
      userProxyAddr = (result.data.parfaitNewCloneEvents.length) ? result.data.parfaitNewCloneEvents[0]._clone : "";
      (userProxyAddr) ? console.log("Found existing proxy contract for user: " + userProxyAddr) : console.log("No existing proxy contract found");
    } catch (err) {
      console.log(err);
    }
    return userProxyAddr;
  }

  // Handles create new and update portfolio
  async function updatePortfolio() {
    // if(!signer) return;

    console.log("Updating portfolio");
    
    // Show loading spinner
    document.querySelector("#btn-submit-portfolio").classList.add("d-none");
    document.querySelector("#btn-submit-portfolio-loading").classList.remove("d-none");
    document.querySelector("#btn-withdraw").classList.add("d-none");

    try {
      
      if(!proxyAddress) {  
        
        if(formIsValid(false)) {        
          // Create proxy contract                 
          console.log("Creating new proxy contract for user %s with %s eth", await signer.getAddress(), deposit);
          const factoryContract = new ethers.Contract(config.parfaitProxyFactoryAddress, parfaitProxyFactoryJSON.abi, signer);
          const tx = await factoryContract.createNewProxy(xAllocation, yAllocation, zAllocation, {
            value: ethers.utils.parseEther(deposit),
          });
          const receipt = await tx.wait();   
          // console.log("receipt: %s", JSON.stringify(receipt));
          // console.log("events: %s", JSON.stringify(receipt.events));
          const addr = receipt.events[23].args[1];     
          console.log("Address of new proxy contract: " + addr);
          setProxyAddress(addr);  
          document.querySelector('#proxyAddressContainer').classList.add('animate__animated', 'animate__fadeIn', 'animate__delay-1s');
          // Update UI
          console.log("Updating UI for address: %s",  addr);
          populatePortfolio(addr);
          // Success message
          setSuccessMessage("Your contract has been created and your portfolio allocations set.");
          document.querySelector("#successMessage").classList.remove("d-none");
        }

      } else { 
        
        if(formIsValid(true)) {  
          // Update existing proxy contract           
          console.log("Updating existing proxy contract at %s with signer %s", proxyAddress, await signer.getAddress());  
          // Use the Parfait ABI to get a connection to the proxy contract
          const proxyContract = new ethers.Contract(proxyAddress, parfaitJSON.abi, signer);
          const tx = await proxyContract.updateAllocationsAndRebalance(xAllocation, yAllocation, zAllocation, {
            value: ethers.utils.parseEther(deposit),
          });
          const receipt = await tx.wait();  
          // Update UI
          populatePortfolio(proxyAddress); 
          // Success message
          setSuccessMessage("Your portfolio allocations have been updated.");
          document.querySelector("#successMessage").classList.remove("d-none");
        }  
      }      

    } catch (err) {
      console.log(err);
      // Update UI
      populatePortfolio(proxyAddress);
    }

    // Remove loading spinner
    document.querySelector("#btn-submit-portfolio").classList.remove("d-none");
    document.querySelector("#btn-submit-portfolio-loading").classList.add("d-none");
  }

  // Validation messaging
  function formIsValid(isUpdate) {
    let isValid = true;
    let allocationTotal;
    let parsedDeposit = 0;

    setSuccessMessage("");
    document.querySelector("#successMessage").classList.add("d-none");
    setFailMessage("");
    document.querySelector("#failMessage").classList.add("d-none");

    try {
      allocationTotal =parseInt(xAllocation) + parseInt(yAllocation) + parseInt(zAllocation);
      parsedDeposit = parseFloat(deposit);
    } catch {}
    if(!signer) {
      setFailMessage("Please connect your wallet.");
      isValid = false;
    }
    if(allocationTotal !== 100 || xAllocation < 0 || yAllocation < 0 || zAllocation < 0) {
      console.log(xAllocation);
      console.log(allocationTotal);
      setFailMessage("Allocations must be positive whole numbers that add to 100.");
      isValid = false;
    }
    if(!isUpdate && deposit <= 0) {
      setFailMessage("Deposit amount must be larger than zero.");
      isValid = false;
    }
    if(isValid) {
      setFailMessage("");
      document.querySelector("#failMessage").classList.add("d-none");
    }
    else {
      document.querySelector("#failMessage").classList.remove("d-none");
    }
    return isValid;
  }

  // Withdraws all tokens from portfolio
  async function withdraw() {
    // if(!signer) return;

    console.log("Withdrawing from portfolio");
    
    // Show loading spinner
    document.querySelector("#btn-withdraw").classList.add("d-none");
    document.querySelector("#btn-submit-portfolio").classList.add("d-none");
    document.querySelector("#btn-withdraw-loading").classList.remove("d-none");
    
    try {
      // Use the Parfait ABI to get a connection to the proxy contract
      const proxyContract = new ethers.Contract(proxyAddress, parfaitJSON.abi, signer);
      const tx = await proxyContract.withdraw();
      const receipt = await tx.wait(); 

      // Update UI
      populatePortfolio(proxyAddress);

      // Success message
      setSuccessMessage("Your positions have been withdrawn.");
      document.querySelector("#successMessage").classList.remove("d-none");
        
    } catch (err) {
      console.log(err);
      // Update UI
      populatePortfolio(proxyAddress);
    }

    // Remove loading spinner
    document.querySelector("#btn-submit-portfolio").classList.remove("d-none");
    document.querySelector("#btn-withdraw-loading").classList.add("d-none");
  }

  return (
    <div className="App">
      <div className="navbar position-lg-sticky border-bottom px-3 py-3 sticky-header">
        <div className="container-fluid">
          <h2 className="float-md-start mb-0 logo">Parfa<span className="i">i</span>t</h2>
          <div>
            <button id="btn-connect" onClick={connectWallet} className="btn btn-lg btn-secondary text-truncate" style={{width:'150px',}}>{userAddress}</button>
            <button id="btn-connect-loading" onClick={updatePortfolio} className="btn btn-lg btn-secondary d-none" type="button" disabled>
              <span className="spinner-grow spinner-grow-sm" role="status"></span> Connecting...
            </button>
          </div>
        </div>
      </div>
      <div className="container m-5">
        <div className="card p-3">            
          <div className="card-body">
              <div>
                <h2 className="bi bi-basket2 card-title secondary"> Portfolio <span className="text-dark">{totalBalance}</span></h2>
                <h6 id="proxyAddressContainer" className="card-subtitle text-muted opacity-50 text-s">{proxyAddress}</h6>
              </div>
              <div className="m-4"></div>
              <div className="input-group mb-3">                  
                <span className="input-group-text">Deposit Amount</span>
                <input id="deposit" type="text" className="form-control" value={deposit} placeholder="0" onChange={e => setDeposit(e.target.value)} />
                <span className="input-group-text">ETH</span>
              </div>
            <div className="row mt-4">
              <div className="col">
                <div className="card">
                  <div className="card-header">
                      <h4 className="mb-0 iwt"><img src="https://cryptologos.cc/logos/ethereum-eth-logo.svg?v=022" className="coin-icon"/> ETH <span className="text-s muted">{xPrice}</span></h4>
                      <div className="text-sm opacity-50">Lending on Compound</div>
                  </div>
                  <div className="card-body">
                    <span className="badge badge-pill bg-soft-success turq me-2"><i className="bi bi-activity"></i> {xRate} <span className="text-s muted">APY</span></span>
                    <div className="position-details d-none">
                      <h3 className="mt-3">{xBalance} <span className="text-s muted">ETH</span></h3>
                      <h5 className="muted">{xSavedAllocation} <i className="bi bi-arrow-right" /> {xCurrentAllocation} <span className="text-s muted">ALLOCATION</span></h5>
                    </div>
                    <div className="input-group mb-3 mt-4">                  
                      <input id="xAllocation" type="text" className="form-control" value={xAllocation} placeholder="New Allocation" onChange={e => setXAllocation(e.target.value)}  />
                      <span className="input-group-text">%</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col">
                <div className="card">
                  <div className="card-header">
                    <h4 className="mb-0"><img src="https://cryptologos.cc/logos/wrapped-bitcoin-wbtc-logo.svg?v=022" className="coin-icon"/> WBTC <span className="text-s muted">{yPrice}</span></h4>
                    <div className="text-sm opacity-50">Lending on Compound</div>
                  </div>
                  <div className="card-body">
                    <span className="badge badge-pill bg-soft-success turq me-2"><i className="bi bi-activity"></i> {yRate} <span className="text-s muted">APY</span></span>
                    <div className="position-details d-none">
                      <h3 className="mt-3">{yBalance} <span className="text-s muted">WBTC</span></h3>
                      <h5 className="muted">{ySavedAllocation} <i className="bi bi-arrow-right" /> {yCurrentAllocation} <span className="text-s muted">ALLOCATION</span></h5>
                    </div>
                    <div className="input-group mb-3 mt-4">                  
                      <input id="yAllocation" type="text" className="form-control" value={yAllocation} placeholder="New Allocation" onChange={e => setYAllocation(e.target.value)}  />
                      <span className="input-group-text">%</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col">
                <div className="card">
                  <div className="card-header">
                    <h4 className="mb-0"><img src="https://cryptologos.cc/logos/multi-collateral-dai-dai-logo.svg?v=022" className="pull-right coin-icon"/> DAI <span className="text-s muted">{zPrice}</span></h4>
                    <div className="text-sm opacity-50">Lending on Compound</div>
                  </div>
                  <div className="card-body">
                    <span className="badge badge-pill bg-soft-success turq me-2"><i className="bi bi-activity"></i> {zRate} <span className="text-s muted">APY</span></span>
                    <div className="position-details d-none">
                      <h3 className="mt-3">{zBalance} <span className="text-s muted">DAI</span></h3>
                      <h5 className="muted">{zSavedAllocation} <i className="bi bi-arrow-right" /> {zCurrentAllocation} <span className="text-s muted">ALLOCATION</span></h5>
                    </div>
                    <div className="input-group mb-3 mt-4">                  
                      <input id="zAllocation" type="text" className="form-control" value={zAllocation} placeholder="New Allocation" onChange={e => setZAllocation(e.target.value)}  />
                      <span className="input-group-text">%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div id="successMessage" className="alert alert-success d-none mt-4">{successMessage}</div>
            <div id="failMessage" className="alert alert-danger d-none mt-4">{failMessage}</div>

            <div className="mt-4">
              <button id="btn-submit-portfolio" onClick={updatePortfolio} className="btn btn-lg btn-primary me-3">{submitPortfolioText}</button>
              <button id="btn-submit-portfolio-loading" className="btn btn-lg btn-primary d-none me-3" type="button" disabled>
                <span className="spinner-grow spinner-grow-sm" role="status"></span> Pending...
              </button>

              <button id="btn-withdraw" onClick={withdraw} className="btn btn-lg btn-secondary d-none">Withdraw All</button>
              <button id="btn-withdraw-loading" className="btn btn-lg btn-secondary d-none" type="button" disabled>
                <span className="spinner-grow spinner-grow-sm" role="status"></span> Withdrawing...
              </button>
            </div>
          </div>         
        </div>        
      </div>
    </div>
  );
    
}

export default App;
