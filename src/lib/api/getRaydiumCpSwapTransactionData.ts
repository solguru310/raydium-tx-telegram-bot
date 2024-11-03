import { ParsedInstruction, ParsedTransactionWithMeta, PartiallyDecodedInstruction } from "@solana/web3.js";
import { Swap } from "../../types";
import { WSOL_MINT, RAYDIUM_CP_SWAP } from "../../constants";
import { fromDecimals } from "../../utils";

export const getRaydiumCpSwapTransactionData = async (transactionData: ParsedTransactionWithMeta): Promise<Swap> => {

    const timestamp = transactionData.blockTime;
    if (!timestamp) {
        throw "Transaction is not yet processed.";
    }

    const signature = transactionData.transaction.signatures[0];

    const cpSwapInnerInstructions = transactionData.meta?.innerInstructions
        ?.filter(innerInstruction =>
            innerInstruction.instructions.some(instruction =>
                instruction.programId.toBase58() === RAYDIUM_CP_SWAP
            )
        )[0];

    if (!cpSwapInnerInstructions) {
        throw "Raydium instruction not found in the transaction."
    }

    const cpSwapInstruction = cpSwapInnerInstructions.instructions[0] as PartiallyDecodedInstruction;
    const signer = cpSwapInstruction.accounts[0].toBase58();
    const poolId = cpSwapInstruction.accounts[3].toBase58();
    const token1Amount = Number((cpSwapInnerInstructions.instructions[1] as ParsedInstruction).parsed.info.tokenAmount.uiAmount);
    const token2Amount = Number((cpSwapInnerInstructions.instructions[2] as ParsedInstruction).parsed.info.tokenAmount.uiAmount);
    const token1Decimals = Number((cpSwapInnerInstructions.instructions[1] as ParsedInstruction).parsed.info.tokenAmount.decimals);
    const token2Decimals = Number((cpSwapInnerInstructions.instructions[2] as ParsedInstruction).parsed.info.tokenAmount.decimals);
    const token1Mint = (cpSwapInnerInstructions.instructions[1] as ParsedInstruction).parsed.info.mint;
    const token2Mint = (cpSwapInnerInstructions.instructions[2] as ParsedInstruction).parsed.info.mint;

    if (token1Mint == WSOL_MINT) {
        return {
            signature,
            timestamp,
            tokenMint: token2Mint,
            tokenDecimals: token2Decimals,
            type: 'BUY',
            amountIn: fromDecimals(token1Amount).toNumber(),
            amountOut: fromDecimals(
                token2Amount,
                token2Decimals
            ).toNumber(),
            poolId,
            signer,
        };
    } else if (token2Mint == WSOL_MINT) {
        return {
            signature,
            timestamp,
            tokenMint: token1Mint,
            tokenDecimals: token1Decimals,
            type: 'SELL',
            amountIn: fromDecimals(
                token1Amount,
                token1Decimals
            ).toNumber(),
            amountOut: fromDecimals(token2Amount).toNumber(),
            poolId,
            signer,
        };
    } else {
        throw `Couldn't parse pair token without WSOL in one side`;
    }
}