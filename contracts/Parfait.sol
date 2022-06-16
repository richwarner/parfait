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

interface CEther {
    function mint() external payable;

    function redeem(uint redeemTokens) external returns (uint);

    function balanceOf(address) external view returns (uint); //Lee added
}

contract Parfait is Initializable {
    address public owner;
    uint public CETHAllocation;
    uint public CWBTCAllocation;
    uint public CDAIAllocation;

    // all addresses on Kovan
    IERC20 WETH9 = IERC20(0xd0A1E359811322d97991E03f863a0C30C2cF029C);
    IERC20 WBTC = IERC20(0xA0A5aD2296b38Bd3e3Eb59AAEAF1589E8d9a29A9);
    IERC20 DAI = IERC20(0x4F96Fe3b7A6Cf9725f59d353F723c1bDb64CA6Aa);

    CEther CETH = CEther(0x41B5844f4680a8C38fBb695b7F9CFd1F64474a72);
    CErc20 CWBTC = CErc20(0xa1fAA15655B0e7b6B6470ED3d096390e6aD93Abb);
    CErc20 CDAI = CErc20(0xF0d0EB522cfa50B716B3b1604C4F0fA6f04376AD);

    AggregatorV3Interface internal ETHPriceFeed =
        AggregatorV3Interface(0x9326BFA02ADD2366b30bacB125260Af641031331);
    AggregatorV3Interface internal WBTCPriceFeed =
        AggregatorV3Interface(0x6135b13325bfC4B00278B4abC5e20bbce2D6580e);
    AggregatorV3Interface internal DAIPriceFeed =
        AggregatorV3Interface(0x777A68032a88E5A84678A77Af2CD65A7b3c0775a);

    /* IswapRouter public immutable swapRouter; */

    function initialize(
        address _owner,
        uint _CETHAllocation,
        uint _CWBTCAllocation,
        uint _CDAIAllocation
    ) public payable initializer {
        owner = _owner;
        //updateAllocations(_CETHAllocation, _CWBTCAllocation, _CDAIAllocation);
    }

    function rebalance() public {
/*         require(msg.sender == owner, "only owner can call this");
        (uint ETHBalance, uint WBTCBalance, uint CDAIBalance) = getBalances();
        (int ETHPrice, int WBTCPrice, int CDAIPrice) = getPrices();

        // CODE BELOW WILL NOT COMPILE - price feed outs on int, so we may need to switch all uints over to int... might be better solution
        uint ETHValue = ETHBalance * ETHPrice; 
        uint WBTCValue = WBTCBalance * WBTCPrice;
        uint CDAIValue = CDAIBalance * CDAIPrice;
        uint totalValue = ETHValue + WBTCValue + CDAIValue;

        uint CETHAdjustment = ((totalValue * CETHAllocation) / 100) - ETHValue;
        uint CWBTCAdjustment = ((totalValue * CWBTCAllocation) / 100) -
            WBTCValue;
        uint CDAIAdjustment = ((totalValue * CDAIAllocation) / 100) - CDAIValue;

        if (CETHAdjustment < 0) {
            //redeem CETHAdjustment amount of CETH for ETH
            //then deposit ETH for WETH
        }
        if (CWBTCAdjustment < 0) {
            //deposit WBTCAdjustment of CWBTC for WBTC
            //then swap WBTC for WETH
        }
        if (CDAIAdjustment < 0) {
            //redeem CDAIAdjustment amount of CDAI for DAI
            //then swap DAI for WETH
        }
        if (CWBTCAdjustment > 0) {
            //swap CWBTCAdjustment amount of WETH for WBTC
            //deposit WBTC for CWBTC
        }
        if (CDAIAdjustment > 0) {
            //swap WETH for DAI
            //Deposit DAI for CDAI
        } */
    }

    function updateAllocations(
        uint _CETHAllocation,
        uint _CWBTCAllocation,
        uint _CDAIAllocation
    ) external payable {
        require(msg.sender == owner, "only owner can call this");
        require(
            _CETHAllocation + _CWBTCAllocation + _CDAIAllocation == 100,
            "invalid allocations sum"
        );
        CETHAllocation = _CETHAllocation;
        CWBTCAllocation = _CWBTCAllocation;
        CDAIAllocation = _CDAIAllocation;
        rebalance();
    }

    function withdraw() external {
        require(msg.sender == owner, "only owner can call this");
    }

    receive() external payable {}

    function getBalances() public view returns (uint CETHBalance, uint CWBTCBalance, uint CDAIBalance) {
        CETHBalance = CETH.balanceOf(address(this));
        CWBTCBalance = WBTC.balanceOf(address(this));
        CDAIBalance = CDAI.balanceOf(address(this));
    }

    function getPrices() public view returns (int, int, int) {
        (, int ETHPrice, , , ) = ETHPriceFeed.latestRoundData();
        (, int WBTCPrice, , , ) = WBTCPriceFeed.latestRoundData();
        (, int DAIPrice, , , ) = DAIPriceFeed.latestRoundData();
        return (ETHPrice, WBTCPrice, DAIPrice);
    }
}
