import {ethers} from 'ethers';
import './App.css';
import parfaitJSON from './utils/Parfait.json';
import React from 'react';
import config from './__config'; 

function App() {
  // pure Javascript
  const [address, setAddress] = React.useState("");
  const [balance, setBalance] = React.useState(0);
  const [greeting, setGreeting] = React.useState("");

  // 1. Set up MetaMask
  const { ethereum } = window;
  let provider;

  function connectWallet() {
    if(ethereum) {
      ethereum.request({ method: 'eth_requestAccounts'});
      provider = new ethers.providers.Web3Provider(ethereum);
      displayUserDetails();
    } else {
      console.log("You need to install MetaMask!");
    }  
  }
 
  async function displayUserDetails() {
    let signer = await provider.getSigner(); // Whichever user gave permission, get that signer
    let addr1 = await signer.getAddress();
    let userBalance = await provider.getBalance(addr1);

    setAddress(addr1);
    setBalance(ethers.utils.formatEther(userBalance));
  }

  // 2. Create an ethers.js contract instance  
  async function getCurrentGreeting() {
    let signer = await provider.getSigner();
    let contractInstance = new ethers.Contract(config.parfaitAddress, parfaitJSON.abi, signer);
    let currentGreeting = await contractInstance.greet();
    setGreeting(currentGreeting);
    console.log("The greeting is " + currentGreeting);
  }

  async function setNewGreeting() {
    let signer = await provider.getSigner();
    let contractInstance = new ethers.Contract(config.parfaitAddress, parfaitJSON.abi, signer);
    await contractInstance.setGreeting("Hey Class 1!");
  }

  return (
    <div className="cover-container d-flex w-100 h-100 p-3 mx-auto flex-column">
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
    </div>
    /*
    <div className="App">
      <div className="title">
        The Class1 dApp!
      </div>
      <div className="user-details">{address}</div>
      <div>{balance}</div>
      <button onClick={getCurrentGreeting}>Get Current Greeting!</button>
      <button onClick={setNewGreeting}>Set a New Greeting</button>
      <div>Greeting: {greeting}</div>
    </div>*/
  );
    
}

export default App;
