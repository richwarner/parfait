//SPDX-License-Identifier: MIT
pragma solidity 0.8.4;
pragma abicoder v2; //Uniswap guide: to allow arbitrary nested arrays and structs to be encoded and decoded in calldata, a feature used when executing a swap.

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
/* import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';
import '@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol'; */
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

//compounds interace
interface CErc20 {
    function mint(uint256) external returns (uint256);

    function exchangeRateCurrent() external returns (uint256);

    function supplyRatePerBlock() external returns (uint256);

    function redeem(uint) external returns (uint);

    function redeemUnderlying(uint) external returns (uint);

    function balanceOf(address) external view returns (uint); //Lee added
}

contract Parfait is Initializable {
    address public owner;
    uint public ethAllocation;
    uint public stEthAllocation;
    uint public cDaiAllocation;

    // all addresses on Rinkeby
    IERC20 weth9 = IERC20(0xc778417E063141139Fce010982780140Aa0cD5Ab);
    IERC20 stEth = IERC20(0xF4242f9d78DB7218Ad72Ee3aE14469DBDE8731eD); //is this the right address??
    IERC20 dai = IERC20(0x5592EC0cfb4dbc12D3aB100b257153436a1f0FEa);
    CErc20 cDai = CErc20(0x6D7F0754FFeb405d23C51CE938289d4835bE3b14);
    AggregatorV3Interface internal ethPriceFeed =
        AggregatorV3Interface(0x8A753747A1Fa494EC906cE90E9f37563A8AF630e);
    AggregatorV3Interface internal daiPriceFeed =
        AggregatorV3Interface(0x2bA49Aaa16E6afD2a993473cfB70Fa8559B523cF);

    /* AggregatorV3Interface internal stEthPriceFeed = AggregatorV3Interface();  */
    // price feed does not exist on Rinkeby
    /* IswapRouter public immutable swapRouter; */

    function initialize(
        address _owner,
        uint _ethAllocation,
        uint _stEthAllocation,
        uint _cDaiAllocation
    ) public payable initializer {
        owner = _owner;
        /* updateAllocations(_ethAllocation, _stEthAllocation, _cDaiAllocation); */
    }

    /* 	function rebalance() public {
		require(msg.sender == owner, "only owner can call this");
        (uint ethBalance, uint stEthBalance, uint cDaiBalance) = getBalances();
		(uint ethPrice, uint stEthPrice, uint cDaiPrice) = getPrices();
		
		uint ethValue = ethBalance * ethPrice;
		uint stEthValue = stEthBalance * stEthPrice;
		uint cDaiValue = cDaiBalance * cDaiPrice;
		uint totalValue = ethValue + stEthValue + cDaiValue;
		
		uint ethAdjustment = (totalValue * ethAllocation / 100) - ethValue;
		uint stEthAdjustment = (totalValue * stEthAllocation / 100) - stEthValue;
		uint cDaiAdjustment = (totalValue * cDaiAllocation / 100) - cDaiValue;

		if(stEthAdjustment < 0) {
			//sell stEthAdjustment of stEth for weth

		}
		if(cDaiAdjustment < 0) {
			//redeem cDaiAdjustment amount of cUsdc for Usdc
			
			//then swap usdc for weth
		}
		if(stEthAdjustment > 0) {
			//deposit stEthAdjustment of eth for weth
			
			//buy stEth from weth
		}
		if(cDaiAdjustment > 0) {
			//deposit cDaiAdjustment of eth for weth
			
			//buy Usdc from weth, 
			
			//then deposit Usdc for cUsdc
		}
	}

    function updateAllocations(uint _ethAllocation, uint _stEthAllocation, uint _cDaiAllocation) public {
        require(msg.sender == owner, "only owner can call this");
        require(_ethAllocation + _stEthAllocation + _cDaiAllocation == 100, "invalid allocations sum");
        ethAllocation = _ethAllocation;
		stEthAllocation = _stEthAllocation;
        stEthAllocation = _cDaiAllocation;
        rebalance();
    }

	function withdraw() external {
		require(msg.sender == owner, "only owner can call this");
	}
	
	receive() payable external {
	} */

    function getBalances()
        public
        view
        returns (
            uint ethBalance,
            uint stEthBalance,
            uint cDaiBalance
        )
    {
        ethBalance = address(this).balance;
        stEthBalance = stEth.balanceOf(address(this));
        cDaiBalance = cDai.balanceOf(address(this));
    }

    function getPrices()
        public
        view
        returns (
            int,
            int,
            int
        )
    {
        (, int ethPrice, , , ) = ethPriceFeed.latestRoundData();
        int stEthPrice = ethPrice; // stEthPrice feed does not exist on Chainlink Rinkeby
        (, int daiPrice, , , ) = daiPriceFeed.latestRoundData();

        return (ethPrice, stEthPrice, daiPrice);
    }
}
