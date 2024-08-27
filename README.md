# [Marcos Gaius] Basic dApp for Farmland Investing

## Description

## Technologies Used

## Setup Instructions

### Contract

Make sure you have the dependencies installed:

```js
yarn install
```

**Testing:**

To test both contracts (ERC20 and Liquidity Pool) run the command below:

```js
npx hardhat test
```

**Deploying:**

The project is configured to deploy on polygon amoy testnet and it's using a public node. If you want to change the network or use a private RPC _(infura, alchemy, etc)_, adjust as wanted in the `hardhat.config.ts` file.

To to deploy the contract, follow the steps:

1. See the available variables to set: `npx hardhat vars setup`
2. Currently, only the deployer private key needs to be set: `npx hardhat vars set AMOY_PRIVATE_KEY`
3. The command above will ask for the value to be set. Insert it and confirm.
4. Deploy with: `npx hardhat run scripts/index.ts` (it might take a while)

### App (frontend)

## Approach and Challlenges
