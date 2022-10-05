"use strict";
const Web3Modal = window.Web3Modal.default;
let web3Modal;
let provider;
let selectedAccount;
let chainId;
const maxSupply = 2664;
let isConnected = false;
let contractAddress = "0x432cF10ea2014443103E1690fDefC639F11B6762";
let abi = [{
    "inputs": [{
        "internalType": "bytes",
        "name": "signature",
        "type": "bytes"
      },
      {
        "internalType": "uint256",
        "name": "tokenQuantity",
        "type": "uint256"
      }
    ],
    "name": "privateMint",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{
      "internalType": "uint256",
      "name": "tokenQuantity",
      "type": "uint256"
    }],
    "name": "publicMint",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }, {
    "inputs": [],
    "name": "privateLive",
    "outputs": [{
      "internalType": "bool",
      "name": "",
      "type": "bool"
    }],
    "stateMutability": "view",
    "type": "function"
  }, {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{
      "internalType": "uint256",
      "name": "",
      "type": "uint256"
    }],
    "stateMutability": "view",
    "type": "function"
  }
];

function init() {
  console.log("Initializing");
  console.log(
    "window.web3 is",
    window.web3,
    "window.ethereum is",
    window.ethereum
  );

  const providerOptions = {};
  web3Modal = new Web3Modal({
    cacheProvider: false,
    providerOptions,
    disableInjectedProvider: false,
  });
}
async function fetchAccountData() {
  const web3 = new Web3(provider);
  chainId = await web3.eth.getChainId();
  const accounts = await web3.eth.getAccounts();
  console.log("Got accounts", accounts);
  selectedAccount = accounts[0];
}

async function onConnect() {
  try {
    provider = await web3Modal.connect();
  } catch (e) {
    console.log("Could not get a wallet connection", e);
    return;
  }

  provider.on("accountsChanged", (accounts) => {
    fetchAccountData();
  });

  provider.on("chainChanged", (chainId) => {
    fetchAccountData();
  });

  fetchAccountData();
}

async function checkSupply() {
  const web3 = new Web3(
    new Web3.providers.HttpProvider(
      "https://mainnet.infura.io/v3/00b3826c843c45e6acfcfaf3e0093e3e"
    )
  );
  const contract = new web3.eth.Contract(abi, contractAddress);
  return await contract.methods.totalSupply().call();
}

async function mintStatus() {
  const web3 = new Web3(
    new Web3.providers.HttpProvider(
      "https://mainnet.infura.io/v3/00b3826c843c45e6acfcfaf3e0093e3e"
    )
  );
  const contract = new web3.eth.Contract(abi, contractAddress);
  return await contract.methods.privateLive().call();
}

async function connect() {
  if (window.web3 == undefined && window.ethereum == undefined) {
    window
      .open("https://metamask.app.link/dapp/8siannft.com/pass", "_blank")
      .focus();
  }
  provider = await web3Modal.connect();
  provider.on("accountsChanged", (accounts) => {
    fetchAccountData();
  });
  provider.on("chainChanged", (chainId) => {
    fetchAccountData();
  });
  await fetchAccountData();
  const supply = await checkSupply();
  const mintLive = await mintStatus();

  let data = await axios.post("https://presale.8siannft.com/isWhitelisted/", {
    wallet: selectedAccount
  })
  
  if (!data.data.whitelisted) {
    document.getElementById("connect-info").innerHTML = "Not connected";
    iziToast.error({
      title: "Error",
      message: "Not whitelisted",
    });
  }

  if (!mintLive) {
    document.getElementById("connect-info").innerHTML = "Mint closed";
    iziToast.error({
      title: "Error",
      message: "Mint is not live",
    });
  }
  if (supply >= maxSupply) {
    document.getElementById("connect-info").innerHTML = "Max supply reached";
    iziToast.error({
      title: "Error",
      message: "Max supply reached",
    });
  }


  if (!selectedAccount) {
    document.getElementById("connect-info").innerHTML = "Not connected";
    iziToast.error({
      title: "Error",
      message: "You need to be connected to mint.",
    });
  }
  if (chainId !== 1) {
    document.getElementById("connect-info").innerHTML = "Not ETH mainnet";
    iziToast.error({
      title: "Error",
      message: "Switch to ETH mainnet.",
    });
  }
  
  if (data.data.whitelisted && chainId == 1 && selectedAccount && mintLive && supply < maxSupply) {
    document.getElementById("connect-info").innerHTML = "Connected";
    document.getElementById("connect-info").classList.remove("bg-danger")
    document.getElementById("connect-info").classList.add("bg-success")
    isConnected = true;
  }

}
async function mint() {
  if (!isConnected) {
    iziToast.error({
      title: "Error",
      message: "No connected",
    });
    return
  }
  const web3 = new Web3(provider);
  const contract = new web3.eth.Contract(abi, contractAddress);
  const supply = await checkSupply();

  if (
    chainId == 1 &&
    selectedAccount &&
    supply < maxSupply
  ) {
    let signature = await web3.eth.personal.sign(`${selectedAccount}8SIAN_WEBSITE`, selectedAccount);
    if (signature) {
      axios.post("https://presale.8siannft.com/getAccess", {
        wallet: selectedAccount,
        signature: signature
      }).then(data => {
        if (data.data.signature) {
          contract.methods
            .privateMint(data.data.signature, document.getElementById("buyQuantityRange").value)
            .send({
              from: selectedAccount
            }).then(function (info) {
              iziToast.success({
                title: 'OK',
                message: 'Successfully bought!',
              });
            }).catch(function (err) {

            });
        } else {
          iziToast.error({
            title: 'Error',
            message: 'Not whitelisted',
          });
        }

      });
    } else {
      iziToast.error({
        title: 'Error',
        message: 'Must sign the message',
      });
    }
  } else {

    if (!selectedAccount) {
      iziToast.error({
        title: "Error",
        message: "You need to be connected to mint.",
      });
      return;
    }
    if (chainId == 1) {
      iziToast.error({
        title: "Error",
        message: "Switch to ETH mainnet.",
      });
      return;
    }
  }
}
window.addEventListener("load", async () => {
  init();
});