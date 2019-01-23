const {
  TEST,
  MAINNET,
  TEST_DISPLAY_NAME,
  MAINNET_DISPLAY_NAME,
} = require('./enums')

const networkToNameMap = {
  [TEST]: TEST_DISPLAY_NAME,
  [MAINNET]: MAINNET_DISPLAY_NAME,
}

const getNetworkDisplayName = key => networkToNameMap[key]

module.exports = {
  getNetworkDisplayName,
}
