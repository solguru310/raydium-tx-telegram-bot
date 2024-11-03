import { Connection, clusterApiUrl, PublicKey } from "@solana/web3.js";
import axios from "axios";

import { SOLANA_NETWORK } from "../constants";

// Fetch SOL balance and USD value
export async function getSOLBalanceAndUSD(
  walletAddress: string
): Promise<string> {
  try {
    // Connect to Solana
    const connection = new Connection(
      clusterApiUrl(SOLANA_NETWORK),
      "confirmed"
    );

    // Convert wallet address to PublicKey
    const publicKey = new PublicKey(walletAddress);

    // Get SOL balance (in lamports)
    const balanceLamports = await connection.getBalance(publicKey);
    const balanceSOL = balanceLamports / 1e9; // Convert lamports to SOL (1 SOL = 10^9 lamports)

    const solPriceUSD = await fetchSOLPriceUSD();

    // Calculate balance in USD
    const balanceUSD = balanceSOL * solPriceUSD;

    const returnValue = `${balanceSOL} SOL / ${balanceUSD.toFixed(2)} USD`;
    return returnValue;
  } catch (error) {
    console.log(error);
    const err = "Error: Invalid public key input or fetching error";
    return err;
  }
}

/**
 * Fetch the current SOL price in USD from CoinGecko.
 *
 * @returns A promise that resolves to the SOL price in USD.
 */
async function fetchSOLPriceUSD(): Promise<number> {
  const response = await axios.get(
    "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"
  );
  return response.data.solana.usd;
}
