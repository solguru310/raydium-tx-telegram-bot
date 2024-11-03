import { ParsedInstruction, ParsedTransactionWithMeta, PartiallyDecodedInstruction } from "@solana/web3.js";
import { Swap, TokenAccountInfo } from "../../types";
import { WSOL_MINT, RAYDIUM_AMM } from "../../constants";
import { fromDecimals } from "../../utils";

export const getRaydiumAmmSwapTransactionData = async (transactionData: ParsedTransactionWithMeta): Promise<Swap> => {

    let tokenAccountInfo: TokenAccountInfo = {
        mint: "",
        decimals: 0
    };
    const timestamp = transactionData.blockTime;
    if (!timestamp) {
        throw "Transaction is not yet processed.";
    }

    const signature = transactionData.transaction.signatures[0];

    // Extract account keys
    const accountKeys = transactionData.transaction.message.accountKeys.map(key =>
        key.pubkey.toBase58()
    );

    // Find the index of the Raydium swap instruction
    const swapInstructionIndex = transactionData.transaction.message.instructions.findIndex(
        instruction => instruction.programId.toBase58() === RAYDIUM_AMM
    );

    if (swapInstructionIndex === -1) {
        throw "Raydium instruction not found in the transaction.";
    }

    if (!transactionData.meta?.innerInstructions) {
        throw "Transaction not confirmed yet.";
    }

    // Extract inner instructions related to the swap
    const swapInnerInstructions = transactionData.meta.innerInstructions.reduce<ParsedInstruction[]>((accumulator, innerInstruction) => {
        if (innerInstruction.index === swapInstructionIndex) {
            const parsedInstructions = innerInstruction.instructions as ParsedInstruction[];
            return accumulator.concat(parsedInstructions);
        }
        return accumulator;
    }, []);

    const destination1 = swapInnerInstructions[0].parsed.info.destination;
    const destination1AccountInfo = transactionData.meta.preTokenBalances!.find(
        balance => balance.accountIndex === accountKeys.indexOf(destination1)
    );

    const swapInstruction = transactionData.transaction.message.instructions[swapInstructionIndex] as PartiallyDecodedInstruction;

    // Extract pool ID and token accounts
    const poolId = swapInstruction.accounts[1].toBase58();
    const token1Account = swapInstruction.accounts[5].toBase58();
    const token2Account = swapInstruction.accounts[6].toBase58();

    // Retrieve account information for both tokens
    const token1AccountInfo = transactionData.meta.preTokenBalances!.find(
        balance => balance.accountIndex === accountKeys.indexOf(token1Account)
    );
    const token2AccountInfo = transactionData.meta.preTokenBalances!.find(
        balance => balance.accountIndex === accountKeys.indexOf(token2Account)
    );

    if (token1AccountInfo!.mint === WSOL_MINT) {
        tokenAccountInfo.mint = token2AccountInfo!.mint;
        tokenAccountInfo.decimals = token2AccountInfo!.uiTokenAmount.decimals;
    } else if (token2AccountInfo!.mint === WSOL_MINT) {
        tokenAccountInfo.mint = token1AccountInfo!.mint;
        tokenAccountInfo.decimals = token1AccountInfo!.uiTokenAmount.decimals;
    }

    // Parse amounts from inner instructions
    const token1Amount = Number((swapInnerInstructions[0] as ParsedInstruction).parsed.info.amount);
    const token2Amount = Number((swapInnerInstructions[1] as ParsedInstruction).parsed.info.amount);

    // Determine the transaction type (BUY/SELL) based on WSOL involvement
    if (destination1AccountInfo?.mint === WSOL_MINT) {
        return {
            signature,
            timestamp,
            tokenMint: tokenAccountInfo!.mint,
            tokenDecimals: tokenAccountInfo!.decimals,
            type: 'BUY',
            amountIn: fromDecimals(token1Amount).toNumber(),
            amountOut: fromDecimals(
                token2Amount,
                token2AccountInfo!.uiTokenAmount.decimals
            ).toNumber(),
            poolId,
            signer: accountKeys[0],
        };
    } else if (destination1AccountInfo?.mint !== WSOL_MINT) {
        return {
            signature,
            timestamp,
            tokenMint: tokenAccountInfo!.mint,
            tokenDecimals: tokenAccountInfo!.decimals,
            type: 'SELL',
            amountIn: fromDecimals(
                token1Amount,
                token1AccountInfo!.uiTokenAmount.decimals
            ).toNumber(),
            amountOut: fromDecimals(token2Amount).toNumber(),
            poolId,
            signer: accountKeys[0],
        };
    } else {
        throw "Unable to parse token pair without WSOL on one side.";
    }
}