import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import hre from "hardhat";

describe("FLS ERC20 Contract", function () {
  async function deployContractsFixture() {
    const publicClient = await hre.viem.getPublicClient();

    const [owner, otherAccount] = await hre.viem.getWalletClients();

    const flsToken = await hre.viem.deployContract("FLS");
    const flsTokenAsOtherAccount = await hre.viem.getContractAt("FLS", flsToken.address, { client: { wallet: otherAccount } });

    return {
      publicClient,
      owner,
      otherAccount,
      flsToken,
      flsTokenAsOtherAccount,
    };
  }

  describe("Deployment", function () {
    it("Should set the right roles", async function () {
      const { owner, flsToken } = await loadFixture(deployContractsFixture);
      const [ownerRole, defaultAdminRole] = await Promise.all([flsToken.read.OWNER_ROLE(), flsToken.read.DEFAULT_ADMIN_ROLE()]);

      expect(
        await Promise.all([
          flsToken.read.hasRole([ownerRole, owner.account.address]),
          flsToken.read.hasRole([defaultAdminRole, owner.account.address]),
        ])
      ).not.includes(false);
    });

    it("Should set the right name and symbol", async function () {
      const { flsToken } = await loadFixture(deployContractsFixture);
      expect(await flsToken.read.name()).to.equal("FarmlandStocks");
      expect(await flsToken.read.symbol()).to.equal("FLS");
    });

    it("Should set the right decimals", async function () {
      const { flsToken } = await loadFixture(deployContractsFixture);
      expect(await flsToken.read.decimals()).to.equal(6);
    });
  });

  describe("Actions", function () {
    it("Owner role should be able to set roles", async function () {
      const { flsToken, owner, otherAccount } = await loadFixture(deployContractsFixture);
      const minterRole = await flsToken.read.MINTER_ROLE();

      await flsToken.write.grantRole([minterRole, otherAccount.account.address]);
      expect(await flsToken.read.hasRole([minterRole, otherAccount.account.address])).to.equal(true);
    });

    it("Owner role should be able to revoke roles", async function () {
      const { flsToken, otherAccount } = await loadFixture(deployContractsFixture);
      const minterRole = await flsToken.read.MINTER_ROLE();

      await flsToken.write.grantRole([minterRole, otherAccount.account.address]);
      await flsToken.write.revokeRole([minterRole, otherAccount.account.address]);
      expect(await flsToken.read.hasRole([minterRole, otherAccount.account.address])).to.equal(false);
    });

    it("Non-owner role should not be able to set roles", async function () {
      const { flsToken, otherAccount, flsTokenAsOtherAccount } = await loadFixture(deployContractsFixture);
      const minterRole = await flsToken.read.MINTER_ROLE();

      await expect(flsTokenAsOtherAccount.write.grantRole([minterRole, otherAccount.account.address])).to.be.rejected;
    });

    it("Non-owner role should not be able to revoke roles", async function () {
      const { flsToken, otherAccount, flsTokenAsOtherAccount } = await loadFixture(deployContractsFixture);
      const minterRole = await flsToken.read.MINTER_ROLE();

      await expect(flsTokenAsOtherAccount.write.revokeRole([minterRole, otherAccount.account.address])).to.be.rejected;
    });

    it("Non-minter role should not be able to mint/burn", async function () {
      const { flsToken, owner, otherAccount, flsTokenAsOtherAccount } = await loadFixture(deployContractsFixture);

      await flsToken.write.mint([owner.account.address, BigInt(100)]);

      await expect(flsTokenAsOtherAccount.write.mint([otherAccount.account.address, BigInt(20)])).to.be.rejected;
      await expect(flsTokenAsOtherAccount.write.burn([otherAccount.account.address, BigInt(20)])).to.be.rejected;
    });

    it("Minter role should be able to mint", async function () {
      const { flsToken, flsTokenAsOtherAccount, otherAccount } = await loadFixture(deployContractsFixture);

      await flsToken.write.grantRole([await flsToken.read.MINTER_ROLE(), otherAccount.account.address]);

      await flsTokenAsOtherAccount.write.mint([otherAccount.account.address, BigInt(100)]);
      const balance = await flsToken.read.balanceOf([otherAccount.account.address]);
      expect(balance).to.equal(100n);
    });

    it("Minter role should be able to burn", async function () {
      const { flsToken, flsTokenAsOtherAccount, otherAccount } = await loadFixture(deployContractsFixture);

      await flsToken.write.grantRole([await flsToken.read.MINTER_ROLE(), otherAccount.account.address]);

      await flsTokenAsOtherAccount.write.mint([otherAccount.account.address, BigInt(100)]);

      const balance = await flsToken.read.balanceOf([otherAccount.account.address]);
      expect(balance).to.equal(100n);

      await flsTokenAsOtherAccount.write.burn([otherAccount.account.address, BigInt(50)]);

      const newBalance = await flsToken.read.balanceOf([otherAccount.account.address]);
      expect(newBalance).to.equal(50n);
    });

    it("Pauser role should be able to pause/unpause", async function () {
      const { flsToken, flsTokenAsOtherAccount, otherAccount } = await loadFixture(deployContractsFixture);
      const pauserRole = await flsToken.read.PAUSER_ROLE();

      await flsToken.write.grantRole([pauserRole, otherAccount.account.address]);
      await flsTokenAsOtherAccount.write.pause();
      expect(await flsToken.read.paused()).to.equal(true);
      await flsTokenAsOtherAccount.write.unpause();
      expect(await flsToken.read.paused()).to.equal(false);
    });

    it("Non-pauser role should not be able to pause/unpause", async function () {
      const { flsTokenAsOtherAccount } = await loadFixture(deployContractsFixture);

      await expect(flsTokenAsOtherAccount.write.pause()).to.be.rejected;
      await expect(flsTokenAsOtherAccount.write.unpause()).to.be.rejected;
    });
  });
});
