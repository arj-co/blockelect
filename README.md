# Decentralized Blockchain Voting System

## Overview
This project is a **blockchain-based e-voting system** where all voting rules are enforced **on-chain** using a Solidity smart contract. There is no centralized backend controlling votes or results. The frontend only acts as an interface to the blockchain.

The system runs on a **local Ethereum network (Hardhat)** for development and demonstration purposes.

---

## Architecture

- **Hardhat** – Local Ethereum blockchain, smart contract compilation and deployment
- **Solidity** – Smart contract that enforces voting rules
- **MetaMask** – Wallet and identity provider for users
- **React + Ethers.js** – Web interface for voting and viewing results
- **Node.js** – Runtime environment for tooling and frontend

---

## Smart Contract Features

- Candidate initialization at deployment
- On-chain voter registration
- One vote per wallet address
- Immutable vote storage
- Publicly readable vote counts

---

## Voting Flow

1. Start the Hardhat local blockchain
2. Deploy the voting smart contract
3. Register eligible voter addresses (admin-only)
4. User connects MetaMask wallet
5. User casts vote (on-chain transaction)
6. Smart contract validates and records the vote
7. Results are read directly from the blockchain

---

## Technology Stack

| Component | Purpose |
|---------|--------|
| Hardhat | Local Ethereum network & deployment |
| Solidity | Smart contract logic |
| MetaMask | Wallet & transaction signing |
| React | Frontend UI |
| Ethers.js | Blockchain interaction |
| Node.js | Runtime environment |

---

## Project Properties

- No centralized backend
- No database for votes
- Blockchain-enforced security
- Transparent and verifiable results
- Wallet-based identity

---

## Development Notes

- The Hardhat local blockchain is **ephemeral**
- Restarting the node resets contracts and balances
- Contract must be redeployed after each restart
- Voter addresses must be registered on-chain

---

## Use Case

This project serves as a **secure academic prototype** demonstrating how blockchain technology can be used to enforce election integrity in a decentralized manner.

---

## License
MIT
