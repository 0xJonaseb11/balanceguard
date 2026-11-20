function errorChain(error: unknown): Error[] {
  const chain: Error[] = [];
  let current: unknown = error;
  while (current instanceof Error && chain.length < 8) {
    chain.push(current);
    current = current.cause;
  }
  return chain;
}

function hasCode(error: Error, code: number): boolean {
  return "code" in error && error.code === code;
}

export function walletErrorMessage(error: unknown): string {
  const chain = errorChain(error);
  if (chain.some((item) => item.name === "ProviderNotFoundError")) {
    return "No browser wallet found. Install MetaMask or Rabby, then reload this page.";
  }
  if (chain.some((item) => item.name === "UserRejectedRequestError" || hasCode(item, 4001))) {
    return "The request was rejected in the wallet.";
  }
  if (chain.some((item) => item.name === "SwitchChainNotSupportedError")) {
    return "This wallet cannot switch networks here. Add Unichain Sepolia in the wallet, then retry.";
  }
  const first = chain[0];
  if (!first) return "Something went wrong. Try again.";
  if ("shortMessage" in first && typeof first.shortMessage === "string") return first.shortMessage;
  return first.message;
}
