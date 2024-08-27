import hre from "hardhat";
import LiquidityPoolModule from "../ignition/modules/pool";
import FLSTokenModule from "../ignition/modules/fls";
import { USDC_AMOY_ADDRESS } from "../constants";

async function main() {
  const { flsToken } = await hre.ignition.deploy(FLSTokenModule);

  console.info(`FLS contract deployed: ${flsToken.address}`);

  const { liquidityPool } = await hre.ignition.deploy(LiquidityPoolModule, {
    parameters: {
      LiquidityPoolModule: {
        usdcAddress: USDC_AMOY_ADDRESS,
        flsAddress: flsToken.address,
        initialRate: 1e6,
      },
    },
  });

  console.info(`Liquidity Pool contract deployed: ${liquidityPool.address}`);

  await flsToken.write.grantRole([await flsToken.read.MINTER_ROLE(), liquidityPool.address]);

  console.info(`FLS Minter role granted to Liquidity Pool: ${liquidityPool.address}`);
}

main().catch(console.error);
