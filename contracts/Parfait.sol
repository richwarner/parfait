//SPDX-License-Identifier: MIT
pragma solidity 0.8.4;
pragma abicoder v2; //Uniswap guide: to allow arbitrary nested arrays and structs to be encoded and decoded in calldata, a feature used when executing a swap.

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

//compounds interace
interface CErc20 {
    function mint(uint256) external returns (uint256);

    function exchangeRateStored() external view returns (uint256);

    function supplyRatePerBlock() external returns (uint256);

    function redeem(uint) external returns (uint);

    function redeemUnderlying(uint) external returns (uint);

    function balanceOf(address) external view returns (uint); //Lee added
}

interface CEther {
    function mint() external payable;

    function exchangeRateStored() external view returns (uint256);

    function redeemUnderlying(uint) external returns (uint);

    function balanceOf(address) external view returns (uint); //Lee added
}

interface IWETH is IERC20 {
    function deposit() external payable;
    function withdraw(uint) external;
}

contract Parfait is Initializable {
    address public owner;
    int public CETHAllocation;
    int public CWBTCAllocation;
    int public CDAIAllocation;

    // all addresses on Kovan
    IWETH WETH = IWETH(0xd0A1E359811322d97991E03f863a0C30C2cF029C);
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

    ISwapRouter internal swapRouter = ISwapRouter(0xE592427A0AEce92De3Edee1F18E0157C05861564);

    function initialize(
        address _owner,
        int _CETHAllocation,
        int _CWBTCAllocation,
        int _CDAIAllocation
    ) public payable initializer {
        require(_CETHAllocation + _CWBTCAllocation + _CDAIAllocation == 100, "invalid allocations sum");
        owner = _owner;
        CETHAllocation = _CETHAllocation;
        CWBTCAllocation = _CWBTCAllocation;
        CDAIAllocation = _CDAIAllocation;

        //deposit ETH for CETH
        CETH.mint{ value: uint(msg.value * uint(_CETHAllocation) / 100) , gas: 250000 }();

        //convert remaining ETH to WETH
        WETH.deposit{ value: (msg.value * uint(_CWBTCAllocation + _CDAIAllocation) / 100) , gas: 250000 }();
        //declare uniswap params
        ISwapRouter.ExactInputSingleParams memory params =
            ISwapRouter.ExactInputSingleParams({
                tokenIn: address(0),
                tokenOut: address(0),
                fee: 3000,
                recipient: msg.sender,
                deadline: block.timestamp,
                amountIn: 0,
                amountOutMinimum: 0, // this leaves txs vulnerable bad rates & MEV
                sqrtPriceLimitX96: 0
            });

        //swap WETH for WBTC
        TransferHelper.safeApprove(address(WETH), address(swapRouter), (msg.value * uint(_CWBTCAllocation) / 100)); //scale lowered by 1e10 since WBTC is 1e8 base 
        params.tokenIn = address(WETH);
        params.tokenOut = address(WBTC);
        params.amountIn = (msg.value * uint(_CWBTCAllocation) / 100);
        swapRouter.exactInputSingle(params);
        //deposit WBTC for CWBTC
        CWBTC.mint(WBTC.balanceOf(address(this)));

        //swap WETH for DAI
        TransferHelper.safeApprove(address(WETH), address(swapRouter), (msg.value * uint(_CWBTCAllocation) / 100));
        params.tokenIn = address(WETH);
        params.tokenOut = address(DAI);
        params.amountIn = (msg.value * uint(_CWBTCAllocation) / 100);
        swapRouter.exactInputSingle(params);
        //Deposit DAI for CDAI
        CDAI.mint(DAI.balanceOf(address(this)));
    }

    function rebalance() public {
        require(msg.sender == owner, "only owner can call this");
        (int ETHBalance, int WBTCBalance, int DAIBalance) = getBalances();
        (int ETHPrice, int BTCPrice, int DAIPrice) = getPrices();

        //Balances (scaled 1e18) * Prices (scaled 1e8) = Values (scaled 1e26)
        int ETHValue = ETHBalance * ETHPrice; 
        int WBTCValue = WBTCBalance * BTCPrice;
        int CDAIValue = DAIBalance * DAIPrice;
        int totalValue = ETHValue + WBTCValue + CDAIValue;
        //adjustments are scaled 1e26 (same as values)
        int CETHAdjustment = ((totalValue * CETHAllocation) / 100) - ETHValue;
        int CWBTCAdjustment = ((totalValue * CWBTCAllocation) / 100) - WBTCValue;
        int CDAIAdjustment = ((totalValue * CDAIAllocation) / 100) - CDAIValue;

        //set uniswap parameters
        ISwapRouter.ExactInputSingleParams memory params =
            ISwapRouter.ExactInputSingleParams({
                tokenIn: address(0),
                tokenOut: address(0),
                fee: 3000,
                recipient: msg.sender,
                deadline: block.timestamp,
                amountIn: 0,
                amountOutMinimum: 0, // this leaves txs vulnerable bad rates & MEV
                sqrtPriceLimitX96: 0
            });

        // --- SELLS TO WETH ---
        if (CETHAdjustment < 0) {
            //redeem CETHAdjustment amount of CETH for ETH
            CETH.redeemUnderlying(uint(CETHAdjustment / ETHPrice));
            //deposit ETH for WETH
            WETH.deposit{ value: uint(CETHAdjustment / ETHPrice) , gas: 250000 }();
        }
        if (CWBTCAdjustment < 0) {
            //redeem WBTCAdjustment of CWBTC for WBTC
            CWBTC.redeemUnderlying(uint(CWBTCAdjustment / (BTCPrice * 1e10))); //scale lowered by 1e10 since WBTC is 1e8 base 
            //then swap WBTC for WETH
            TransferHelper.safeApprove(address(WBTC), address(swapRouter), WBTC.balanceOf(address(this)));  
            params.tokenIn = address(WBTC);
            params.tokenOut = address(WETH);
            params.amountIn = WBTC.balanceOf(address(this));
            swapRouter.exactInputSingle(params);        
        }
        if (CDAIAdjustment < 0) {
            //redeem CDAIAdjustment amount of CDAI for DAI
            CDAI.redeemUnderlying(uint(CDAIAdjustment / DAIPrice));
            //then swap DAI for WETH
            TransferHelper.safeApprove(address(DAI), address(swapRouter), DAI.balanceOf(address(this)));
            params.tokenIn = address(DAI);
            params.tokenOut = address(WETH);
            params.amountIn = DAI.balanceOf(address(this));
            swapRouter.exactInputSingle(params); 
        }
        //maybe take balance of WETH at this point and re-calculate buy amounts from balance of WETH to prevent small amounts of WETH from sitting in account

        // --- BUYS FROM WETH ---
        if (CETHAdjustment > 0) {
            //withdraw WETH for ETH
            WETH.withdraw(uint(CETHAdjustment / ETHPrice));
            //deposit ETH for CETH
            CETH.mint{ value: address(this).balance , gas: 250000 }();
        }
        if (CWBTCAdjustment > 0) {
            //swap CWBTCAdjustment amount of WETH for WBTC
            TransferHelper.safeApprove(address(WETH), address(swapRouter), uint(CWBTCAdjustment / (BTCPrice * 1e10))); //scale lowered by 1e10 since WBTC is 1e8 base 
            params.tokenIn = address(WETH);
            params.tokenOut = address(WBTC);
            params.amountIn = uint(CWBTCAdjustment / (BTCPrice * 1e10));
            swapRouter.exactInputSingle(params);
            //deposit WBTC for CWBTC
            CWBTC.mint(WBTC.balanceOf(address(this)));
        }
        if (CDAIAdjustment > 0) {
            //swap CDAIAdjustment amount of WETH for DAI
            TransferHelper.safeApprove(address(WETH), address(swapRouter), uint(CDAIAdjustment / DAIPrice));
            params.tokenIn = address(WETH);
            params.tokenOut = address(DAI);
            params.amountIn = uint(CDAIAdjustment / DAIPrice);
            swapRouter.exactInputSingle(params);
            //Deposit DAI for CDAI
            CDAI.mint(DAI.balanceOf(address(this)));
        }
    }

    function updateAllocations(
        int _CETHAllocation,
        int _CWBTCAllocation,
        int _CDAIAllocation
    ) public payable {
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

    /* function withdraw() external {
        require(msg.sender == owner, "only owner can call this");
    } */

    receive() external payable {}

    //returns balances of token in base units (scaled up 1e18)
    function getBalances() public view returns (int ETHBalance, int WBTCBalance, int DAIBalance) {
        ETHBalance = int(CETH.balanceOf(address(this)) * (CETH.exchangeRateStored()/1e18));
        WBTCBalance = int(CWBTC.balanceOf(address(this)) * (CWBTC.exchangeRateStored()/1e18)) * 1e10; //WBTC only has 8 digits, scale up to match other units
        DAIBalance = int(CDAI.balanceOf(address(this)) * (CDAI.exchangeRateStored()/1e18));
    }

    function check0Balances() public view returns (int ETHBalance, int WETHBalance, int WBTCBalance, int DAIBalance) {
        ETHBalance = int(address(this).balance);
        WETHBalance = int(WETH.balanceOf(address(this)));
        WBTCBalance = int(WBTC.balanceOf(address(this)));
        DAIBalance = int(DAI.balanceOf(address(this))); 
    }

    //returns prices scaled by 1e8
    function getPrices() public view returns (int ETHPrice, int BTCPrice, int DAIPrice) {
        (, ETHPrice, , , ) = ETHPriceFeed.latestRoundData();
        (, BTCPrice, , , ) = WBTCPriceFeed.latestRoundData();
        (, DAIPrice, , , ) = DAIPriceFeed.latestRoundData();
    }
}