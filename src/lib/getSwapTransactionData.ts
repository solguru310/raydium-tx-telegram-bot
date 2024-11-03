import {
  Connection,
  clusterApiUrl,
} from "@solana/web3.js";

import { SOLANA_NETWORK, RAYDIUM_AMM, RAYDIUM_CP_SWAP } from "../constants";
import { Swap } from "../types";
import { getRaydiumAmmSwapTransactionData, getRaydiumCpSwapTransactionData } from "./api";

const connection = new Connection(clusterApiUrl(SOLANA_NETWORK), "confirmed");

export const getSwapTransactionData = async (signature: string): Promise<Swap> => {
  const transactionData = await connection.getParsedTransaction(signature, {
    maxSupportedTransactionVersion: 0,
  });

  if (!transactionData) {
    throw "Transaction not found for the provided signature.";
  }

  // Skip handling failed transactions
  if (transactionData.meta?.err) {
    throw `Transaction failed: ${transactionData.meta.err}`;
  }

  if (!transactionData.meta?.innerInstructions) {
    throw "Transaction not confirmed yet.";
  }

  const swapInstructionIndex = transactionData.transaction.message.instructions.findIndex(
    instruction => instruction.programId.toBase58() === RAYDIUM_AMM
  );

  const cpSwapInnerInstructions = transactionData.meta?.innerInstructions
    ?.filter(innerInstruction =>
      innerInstruction.instructions.some(instruction =>
        instruction.programId.toBase58() === RAYDIUM_CP_SWAP
      )
    )[0];

  if (swapInstructionIndex !== -1) {
    return await getRaydiumAmmSwapTransactionData(transactionData);
  } else if (cpSwapInnerInstructions) {
    return await getRaydiumCpSwapTransactionData(transactionData);
  } else {
    throw "Raydium instruction not found in the transaction."
  }
};
