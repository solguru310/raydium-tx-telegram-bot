export type TradeType = "BUY" | "SELL";

export interface Swap {
  // transaction signature
  signature: string;
  // ms since epoch when the transaction was processed
  timestamp: number;
  // mint of the alt token being traded
  tokenMint: string;
  // decimals of the alt token being traded
  tokenDecimals: number;
  // type of trade (BUY or SELL)
  type: TradeType;
  // UI amount of the input token, without decimals
  amountIn: number;
  // UI amount of the output otken, without decimals
  amountOut: number;
  // raydium amm pool id which was used for the swap
  poolId: string;
  // address of the user who signed the transaction
  signer: string;
}

export interface TokenAccountInfo {
  //token mint
  mint: string;
  //token decimals
  decimals: number;
}