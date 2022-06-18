//const hre = require("hardhat");
import {ethers} from 'ethers';
import './App.css';
import parfaitJSON from './utils/Parfait.json';
import parfaitProxyFactoryJSON from './utils/ParfaitProxyFactory.json';
import React from 'react';
import config from './__config'; 
import { createClient } from 'urql';
const GRAPH_API_URL = 'https://api.thegraph.com/subgraphs/name/richwarner/parfait';

function App() {

  // State variables
  const [userAddress, setUserAddress] = React.useState("Connect");
  const [proxyAddress, setProxyAddressState] = React.useState("");
  const [deposit, setDeposit] = React.useState(".0001");
  const [xBalance, setXBalance] = React.useState("");
  const [yBalance, setYBalance] = React.useState("");
  const [zBalance, setZBalance] = React.useState("");  
  const [xCurrentAllocation, setXCurrentAllocation] = React.useState("");
  const [yCurrentAllocation, setYCurrentAllocation] = React.useState("");
  const [zCurrentAllocation, setZCurrentAllocation] = React.useState("");
  const [xAllocation, setXAllocation] = React.useState("");
  const [yAllocation, setYAllocation] = React.useState("");
  const [zAllocation, setZAllocation] = React.useState("");  
  const [submitPortfolioText, setSubmitPortfolioText] = React.useState("Create Portfolio");

  const { ethereum } = window;

  async function connectWallet() {
    // Show loading spinner
    document.querySelector("#btn-connect").classList.add("d-none");
    document.querySelector("#btn-connect-loading").classList.remove("d-none");
    
    // Try to connect
    if(ethereum) {
      ethereum.request({ method: 'eth_requestAccounts'});
      const provider = new ethers.providers.Web3Provider(ethereum);
      const signer = provider.getSigner();
      const connectedUserAddress = await signer.getAddress();
      setUserAddress(connectedUserAddress);

      // Retrieve any existing portfolios for this user address
      const userExistingProxyContract = await getUserProxyAddress(connectedUserAddress);
      setProxyAddress(userExistingProxyContract); 
      if(userExistingProxyContract) {
        populatePortfolio(userExistingProxyContract);
      }

      // Get position prices
      // populatePrices();

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
    const provider = new ethers.providers.Web3Provider(ethereum);
    const signer = provider.getSigner();
    const proxyContract = new ethers.Contract(userProxyAddress, parfaitJSON.abi, signer);
    try {
      // Get allocations
      const currentX = await proxyContract.CETHAllocation(); 
      const currentY = await proxyContract.CWBTCAllocation(); 
      const currentZ = await proxyContract.CDAIAllocation();
      setXCurrentAllocation(currentX.toString() + "%"); 
      setYCurrentAllocation(currentY.toString() + "%"); 
      setZCurrentAllocation(currentZ.toString() + "%"); 
      // console.log("Allocation X: %s", currentX); 
      // console.log("Allocation Y: %s", currentY); 
      // console.log("Allocation Z: %s", currentZ); 

      // Get balances
      // const balances = await proxyContract.getBalances(); 
      // const balanceX = balances[0]; 
      // const balanceY = balances[1]; 
      // const balanceZ = balances[2]; 
      // setXCurrentAllocation(balanceX.toString()); 
      // setYCurrentAllocation(balanceY.toString()); 
      // setZCurrentAllocation(balanceZ.toString()); 
      // console.log("Balance X: %s", balanceX); 
      // console.log("Balance Y: %s", balanceY); 
      // console.log("Balance Z: %s", balanceZ);

      // Reset allocation inputs
      setXAllocation("");
      setYAllocation("");
      setZAllocation("");

    } catch (err) {
      console.log("Error fetching user portfolio: %s", err);
    }
  }

  async function populatePrices() {
    const provider = new ethers.providers.Web3Provider(ethereum);
    const signer = provider.getSigner();
    const proxyContract = new ethers.Contract(config.parfaitAddress, parfaitJSON.abi, signer);
    try {
      const prices = await proxyContract.getPrices(); 
      console.log("Prices: %s", prices); 
    } catch (err) {
      console.log("Error fetching prices: %s", err);
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

  async function updatePortfolio() {
    console.log("Updating portfolio");
    
    // Show loading spinner
    document.querySelector("#btn-submit-portfolio").classList.add("d-none");
    document.querySelector("#btn-submit-portfolio-loading").classList.remove("d-none");

    try {
      const provider = new ethers.providers.Web3Provider(ethereum);
      const signer = provider.getSigner(); 
      
      if(!proxyAddress) {  
        
        // Create proxy contract                 
        console.log("Creating new proxy contract for user %s with %s eth", await signer.getAddress(), deposit);
        const factoryContract = new ethers.Contract(config.parfaitProxyFactoryAddress, parfaitProxyFactoryJSON.abi, signer);
        const tx = await factoryContract.createNewProxy(xAllocation, yAllocation, zAllocation, {
          value: ethers.utils.parseEther(deposit),
        });
        const receipt = await tx.wait();   
        // console.log("receipt: %s", JSON.stringify(receipt));
        // console.log("events: %s", JSON.stringify(receipt.events[1].args[1]));
        const addr = receipt.events[1].args[1];     
        setProxyAddress(addr);  
        document.querySelector('#proxyAddressContainer').classList.add('animate__animated', 'animate__fadeIn', 'animate__delay-1s');

      } else { 
        
        // Update existing proxy contract           
        console.log("Updating existing proxy contract at %s with signer %s", proxyAddress, await signer.getAddress());  
        // Use the Parfait ABI to get a connection to the proxy contract
        const proxyContract = new ethers.Contract(proxyAddress, parfaitJSON.abi, signer);
        const tx = await proxyContract.updateAllocations(xAllocation, yAllocation, zAllocation, {
          value: ethers.utils.parseEther(deposit),
        });
        const receipt = await tx.wait(); 
        // Update UI
        populatePortfolio(proxyAddress);

      }
    } catch (err) {
      console.log(err);
    }

    // Remove loading spinner
    document.querySelector("#btn-submit-portfolio").classList.remove("d-none");
    document.querySelector("#btn-submit-portfolio-loading").classList.add("d-none");
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
                <h2 className="bi bi-basket2 card-title"> Portfolio</h2>
                <h6 id="proxyAddressContainer" className="card-subtitle text-muted opacity-50 text-s">{proxyAddress}</h6>
                <hr />
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
                      <h4 className="mb-0">Lend ETH</h4>
                      <div className="text-sm opacity-50">Position 1 - Low Risk</div>
                  </div>
                  <div className="card-body">
                    <span className="badge badge-pill bg-soft-success turq me-2"><i className="bi bi-activity"></i> .04%</span><span className="text-xs text-muted">APY</span>
                    <h5 className="mt-3">{xCurrentAllocation}</h5>
                    <div className="input-group mb-3 mt-3">                  
                      <input id="xAllocation" type="text" className="form-control" value={xAllocation} placeholder="New Allocation" onChange={e => setXAllocation(e.target.value)}  />
                      <span className="input-group-text">%</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col">
                <div className="card">
                  <div className="card-header">
                    <h4 className="mb-0">Lend WTBC</h4>
                    <div className="text-sm opacity-50">Position 2 - Low Risk</div>
                  </div>
                  <div className="card-body">
                    <span className="badge badge-pill bg-soft-success turq me-2"><i className="bi bi-activity"></i> 1.05%</span><span className="text-xs text-muted">APY</span>
                    <h5 className="mt-3">{yCurrentAllocation}</h5>
                    <div className="input-group mb-3 mt-3">                  
                      <input id="yAllocation" type="text" className="form-control" value={yAllocation} placeholder="New Allocation" onChange={e => setYAllocation(e.target.value)}  />
                      <span className="input-group-text">%</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col">
                <div className="card">
                  <div className="card-header">
                    <h4 className="mb-0">Lend DAI</h4>
                    <div className="text-sm opacity-50">Position 3 - Low Risk</div>
                  </div>
                  <div className="card-body">
                    <span className="badge badge-pill bg-soft-success turq me-2"><i className="bi bi-activity"></i> 2.3%</span><span className="text-xs text-muted">APY</span>
                    <h5 className="mt-3">{zCurrentAllocation}</h5>
                    <div className="input-group mb-3 mt-3">                  
                      <input id="zAllocation" type="text" className="form-control" value={zAllocation} placeholder="New Allocation" onChange={e => setZAllocation(e.target.value)}  />
                      <span className="input-group-text">%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <button id="btn-submit-portfolio" onClick={updatePortfolio} className="btn btn-lg btn-primary">{submitPortfolioText}</button>
              <button id="btn-submit-portfolio-loading" onClick={updatePortfolio} className="btn btn-lg btn-primary d-none" type="button" disabled>
                <span className="spinner-grow spinner-grow-sm" role="status"></span> Pending...
              </button>
            </div>
          </div>         
        </div>        
      </div>
    </div>
    /*<div className="cover-container d-flex w-100 h-100 p-3 mx-auto flex-column">
      <header className="mb-auto">
        <div>
          <h3 className="float-md-start mb-0">Parfa<span className="i">i</span>t</h3>
          <nav className="nav nav-masthead justify-content-center float-md-end">
            <a className="nav-link fw-bold py-1 px-0 active" href="#">Home</a>
            <a className="nav-link fw-bold py-1 px-0" href="#">Investment Options</a>
            <a className="nav-link fw-bold py-1 px-0" href="#">Why Parfait?</a>
          </nav>
        </div>
      </header>

      <main className="px-3">
        <h1>Get Up. <span className="maple">Own DeFi.</span> Enjoy Breakfast.</h1>
        <p className="lead">Save time and effort without giving up control.</p>
        <p className="lead">
          <a href="#" onClick={connectWallet} className="btn btn-lg btn-secondary fw-bold border-turq bg-turq">Open App</a>
        </p>
      </main>

      <footer className="mt-auto text-white-50">
        <p>&copy; 2022 Parfait</p>
      </footer>
    </div>*/
  );
    
}

export default App;
