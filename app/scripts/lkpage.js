/*global Web3*/
lkCleanContextForImports()
require('./lib/linktoken.min.js')
const lklog = require('loglevel')
const LkLocalMessageDuplexStream = require('./lib/post-message-stream')
const lkSetupDappAutoReload = require('./lib/auto-reload.js')
const LkLinkTokenLkpageProvider = require('./lib/metamask-inpage-provider')

let lkIsEnabled = false
let lkWarned = false
let lkProviderHandle
let lkIsApprovedHandle
let lkIsUnlockedHandle

lkRestoreContextAfterImports()

lklog.setDefaultLevel(process.env.METAMASK_DEBUG ? 'debug' : 'warn')

/**
 * Adds a postMessage listener for a specific message type
 *
 * @param {string} messageType - postMessage type to listen for
 * @param {Function} handler - event handler
 * @param {boolean} remove - removes this handler after being triggered
 */
function lkOnMessage (messageType, handler, remove) {
  window.addEventListener('message', function ({ data }) {
    if (!data || data.type !== messageType) { return }
    remove && window.removeEventListener('message', handler)
    handler.apply(window, arguments)
  })
}

//
// setup plugin communication
//

// setup background connection
var linkTokenStream = new LkLocalMessageDuplexStream({
  name: 'lkpage',
  target: 'lkcontentscript',
  origin:'linktoken',
})

// compose the inpage provider
var lkInpageProvider = new LkLinkTokenLkpageProvider(linkTokenStream)

// set a high max listener count to avoid unnecesary warnings
lkInpageProvider.setMaxListeners(100)

// set up a listener for when MetaMask is locked
lkOnMessage('linktokensetlocked', () => { lkIsEnabled = false })

// set up a listener for privacy mode responses
lkOnMessage('lkethereumproviderlegacy', ({ data: { selectedAddress } }) => {
  lkIsEnabled = true
  setTimeout(() => {
    lkInpageProvider.publicConfigStore.updateState({ selectedAddress })
  }, 0)
}, true)

// augment the provider with its enable method
lkInpageProvider.enable = function ({ force } = {}) {
  return new Promise((resolve, reject) => {
    lkProviderHandle = ({ data: { error, selectedAddress } }) => {
      if (typeof error !== 'undefined') {
        reject(error)
      } else {
        window.removeEventListener('message', lkProviderHandle)
        setTimeout(() => {
          lkInpageProvider.publicConfigStore.updateState({ selectedAddress })
        }, 0)

        // wait for the background to update with an account
        lkInpageProvider.sendAsync({ method: 'eth_accounts', params: [] }, (error, response) => {
          if (error) {
            reject(error)
          } else {
            lkIsEnabled = true
            resolve(response.result)
          }
        })
      }
    }
    lkOnMessage('lkethereumprovider', lkProviderHandle, true)
    window.postMessage({ type: 'LK_ETHEREUM_ENABLE_PROVIDER', force }, '*')
  })
}

// add metamask-specific convenience methods
lkInpageProvider._metamask = new Proxy({
  /**
   * Determines if this domain is currently enabled
   *
   * @returns {boolean} - true if this domain is currently enabled
   */
  isEnabled: function () {
    return lkIsEnabled
  },

  /**
   * Determines if this domain has been previously approved
   *
   * @returns {Promise<boolean>} - Promise resolving to true if this domain has been previously approved
   */
  isApproved: function () {
    return new Promise((resolve) => {
      lkIsApprovedHandle = ({ data: { caching, isApproved } }) => {
        if (caching) {
          resolve(!!isApproved)
        } else {
          resolve(false)
        }
      }
      lkOnMessage('linktokenisapproved', lkIsApprovedHandle, true)
      window.postMessage({ type: 'LINKTOKEN_IS_APPROVED' }, '*')
    })
  },

  /**
   * Determines if MetaMask is unlocked by the user
   *
   * @returns {Promise<boolean>} - Promise resolving to true if MetaMask is currently unlocked
   */
  isUnlocked: function () {
    return new Promise((resolve) => {
      lkIsUnlockedHandle = ({ data: { isUnlocked } }) => {
        resolve(!!isUnlocked)
      }
      lkOnMessage('linktokenisunlocked', lkIsUnlockedHandle, true)
      window.postMessage({ type: 'LINKTOKEN_IS_UNLOCKED' }, '*')
    })
  },
}, {
  get: function (obj, prop) {
    !lkWarned && console.warn('Heads up! ethereum._metamask exposes methods that have ' +
    'not been standardized yet. This means that these methods may not be implemented ' +
    'in other dapp browsers and may be removed from Linker in the future.')
    lkWarned = true
    return obj[prop]
  },
})

// Work around for web3@1.0 deleting the bound `sendAsync` but not the unbound
// `sendAsync` method on the prototype, causing `this` reference issues with drizzle
const lkProxiedInpageProvider = new Proxy(lkInpageProvider, {
  // straight up lie that we deleted the property so that it doesnt
  // throw an error in strict mode
  deleteProperty: () => true,
})

window.linkTokenEthereum = lkProxiedInpageProvider

// detect eth_requestAccounts and pipe to enable for now
function lkDetectAccountRequest (method) {
  const originalMethod = lkInpageProvider[method]
  lkInpageProvider[method] = function ({ method }) {
    if (method === 'eth_requestAccounts') {
      return window.linkTokenEthereum.enable()
    }
    return originalMethod.apply(this, arguments)
  }
}
lkDetectAccountRequest('send')
lkDetectAccountRequest('sendAsync')

//
// setup linktoken
//
if (typeof window.linktoken !== 'undefined') {
  throw new Error(`Linker detected another LinkToken.
     Linker will not work reliably with another LinkToken extension.
     This usually happens if you have two Linker installed,
     or Linker and another LinkToken extension. Please remove one
     and try again.`)
}

var linktoken = new LinkToken(lkProxiedInpageProvider)
linktoken.setProvider = function () {
  lklog.debug('Linker - overrode linktoken.setProvider')
}
lklog.debug('Linker - injected linktoken')

lkSetupDappAutoReload(linktoken, lkInpageProvider.publicConfigStore)


// set linktoken defaultAccount
lkInpageProvider.publicConfigStore.subscribe(function (state) {
  linktoken.eth.defaultAccount = state.selectedAddress
})

// need to make sure we aren't affected by overlapping namespaces
// and that we dont affect the app with our namespace
// mostly a fix for linktoken's BigNumber if AMD's "define" is defined...
var __lkDefine

/**
 * Caches reference to global define object and deletes it to
 * avoid conflicts with other global define objects, such as
 * AMD's define function
 */
function lkCleanContextForImports () {
  __lkDefine = global.define
  try {
    global.define = undefined
  } catch (_) {
    console.warn('Linker - global.define could not be deleted.')
  }
}

/**
 * Restores global define object from cached reference
 */
function lkRestoreContextAfterImports () {
  try {
    global.define = __lkDefine
  } catch (_) {
    console.warn('Linker - global.define could not be overwritten.')
  }
}
