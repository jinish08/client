import React, { useEffect, createContext, useContext, useState } from "react";
import { ethers } from "ethers";

import { contractAbi, contractAddress } from "../utils/constants";

export const TransactionContext = createContext();

const { ethereum } = window;

const getEthereumContract = () => {
  const provider = new ethers.providers.Web3Provider(ethereum);
  const signer = provider.getSigner();
  const transactionContract = new ethers.Contract(
    contractAddress,
    contractAbi,
    signer
  );
  return transactionContract;
};

export const TransactionProvider = ({ children }) => {
  const [currentAccount, setCurrentAccount] = useState(null);
  const [formData, setFormData] = useState({
    addressTo: "",
    amount: "",
    keyword: "",
    message: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [transactionCount, setTransactionCount] = useState(
    localStorage.getItem("transactionCount") || 0
  );
  const [transactions, setTransactions] = useState([]);

  const handleChange = (e, name) => {
    setFormData((prevState) => ({ ...prevState, [name]: e.target.value }));
  };

  const getAllTransactions = async () => {
    try {
      if (!ethereum) return alert("Please install Metamask");
      const transactionContract = getEthereumContract();
      const availableTransactions =
        await transactionContract.getAllTransactions();

      const structuredTransactions = availableTransactions.map(
        (transaction) => ({
          addressTo: transaction.receiver,
          addressFrom: transaction.sender,
          timestamp: new Date(
            transaction.timestamp.toNumber() * 1000
          ).toLocaleString(),
          message: transaction.message,
          keyword: transaction.keyword,
          amount: parseInt(transaction.amount._hex) / 10 ** 18,
        })
      );
      console.log(structuredTransactions);
      setTransactions(structuredTransactions);
    } catch (error) {
      console.log(error);
    }
  };

  const checkIfWalletConnected = async () => {
    try {
      if (!ethereum) {
        return alert("Please install MetaMask");
      }
      const accounts = await ethereum.request({ method: "eth_accounts" });
      if (accounts.length) {
        setCurrentAccount(accounts[0]);
        getAllTransactions();
      } else {
        console.log("Please connect to your wallet");
      }
      // console.log(accounts);
    } catch (error) {
      console.log(error);
      throw new Error("Error connecting to wallet");
    }
  };

  const checkIfTransactionsExists = async () => {
    try {
      const transactionContract = getEthereumContract();
      const transactionCount = await transactionContract.getTransactionCount();

      window.localStorage.setItem("transactionCount", transactionCount);
    } catch (err) {
      console.log(err);
      throw new Error("Error connecting to wallet");
    }
  };

  const connectWallet = async () => {
    try {
      if (!ethereum) {
        return alert("Please install MetaMask");
      }
      const accounts = await ethereum.request({
        method: "eth_requestAccounts",
      });

      setCurrentAccount(accounts[0]);
      console.log(`Succesfully connected account ${accounts[0]}`);
    } catch (err) {
      console.log(err);
      throw new Error("Error connecting to wallet");
    }
  };

  const sendTransaction = async () => {
    try {
      if (!ethereum) {
        return alert("Please install MetaMask");
      }
      const { addressTo, amount, keyword, message } = formData;
      const transactionContract = getEthereumContract();

      await ethereum.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: currentAccount,
            to: addressTo,
            gas: "0x5208",
            value: ethers.utils.parseEther(amount)._hex,
          },
        ],
      });

      console.log(addressTo, amount, keyword, message);
      const transactionHash = await transactionContract.addToBlockchain(
        addressTo,
        ethers.utils.parseEther(amount),
        message,
        keyword
      );

      setIsLoading(true);
      console.log(`Loading- ${transactionHash.hash}`);
      await transactionHash.wait();
      setIsLoading(false);
      console.log(`Success- ${transactionHash.hash}`);

      const transactionCount = await transactionContract.getTransactionCount();

      setTransactionCount(transactionCount.toNumber());

      window.location.reload();
    } catch (err) {
      console.log(err);
      throw new Error("Error sending transaction");
    }
  };

  useEffect(() => {
    checkIfWalletConnected();
    checkIfTransactionsExists();
  }, [currentAccount, transactions]);

  return (
    <TransactionContext.Provider
      value={{
        connectWallet,
        currentAccount,
        formData,
        setFormData,
        handleChange,
        sendTransaction,
        transactions,
        isLoading,
      }}
    >
      {children}
    </TransactionContext.Provider>
  );
};
