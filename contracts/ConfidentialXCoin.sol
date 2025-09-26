// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {ConfidentialFungibleToken} from "new-confidential-contracts/token/ConfidentialFungibleToken.sol";
import {FHE, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {CoprocessorConfig} from "@fhevm/solidity/lib/Impl.sol";

contract ConfidentialXCoin is ConfidentialFungibleToken {
    constructor() ConfidentialFungibleToken("XCoin", "XCOIN", "") {
        // Configure Zama Sepolia coprocessor (same addresses used in XChat)
        FHE.setCoprocessor(
            CoprocessorConfig({
                ACLAddress: 0x687820221192C5B662b25367F70076A37bc79b6c,
                CoprocessorAddress: 0x848B0066793BcC60346Da1F49049357399B8D595,
                DecryptionOracleAddress: 0xa02Cda4Ca3a71D7C46997716F4283aa851C28812,
                KMSVerifierAddress: 0x1364cBBf2cDF5032C47d8226a6f6FBD2AFCDacAC
            })
        );
    }

    function faucet() external {
        euint64 amount = FHE.asEuint64(100_000_000); // 100 XCOIN if decimals = 6
        _mint(msg.sender, amount);
    }
}
