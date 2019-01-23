const pump = require('pump')
const RpcEngine = require('json-rpc-engine')
const createIdRemapMiddleware = require('json-rpc-engine/src/idRemapMiddleware')
const createJsonRpcStream = require('json-rpc-middleware-stream')
const LocalStorageStore = require('obs-store')
const asStream = require('obs-store/lib/asStream')
const ObjectMultiplex = require('obj-multiplex')
const util = require('util')
const log = require('loglevel')
const SafeEventEmitter = require('safe-event-emitter')

module.exports = LinkTokenLkpageProvider


/**
 * JSON-RPC error object
 *
 * @typedef {Object} RpcError
 * @property {number} code - Indicates the error type that occurred
 * @property {Object} [data] - Contains additional information about the error
 * @property {string} [message] - Short description of the error
 */

/**
 * Middleware configuration object
 *
 * @typedef {Object} MiddlewareConfig
 * @property {boolean} [override] - Use RPC_ERRORS message in place of provider message
 */

/**
 * Map of standard and non-standard RPC error codes to messages
 */
const RPC_ERRORS = {
  1: 'An unauthorized action was attempted.',
  2: 'A disallowed action was attempted.',
  3: 'An execution error occurred.',
  [-32600]: 'The JSON sent is not a valid Request object.',
  [-32601]: 'The method does not exist / is not available.',
  [-32602]: 'Invalid method parameter(s).',
  [-32603]: 'Internal JSON-RPC error.',
  [-32700]: 'Invalid JSON was received by the server. An error occurred on the server while parsing the JSON text.',
  internal: 'Internal server error.',
  unknown: 'Unknown JSON-RPC error.',
}

/**
 * Modifies a JSON-RPC error object in-place to add a human-readable message,
 * optionally overriding any provider-supplied message
 *
 * @param {RpcError} error - JSON-RPC error object
 * @param {boolean} override - Use RPC_ERRORS message in place of provider message
 */
function sanitizeRPCError (error, override) {
  if (error.message && !override) { return error }
  const message = error.code > -31099 && error.code < -32100 ? RPC_ERRORS.internal : RPC_ERRORS[error.code]
  error.message = message || RPC_ERRORS.unknown
}

/**
 * json-rpc-engine middleware that both logs standard and non-standard error
 * messages and ends middleware stack traversal if an error is encountered
 *
 * @param {MiddlewareConfig} [config={override:true}] - Middleware configuration
 * @returns {Function} json-rpc-engine middleware function
 */
function createErrorMiddleware ({ override = true } = {}) {
  return (req, res, next) => {
    next(done => {
      const { error } = res
      if (!error) { return done() }
      sanitizeRPCError(error)
      log.error(`LinkToken - RPC Error: ${error.message}`, error)
      done()
    })
  }
}


util.inherits(LinkTokenLkpageProvider, SafeEventEmitter)

function LinkTokenLkpageProvider (connectionStream) {
  const self = this
  self.selectedAddress = undefined
  self.networkVersion = undefined

  // super constructor
  SafeEventEmitter.call(self)

  // setup connectionStream multiplexing
  const mux = self.mux = new ObjectMultiplex()
  pump(
    connectionStream,
    mux,
    connectionStream,
    logStreamDisconnectWarning.bind(this, 'LinkToken')
  )

  // subscribe to metamask public config (one-way)
  self.publicConfigStore = new LocalStorageStore({ storageKey: 'LinkToken-Config' })

  // Emit events for some state changes
  self.publicConfigStore.subscribe(function (state) {

    // Emit accountsChanged event on account change
    if ('selectedAddress' in state && state.selectedAddress !== self.selectedAddress) {
      self.selectedAddress = state.selectedAddress
      self.emit('accountsChanged', [self.selectedAddress])
    }

    // Emit networkChanged event on network change
    if ('networkVersion' in state && state.networkVersion !== self.networkVersion) {
      self.networkVersion = state.networkVersion
      self.emit('networkChanged', state.networkVersion)
    }
  })

  pump(
    mux.createStream('publicConfig'),
    asStream(self.publicConfigStore),
    logStreamDisconnectWarning.bind(this, 'LinkToken PublicConfigStore')
  )

  // ignore phishing warning message (handled elsewhere)
  mux.ignoreStream('phishing')

  // connect to async provider
  const jsonRpcConnection = createJsonRpcStream()
  pump(
    jsonRpcConnection.stream,
    mux.createStream('provider'),
    jsonRpcConnection.stream,
    logStreamDisconnectWarning.bind(this, 'LinkToken RpcProvider')
  )

  // handle sendAsync requests via dapp-side rpc engine
  const rpcEngine = new RpcEngine()
  rpcEngine.push(createIdRemapMiddleware())
  rpcEngine.push(createErrorMiddleware())
  rpcEngine.push(jsonRpcConnection.middleware)
  self.rpcEngine = rpcEngine

  // forward json rpc notifications
  jsonRpcConnection.events.on('notification', function(payload) {
    self.emit('data', null, payload)
  })

  // Work around for https://github.com/metamask/metamask-extension/issues/5459
  // drizzle accidently breaking the `this` reference
  self.send = self.send.bind(self)
  self.sendAsync = self.sendAsync.bind(self)
}

// Web3 1.0 provider uses `send` with a callback for async queries
LinkTokenLkpageProvider.prototype.send = function (payload, callback) {
  const self = this

  if (callback) {
    self.sendAsync(payload, callback)
  } else {
    return self._sendSync(payload)
  }
}

// handle sendAsync requests via asyncProvider
// also remap ids inbound and outbound
LinkTokenLkpageProvider.prototype.sendAsync = function (payload, cb) {
  const self = this

  if (payload.method === 'eth_signTypedData') {
    console.warn('LinkToken: This experimental version of eth_signTypedData will be deprecated in the next release in favor of the standard as defined in EIP-712. See https://git.io/fNzPl for more information on the new standard.')
  }

  self.rpcEngine.handle(payload, cb)
}

LinkTokenLkpageProvider.prototype._sendSync = function (payload) {
  const self = this

  let selectedAddress
  let result = null
  switch (payload.method) {

    case 'eth_accounts':
      // read from localStorage
      selectedAddress = self.publicConfigStore.getState().selectedAddress
      result = selectedAddress ? [selectedAddress] : []
      break

    case 'eth_coinbase':
      // read from localStorage
      selectedAddress = self.publicConfigStore.getState().selectedAddress
      result = selectedAddress || null
      break

    case 'eth_uninstallFilter':
      self.sendAsync(payload, noop)
      result = true
      break

    case 'net_version':
      const networkVersion = self.publicConfigStore.getState().networkVersion
      result = networkVersion || null
      break

    // throw not-supported Error
    default:
      var link = 'https://github.com/MetaMask/faq/blob/master/DEVELOPERS.md#dizzy-all-async---think-of-metamask-as-a-light-client'
      var message = `The LinkToken Web3 object does not support synchronous methods like ${payload.method} without a callback parameter. See ${link} for details.`
      throw new Error(message)

  }

  // return the result
  return {
    id: payload.id,
    jsonrpc: payload.jsonrpc,
    result: result,
  }
}

LinkTokenLkpageProvider.prototype.isConnected = function () {
  return true
}

LinkTokenLkpageProvider.prototype.isLinkToken = true

// util

function logStreamDisconnectWarning (remoteLabel, err) {
  let warningMsg = `LinkTokenLkpageProvider - lost connection to ${remoteLabel}`
  if (err) warningMsg += '\n' + err.stack
  console.warn(warningMsg)
  const listeners = this.listenerCount('error')
  if (listeners > 0) {
    this.emit('error', warningMsg)
  }
}

function noop () {}