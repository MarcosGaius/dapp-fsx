// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "./FLS.sol"; 

contract LiquidityPool is AccessControl, Pausable {
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
      require(initialRate > 0, "Initial exchange rate must be positive");

      usdc = IERC20(usdcAddress);
      fls = FLS(flsAddress);
      exchangeRate = initialRate;

      _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
      _grantRole(OWNER_ROLE, msg.sender);
    }

    function getExchangeRate() public view returns (uint256) {
      return exchangeRate;
    }

    function getPoolPairAddresses() public view returns (address, address) {
      return (address(usdc), address(fls));
    }

    function updateExchangeRate(uint256 rate) external onlyRole(OWNER_ROLE) whenNotPaused {
      require(rate > 0, "Exchange rate must be positive");
      exchangeRate = rate;
      emit ExchangeRateUpdated(rate);
    }

    function swapUsdcForFls(uint256 usdcAmount) external whenNotPaused {
      require(usdcAmount > 0, "Amount must be positive");

      uint256 flsAmount = Math.mulDiv(usdcAmount, exchangeRate, 1e6);

      require(usdc.transferFrom(msg.sender, address(this), usdcAmount), "USDC transfer failed");

      fls.mint(msg.sender, flsAmount);

      emit SwapUSDCForFLS(msg.sender, usdcAmount, flsAmount);
    }

    function swapFlsForUsdc(uint256 flsAmount) external whenNotPaused {
      require(flsAmount > 0, "Amount must be positive");

      uint256 usdcAmount = Math.mulDiv(flsAmount, 1e6, exchangeRate); 

      require(fls.burn(msg.sender, flsAmount), "FLS burn failed");
      require(usdc.transfer(msg.sender, usdcAmount), "USDC transfer failed");

      emit SwapFLSForUSDC(msg.sender, flsAmount, usdcAmount);
    }

    function withdrawUsdc(uint256 usdcAmount) external onlyRole(OWNER_ROLE) whenNotPaused {
      require(usdcAmount > 0, "Amount must be positive");
      require(usdc.transfer(msg.sender, usdcAmount), "USDC transfer failed");

      emit USDCWithdrawn(msg.sender, usdcAmount);
    }

    function depositUsdc(uint256 usdcAmount) external onlyRole(OWNER_ROLE) whenNotPaused {
      require(usdcAmount > 0, "Amount must be positive");
      require(usdc.transferFrom(msg.sender, address(this), usdcAmount), "USDC transfer failed");

      emit USDCDeposited(msg.sender, usdcAmount);
    }

    function pause() external onlyRole(OWNER_ROLE) {
      _pause();
    }

    function unpause() external onlyRole(OWNER_ROLE) {
      _unpause();
    }
}
