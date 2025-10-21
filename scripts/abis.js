module.exports = {
  IERC20: [
    'function approve(address spender, uint256 amount) external returns (bool)',
    'function balanceOf(address owner) external view returns (uint256)'
  ],
  IUniswapV2Router02: [
    'function addLiquidityETH(address token,uint amountTokenDesired,uint amountTokenMin,uint amountETHMin,address to,uint deadline) payable returns (uint amountToken, uint amountETH, uint liquidity)'
  ]
};
