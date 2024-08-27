// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./FLS.sol"; 

contract LiquidityPool is AccessControl {
    IERC20 public usdc;
    FLS public fls;
    uint256 public exchangeRate;

    bytes32 public constant OWNER_ROLE = keccak256("OWNER_ROLE");

    event SwapFLSForUSDC(address indexed user, uint256 flsAmount, uint256 usdcAmount);
    event SwapUSDCForFLS(address indexed user, uint256 usdcAmount, uint256 flsAmount);
    event ExchangeRateUpdated(uint256 newRate);
    event USDCWithdrawn(address indexed owner, uint256 amount);
    event USDCDeposited(address indexed owner, uint256 amount);

    constructor(address usdcAddress, address flsAddress, uint256 initialRate) {
      require(usdcAddress != address(0), "Invalid USDC address");
      require(flsAddress != address(0), "Invalid FLS token address");

      usdc = IERC20(usdcAddress);
      fls = FLS(flsAddress);
      exchangeRate = initialRate > 0 ? initialRate : 1;

      _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
      _grantRole(OWNER_ROLE, msg.sender);
    }

    function getExchangeRate() public view returns (uint256) {
      return exchangeRate;
    }

    function getPoolPairAddresses() public view returns (address, address) {
      return (address(usdc), address(fls));
    }

    function updateExchangeRate(uint256 rate) external onlyRole(OWNER_ROLE) {
      require(rate > 0, "Exchange rate must be positive");
      exchangeRate = rate;
      emit ExchangeRateUpdated(rate);
    }

    function swapUsdcForFls(uint256 usdcAmount) external {
      require(usdcAmount > 0, "Amount must be positive");

      uint256 flsAmount = usdcAmount * exchangeRate;

      require(usdc.transferFrom(msg.sender, address(this), usdcAmount), "USDC transfer failed");

      fls.mint(msg.sender, flsAmount);

      emit SwapUSDCForFLS(msg.sender, usdcAmount, flsAmount);
    }

    function swapFlsForUsdc(uint256 flsAmount) external {
      require(flsAmount > 0, "Amount must be positive");

      uint256 usdcAmount = flsAmount / exchangeRate;

      require(fls.burn(msg.sender, flsAmount), "FLS burn failed");
      require(usdc.transfer(msg.sender, usdcAmount), "USDC transfer failed");

      emit SwapFLSForUSDC(msg.sender, flsAmount, usdcAmount);
    }

    function withdrawUsdc(uint256 usdcAmount) external onlyRole(OWNER_ROLE) {
      require(usdcAmount > 0, "Amount must be positive");
      require(usdc.transfer(msg.sender, usdcAmount), "USDC transfer failed");

      emit USDCWithdrawn(msg.sender, usdcAmount);
    }

    function depositUsdc(uint256 usdcAmount) external onlyRole(OWNER_ROLE) {
      require(usdcAmount > 0, "Amount must be positive");
      require(usdc.transferFrom(msg.sender, address(this), usdcAmount), "USDC transfer failed");

      emit USDCDeposited(msg.sender, usdcAmount);
    }
}
