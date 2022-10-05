"use strict";
const Web3Modal = window.Web3Modal.default;
let web3Modal;
let provider;
let selectedAccount;
let chainId;
const maxSupply = 8888;
let isConnected = false;

let contractAddress = "0x198478f870d97d62d640368d111b979d7ca3c38f";
let infuraUrl = "https://mainnet.infura.io/v3/2f1d6ad325dd403793eafc05a9e251de"
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
            },
            {
                "internalType": "uint256",
                "name": "allowed",
                "type": "uint256"
            }
        ],
        "name": "claim",
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
        "name": "mint",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    },   {
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


    const providerOptions = {};
    web3Modal = new Web3Modal({
        cacheProvider: false,
        providerOptions,
        disableInjectedProvider: false,
    });
    checkSupply().then(async s => {

            document.getElementById("connect-quantityAllowed").innerHTML = `Quantity allowed : <span class="text-white">---</span> mints<br>Left : <span class="text-white">${(maxSupply-s)+' / '+maxSupply}</span><br><span class="text-white">FREE + GAS</span>`
        
    })
}
async function fetchAccountData() {
    const web3 = new Web3(provider);
    chainId = await web3.eth.getChainId();
    const accounts = await web3.eth.getAccounts();
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
            infuraUrl
        )
    );
    const contract = new web3.eth.Contract(abi, contractAddress);
    return await contract.methods.totalSupply().call();
}

async function isEligible() {
    let res = await axios.post("https://sig.8siannft.com/isEligible", {
        wallet: selectedAccount
    });
    return res.data
}
async function connect() {
    if (window.web3 == undefined && window.ethereum == undefined) {
        window
            .open("https://metamask.app.link/dapp/8siannft.com", "_blank")
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

    const quantityAllowed = await isEligible();
  
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
    
        document.getElementById("connect-quantityAllowed").innerHTML = `Quantity allowed : <span class="text-white">${quantityAllowed.freeQuantity}</span> mints<br>Left : <span class="text-white">${(maxSupply-supply)+' / '+maxSupply}</span><br><span class="text-white">FREE + GAS</span>`
        document.getElementById("buyQuantityRange").max = quantityAllowed.freeQuantity;
        if(quantityAllowed.freeQuantity > 0){
          document.getElementById("buyQuantityRange").min = 1
          document.getElementById("buyQuantityRange").value = quantityAllowed.freeQuantity
          changeBuyQuantity(1)
        }

  
    if (chainId == 1 && selectedAccount && supply < maxSupply) {
        document.getElementById("connect-info").innerHTML = "Connected";
        document.getElementById("connect-info").classList.remove("bg-danger");
        document.getElementById("connect-info").classList.add("bg-success");
        document.getElementById("connect-button").innerHTML = "Connected";
        document.getElementById("connect-button").classList.add("btn-outline-dark");
        document.getElementById("connect-button").classList.remove("btn-outline-success");
        isConnected = true;
    } else {
        document.getElementById("connect-info").innerHTML = "Not Connected";
        document.getElementById("connect-info").classList.add("bg-danger");
        document.getElementById("connect-info").classList.remove("bg-sucess");
        document.getElementById("connect-button").innerHTML = "Connect";
        document.getElementById("connect-button").classList.add("btn-outline-sucess");
        document.getElementById("connect-button").classList.remove("btn-outline-dark");
        isConnected = false;
    }

}
async function claim() {
    if (!isConnected) {
        iziToast.error({
            title: "Error",
            message: "No connected",
        });
        return
    }
    const web3 = new Web3(provider);
    const contract = new web3.eth.Contract(abi, contractAddress);

 
        if (chainId == 1 && selectedAccount) {
            let signature = await web3.eth.personal.sign(`${selectedAccount}8SIAN_WEBSITE`, selectedAccount);
            if (signature) {
                axios.post("https://sig.8siannft.com/getFreeAccess", {
                    wallet: selectedAccount,
                    signature: signature
                }).then(data => {
                    if (data.data.signature && data.data.quantityAllowed > 0 && data.data.quantityAllowed >= document.getElementById("buyQuantityRange").value) {
                        
                        contract.methods
                            .claim(data.data.signature, document.getElementById("buyQuantityRange").value, data.data.quantityAllowed)
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
                            message: 'Error',
                        });
                    }

                });
            } else {
                iziToast.error({
                    title: 'Error',
                    message: 'Must sign the message',
                });
            }
        }

    


}

async function mint() {
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
  const web3 = new Web3(provider);
  const contract = new web3.eth.Contract([
    {
      inputs: [
        {
          internalType: "address",
          name: "account",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "id",
          type: "uint256",
        },
      ],
      name: "balanceOf",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "buy",
      outputs: [],
      stateMutability: "payable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes",
          name: "signature",
          type: "bytes",
        },
      ],
      name: "presale",
      outputs: [],
      stateMutability: "payable",
      type: "function",
    },
    {
      inputs: [],
      name: "TOKENS_MINTED",
      outputs: [
        {
          internalType: "uint256",
          name: "_value",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
  ], "0x38b7e06eb1a6b8af8b3a06ecc0f673d9f8421ebb");


  if (
    
    chainId == "0x1" &&
    selectedAccount
  ) {
    contract.methods
      .buy()
      .send({
        from: selectedAccount,
        value: web3.utils.toHex(0.088 * 10 ** 18),
      })
      .then(function (info) {
        iziToast.success({
          title: "OK",
          message: "Successfully bought!",
        });
      })
      .catch(function (err) {});
  } else {
   
    if (balance <= 0.088) {
      iziToast.error({
        title: "Error",
        message: "No enough ETH.",
      });
      return;
    }
    if (!selectedAccount) {
      iziToast.error({
        title: "Error",
        message: "You need to be connected to mint.",
      });
      return;
    }
    if (chainId !== "0x1") {
      iziToast.error({
        title: "Error",
        message: "Switch to ETH mainnet.",
      });
      return;
    }
  }
}
async function checkSupplyVIP() {
  const web3 = new Web3(
    new Web3.providers.HttpProvider(
      "https://mainnet.infura.io/v3/00b3826c843c45e6acfcfaf3e0093e3e"
    )
  );
  const contract = new web3.eth.Contract([
    {
      inputs: [
        {
          internalType: "address",
          name: "account",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "id",
          type: "uint256",
        },
      ],
      name: "balanceOf",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "buy",
      outputs: [],
      stateMutability: "payable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes",
          name: "signature",
          type: "bytes",
        },
      ],
      name: "presale",
      outputs: [],
      stateMutability: "payable",
      type: "function",
    },
    {
      inputs: [],
      name: "TOKENS_MINTED",
      outputs: [
        {
          internalType: "uint256",
          name: "_value",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
  ], "0x38b7e06eb1a6b8af8b3a06ecc0f673d9f8421ebb");
  return await contract.methods.TOKENS_MINTED().call();
}




window.addEventListener("load", async () => {
  init();
  checkSupplyVIP()
    .then((a) => {
      document.getElementById("supplyCard").innerHTML = `${
        888 - a
      } Mint Left - 1 Item per Transaction`;
      if (a == 888) {
        document.getElementById(
          "btn-mint"
        ).innerHTML = `<strong>SOLD OUT </strong>`;
      } else {
        document.getElementById("btn-mint").addEventListener("click", mint);
      }
    })
    .catch((a) => {
      document.getElementById("supplyCard").innerHTML = `Error`;
    });
});
