module.exports = getBuyEthUrl

/**
 * Gives the caller a url at which the user can acquire eth, depending on the network they are in
 *
 * @param {object} opts Options required to determine the correct url
 * @param {string} opts.network The network for which to return a url
 * @param {string} opts.amount The amount of ETH to buy on coinbase. Only relevant if network === '1'.
 * @param {string} opts.address The address the bought ETH should be sent to.  Only relevant if network === '1'.
 * @returns {string|undefined} The url at which the user can access ETH, while in the given network. If the passed
 * network does not match any of the specified cases, or if no network is given, returns undefined.
 *
 */
function getBuyEthUrl ({ network, amount, address }) {
  if ( network === "2") {
    return `https://www.playwkc.com/buy/WKC?code=Linker&amount=${amount}&address=${address}&crypto_currency=WKC`
  }
  return `https://www.66otc.com/trade?code=Linker&amount=${amount}&address=${address}&crypto_currency=WKC`
}
