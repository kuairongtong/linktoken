module.exports = setupDappAutoReload

function setupDappAutoReload (linktoken, observable) {
  // export linktoken as a global, checking for usage
  let reloadInProgress = false
  let lastTimeUsed
  let lastSeenNetwork
  let refreshit

  global.linktoken = new Proxy(linktoken, {
    get: (_linktoken, key) => {
      // get the time of use
      lastTimeUsed = Date.now()
      // return value normally
      return _linktoken[key]
    },
    set: (_linktoken, key, value) => {
      // set value normally
      _linktoken[key] = value
    },
  })

  observable.subscribe(function (state) {
    clearTimeout(refreshit)
    // if reload in progress, no need to check reload logic
    if (reloadInProgress) return

    const currentNetwork = state.networkVersion

    // set the initial network
    if (!lastSeenNetwork) {
      lastSeenNetwork = currentNetwork
      return
    }

    // skip reload logic if web3 not used
    if (!lastTimeUsed) return

    // if network did not change, exit
    if (currentNetwork === lastSeenNetwork) return

    // initiate page reload
    reloadInProgress = true
    const timeSinceUse = Date.now() - lastTimeUsed
    // if web3 was recently used then delay the reloading of the page
    if (timeSinceUse > 500) {
      lkTriggerReset()
    } else {
      refreshit = setTimeout(lkTriggerReset, 500)
    }
  })
}

// reload the page
function lkTriggerReset () {
  global.location.reload()
}
