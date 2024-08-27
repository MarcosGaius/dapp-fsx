import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const LiquidityPoolModule = buildModule("LiquidityPoolModule", (m) => {
  const usdcAddress = m.getParameter("usdcAddress");
  const flsAddress = m.getParameter("flsAddress");
  const initialRate = m.getParameter("initialRate");

  if (!usdcAddress || !flsAddress || !initialRate) throw new Error("Missing parameter");

  const liquidityPool = m.contract("LiquidityPool", [usdcAddress, flsAddress, initialRate]);

  return {
    liquidityPool,
  };
});

export default LiquidityPoolModule;
