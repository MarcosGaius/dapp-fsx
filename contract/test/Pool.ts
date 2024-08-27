import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import hre from "hardhat";

describe("LiquidityPool Contract", function () {
  async function deployContractsFixture() {
    const publicClient = await hre.viem.getPublicClient();

    const [owner, otherAccount] = await hre.viem.getWalletClients();

    const usdc = await hre.viem.deployContract("MockedUSDC");
    const usdcAsOtherAccount = await hre.viem.getContractAt("MockedUSDC", usdc.address, { client: { wallet: otherAccount } });

    const flsToken = await hre.viem.deployContract("FLS");
    const flsAsOtherAccount = await hre.viem.getContractAt("FLS", flsToken.address, { client: { wallet: otherAccount } });

    const liquidityPool = await hre.viem.deployContract("LiquidityPool", [usdc.address, flsToken.address, 1n]);
    const liquidityPoolAsOtherAccount = await hre.viem.getContractAt("LiquidityPool", liquidityPool.address, {
      client: { wallet: otherAccount },
    });

    await flsToken.write.grantRole([await flsToken.read.MINTER_ROLE(), liquidityPool.address]);

    return {
      publicClient,
      owner,
      otherAccount,
      liquidityPoolAsOtherAccount,
      liquidityPool,
      flsToken,
      flsAsOtherAccount,
      usdc,
      usdcAsOtherAccount,
    };
  }

  describe("Deployment", function () {
    it("Should set the right initial exchange rate", async function () {
      const { liquidityPool } = await loadFixture(deployContractsFixture);
      expect(await liquidityPool.read.getExchangeRate()).to.equal(1n);
    });

    it("Should assign the minter role to the pool contract", async function () {
      const { flsToken, liquidityPool } = await loadFixture(deployContractsFixture);
      const MINTER_ROLE = await flsToken.read.MINTER_ROLE();
      expect(await flsToken.read.hasRole([MINTER_ROLE, liquidityPool.address])).to.be.true;
    });

    it("Should set the right pool pair addresses", async function () {
      const { liquidityPool, flsToken, usdc } = await loadFixture(deployContractsFixture);
      const [usdcAddress, flsAddress] = await liquidityPool.read.getPoolPairAddresses();
      expect(usdcAddress.toLowerCase()).to.equal(usdc.address);
      expect(flsAddress.toLowerCase()).to.equal(flsToken.address);
    });
  });

  describe("Swap and Exchange", function () {
    it("Should swap USDC for FLS correctly", async function () {
      const { liquidityPool, liquidityPoolAsOtherAccount, usdc, usdcAsOtherAccount, flsToken, otherAccount } = await loadFixture(
        deployContractsFixture
      );
      await usdc.write.mint([otherAccount.account.address, BigInt(1000e6)]);

      await usdcAsOtherAccount.write.approve([liquidityPool.address, BigInt(1000e6)]);

      await liquidityPoolAsOtherAccount.write.swapUsdcForFls([BigInt(300e6)]);
      expect(await usdc.read.balanceOf([liquidityPool.address])).to.equal(BigInt(300e6));
      expect(await flsToken.read.balanceOf([otherAccount.account.address])).to.equal(BigInt(300e6));
    });

    it("Should swap FLS for USDC correctly", async function () {
      const { usdc, flsToken, liquidityPool, liquidityPoolAsOtherAccount, otherAccount } = await loadFixture(deployContractsFixture);

      await flsToken.write.mint([otherAccount.account.address, BigInt(900e6)]);
      await usdc.write.mint([liquidityPool.address, BigInt(30000e6)]);

      await liquidityPoolAsOtherAccount.write.swapFlsForUsdc([BigInt(600e6)]);
      expect(await flsToken.read.balanceOf([otherAccount.account.address])).to.equal(BigInt(300e6));
      expect(await usdc.read.balanceOf([otherAccount.account.address])).to.equal(BigInt(600e6));
    });
  });

  describe("Admin Functions", function () {
    it("Should allow the owner to update the exchange rate", async function () {
      const { liquidityPool, owner } = await loadFixture(deployContractsFixture);
      await liquidityPool.write.updateExchangeRate([4n]);
      expect(await liquidityPool.read.getExchangeRate()).to.equal(4n);
    });

    it("Should prevent non-owners from updating the exchange rate", async function () {
      const { liquidityPoolAsOtherAccount } = await loadFixture(deployContractsFixture);
      await expect(liquidityPoolAsOtherAccount.write.updateExchangeRate([4n])).to.be.rejected;
    });

    it("Should allow the owner to withdraw USDC", async function () {
      const { liquidityPool, usdc, owner } = await loadFixture(deployContractsFixture);
      await usdc.write.mint([liquidityPool.address, BigInt(500e6)]);
      await liquidityPool.write.withdrawUsdc([BigInt(300e6)]);
      expect(await usdc.read.balanceOf([owner.account.address])).to.equal(BigInt(300e6));
    });

    it("Should prevent non-owners from withdrawing USDC", async function () {
      const { liquidityPool } = await loadFixture(deployContractsFixture);
      await expect(liquidityPool.write.withdrawUsdc([BigInt(300e6)])).to.be.rejected;
    });
  });

  describe("Deposit USDC", function () {
    it("Should allow the owner to deposit USDC", async function () {
      const { liquidityPool, usdc, owner } = await loadFixture(deployContractsFixture);
      await usdc.write.mint([owner.account.address, BigInt(500e6)]);
      await usdc.write.approve([liquidityPool.address, BigInt(500e6)]);
      await liquidityPool.write.depositUsdc([BigInt(500e6)]);
      expect(await usdc.read.balanceOf([liquidityPool.address])).to.equal(BigInt(500e6));
    });

    it("Should prevent non-owners from depositing USDC", async function () {
      const { liquidityPool, usdc, usdcAsOtherAccount, otherAccount } = await loadFixture(deployContractsFixture);
      await usdc.write.mint([otherAccount.account.address, BigInt(500e6)]);
      await usdcAsOtherAccount.write.approve([liquidityPool.address, BigInt(500e6)]);
      await expect(liquidityPool.write.depositUsdc([BigInt(500e6)])).to.be.rejected;
    });
  });
});
