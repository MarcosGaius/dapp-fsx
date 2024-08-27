import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const FLSTokenModule = buildModule("FLSTokenModule", (m) => {
  const flsToken = m.contract("FLS");

  return {
    flsToken,
  };
});

export default FLSTokenModule;
