import { BigNumber } from "bignumber.js";

export const fromDecimals = (
  amount: string | BigInt | number,
  decimals: number = 9
): BigNumber => {
  const amountBig = new BigNumber(amount.toString());
  return amountBig.dividedBy(new BigNumber(10).exponentiatedBy(decimals));
};

export const validateTransactionSignature = (signature: string) => {
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{87,88}$/; // Base58 regex for Solana transaction signatures
  return base58Regex.test(signature);
};
