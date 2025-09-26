// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {ConfidentialFungibleToken} from "new-confidential-contracts/token/ConfidentialFungibleToken.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {FHE, euint64} from "@fhevm/solidity/lib/FHE.sol";

contract ConfidentialXCoin is ConfidentialFungibleToken, SepoliaConfig {
    constructor() ConfidentialFungibleToken("XCoin", "XCOIN", "") {}

    function faucet() external {
        euint64 amount = FHE.asEuint64(100_000_000);
        _mint(msg.sender, amount);
    }
}
