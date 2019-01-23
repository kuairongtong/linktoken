const mergeMiddleware = require('json-rpc-engine/src/mergeMiddleware')
const createFetchMiddleware = require('../../lib/fetch')
const createInflightMiddleware = require('eth-json-rpc-middleware/inflight-cache')
const providerFromMiddleware = require('eth-json-rpc-middleware/providerFromMiddleware')
const BlockTracker = require('../../lib/PollingBlockTracker')

module.exports = createJsonRpcClient

function createJsonRpcClient ({ rpcUrl }) {
  const fetchMiddleware = createFetchMiddleware({ rpcUrl })
  const blockProvider = providerFromMiddleware(fetchMiddleware)
  const blockTracker = new BlockTracker({ provider: blockProvider })

  const networkMiddleware = mergeMiddleware([
    createInflightMiddleware(),
    fetchMiddleware,
  ])
  return { networkMiddleware, blockTracker }
}
