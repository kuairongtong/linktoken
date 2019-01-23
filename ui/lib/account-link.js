module.exports = function (address, network) {
  const net = parseInt(network)
  let link
  switch (net) {
    case 1: // main net
      link = `http://wallet.66otc.com/wkc#?address=${address}`
      break
    case 2: // morden test net
      link = `http://wallet.66otc.com/wkc#?address=${address}`
      break
    default:
      link = ''
      break
  }

  return link
}
