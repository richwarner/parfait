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

    function redeem(uint) external returns (uint);

    function redeemUnderlying(uint) external returns (uint);

    function balanceOf(address) external view returns (uint); //Lee added
}

interface IWETH is IERC20 {
    function deposit() external payable;
    function withdraw(uint) external;
}

//contract Parfait is Initializable 
contract Parfait is Initializable {
    address public owner;
    int public CETHAllocation;
    int public CWBTCAllocation;
    int public CDAIAllocation;

    // all addresses on Rinkeby
    IWETH WETH = IWETH(0xc778417E063141139Fce010982780140Aa0cD5Ab);
    IERC20 WBTC = IERC20(0x577D296678535e4903D59A4C929B718e1D575e0A);
    IERC20 DAI = IERC20(0x5592EC0cfb4dbc12D3aB100b257153436a1f0FEa);

    CEther CETH = CEther(0xd6801a1DfFCd0a410336Ef88DeF4320D6DF1883e);
    CErc20 CWBTC = CErc20(0x0014F450B8Ae7708593F4A46F8fa6E5D50620F96);
    CErc20 CDAI = CErc20(0x6D7F0754FFeb405d23C51CE938289d4835bE3b14);

    AggregatorV3Interface internal ETHPriceFeed =
        AggregatorV3Interface(0x8A753747A1Fa494EC906cE90E9f37563A8AF630e);
    AggregatorV3Interface internal BTCPriceFeed =
        AggregatorV3Interface(0xECe365B379E1dD183B20fc5f022230C044d51404);
    AggregatorV3Interface internal DAIPriceFeed =
        AggregatorV3Interface(0x2bA49Aaa16E6afD2a993473cfB70Fa8559B523cF);

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

        if(_CETHAllocation > 0){
            //deposit ETH for CETH
            CETH.mint{ value: msg.value * uint(_CETHAllocation) / 100 }();
        }

        if(_CWBTCAllocation + _CDAIAllocation > 0) {
            //convert remaining ETH to WETH
            WETH.deposit{ value: (msg.value * uint(_CWBTCAllocation + _CDAIAllocation) / 100)}();

            //declare uniswap params
            ISwapRouter.ExactInputSingleParams memory params =
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: address(0),
                    tokenOut: address(0),
                    fee: 3000,
                    recipient: address(this),
                    deadline: block.timestamp,
                    amountIn: 0,
                    amountOutMinimum: 0, // this leaves txs vulnerable bad rates & MEV
                    sqrtPriceLimitX96: 0
                });
            if(_CWBTCAllocation > 0) {
                //swap WETH for WBTC
                TransferHelper.safeApprove(address(WETH), address(swapRouter), (msg.value * uint(_CWBTCAllocation) / 100));
                params.tokenIn = address(WETH);
                params.tokenOut = address(WBTC);
                params.amountIn = (msg.value * uint(_CWBTCAllocation) / 100);
                swapRouter.exactInputSingle(params);
                //deposit WBTC for CWBTC
                WBTC.approve(address(CWBTC), WBTC.balanceOf(address(this)));
                CWBTC.mint(WBTC.balanceOf(address(this)));
            }
            if(_CDAIAllocation > 0) {
                //swap WETH for DAI
                TransferHelper.safeApprove(address(WETH), address(swapRouter), (msg.value * uint(_CDAIAllocation) / 100));
                params.tokenIn = address(WETH);
                params.tokenOut = address(DAI);
                params.amountIn = (msg.value * uint(_CDAIAllocation) / 100);
                swapRouter.exactInputSingle(params);
                //Deposit DAI for CDAI
                DAI.approve(address(CDAI), DAI.balanceOf(address(this)));
                CDAI.mint(DAI.balanceOf(address(this)));
            }
        }
    }

    //this function receives ether, updates allocations and then rebalances 
    function updateAllocationsAndRebalance(
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

        sell();

        //deposit any ETH (from new deposits or redeeming CETH for ETH above) into WETH
        uint balance = address(this).balance;
        if(balance > 0) {
            WETH.deposit{ value: balance }();
        }

        buy();
    }

    // sells all strategies to ETH or WETH
    function sell() public {
        uint CETHBalance = CETH.balanceOf(address(this));
        uint CWBTCBalance = CWBTC.balanceOf(address(this));
        uint CDAIBalance = CDAI.balanceOf(address(this));

        if (CETHBalance > 0) {
            //redeem  CETH for ETH
            CETH.redeem(CETHBalance);
        }
        if (CWBTCBalance > 0) {
            //redeem CWBTC for WBTC
            CWBTC.redeem(CWBTCBalance);
            //then swap WBTC for WETH
            swap(address(WBTC), address(WETH), WBTC.balanceOf(address(this)));    
        }
        if (CDAIBalance > 0) {
            //redeem CDAI for DAI
            CDAI.redeem(CDAIBalance);
            //then swap DAI for WETH
            swap(address(DAI), address(WETH), DAI.balanceOf(address(this)));
        }
    }

    //buys from WETH as per allocations
    function buy() public {
        uint WETHBalance = WETH.balanceOf(address(this));
        uint CETHBuyAmount = WETHBalance * uint(CETHAllocation) / 100;
        uint CWBTCBuyAmount = WETHBalance * uint(CWBTCAllocation) / 100;
        uint CDAIBuyAmount = WETHBalance - CETHBuyAmount - CWBTCBuyAmount;

        if(CETHAllocation > 0) {
            //withdraw WETH for ETH
            WETH.withdraw(CETHBuyAmount);
            //deposit ETH for CETH
            CETH.mint{ value: address(this).balance }();
        }
        if(CWBTCAllocation > 0) {
            //swap WETH for WBTC
            swap(address(WETH), address(WBTC), CWBTCBuyAmount);
            //deposit WBTC for CWBTC
            WBTC.approve(address(CWBTC), WBTC.balanceOf(address(this)));
            CWBTC.mint(WBTC.balanceOf(address(this)));
        }
        if(CDAIAllocation > 0) {
            //swap WETH for DAI
            swap(address(WETH), address(DAI), CDAIBuyAmount);
            //Deposit DAI for CDAI
            DAI.approve(address(CDAI), DAI.balanceOf(address(this)));
            CDAI.mint(DAI.balanceOf(address(this)));
        }
    }

    // sell all to ETH and send out
    function withdraw() external {
        require(msg.sender == owner, "only owner can call this");
        sell();
        //withdraw balance of WETH for ETH
        uint WETHBalance = WETH.balanceOf(address(this));
        if(WETHBalance > 0) {
            WETH.withdraw(WETH.balanceOf(address(this)));
        }        
        //transfer out balance of ETH
        (bool success, ) = owner.call{value: address(this).balance}("");
        require(success, "transfer to owner unsuccessful");
    }

    //performs internal ERC20 swaps through uniswap
    function swap(address _tokenIn, address _tokenOut, uint _amount) internal {
        //approval
        TransferHelper.safeApprove(
            _tokenIn,
            address(swapRouter),
            _amount
        );

        //swap
        ISwapRouter.ExactInputSingleParams memory params =
            ISwapRouter.ExactInputSingleParams({
                tokenIn: _tokenIn,
                tokenOut: _tokenOut,
                fee: 3000,
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: _amount,
                amountOutMinimum: 0, // this leaves txs vulnerable bad rates & MEV
                sqrtPriceLimitX96: 0
            });
        swapRouter.exactInputSingle(params);
    }

    receive() external payable {
        WETH.deposit{ value: address(this).balance }();
    }

    //returns balances of token in base units scaled up 1e18
    function getBalances() public view returns (int ETHBalance, int WBTCBalance, int DAIBalance) {
        ETHBalance = int(CETH.balanceOf(address(this)) * (CETH.exchangeRateStored()) / 1e18); //check for overflow
        WBTCBalance = int(CWBTC.balanceOf(address(this)) * (CWBTC.exchangeRateStored()) / 1e18) * 1e10; //WBTC only has 8 digits, scale up to match other units
        DAIBalance = int(CDAI.balanceOf(address(this)) * (CDAI.exchangeRateStored()) / 1e18);
    }
    //returns prices (usd/token) scaled by 1e8
    function getPrices() public view returns (int ETHPrice, int BTCPrice, int DAIPrice) {
        (, ETHPrice, , , ) = ETHPriceFeed.latestRoundData();
        (, BTCPrice, , , ) = BTCPriceFeed.latestRoundData();
        (, DAIPrice, , , ) = DAIPriceFeed.latestRoundData();
    }
    //returns values (scaled by 1e26) = balances (scaled 1e18) * Prices (scaled 1e8)
    function getValues() public view returns (int ETHValue, int BTCValue, int DAIValue, int totalValue) {
        (int ETHBalance, int WBTCBalance, int DAIBalance) = getBalances();
        (int ETHPrice, int BTCPrice, int DAIPrice) = getPrices();
        
        ETHValue = ETHBalance * ETHPrice; 
        BTCValue = WBTCBalance * BTCPrice; //check that this calcs WBTC Value correctly?
        DAIValue = DAIBalance * DAIPrice;
        totalValue = ETHValue + BTCValue + DAIValue;
    }
    //for testing purposes - these should all be 0
    function check0Balances() public view returns (int ETHBalance, int WETHBalance, int WBTCBalance, int DAIBalance) {
        ETHBalance = int(address(this).balance);
        WETHBalance = int(WETH.balanceOf(address(this)));
        WBTCBalance = int(WBTC.balanceOf(address(this)));
        DAIBalance = int(DAI.balanceOf(address(this))); 
    }
}