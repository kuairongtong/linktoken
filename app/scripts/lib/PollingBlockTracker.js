const SafeEventEmitter = require('safe-event-emitter')
const EventEmitter = require('events')

const sec = 1000
const min = 60 * sec

const calculateSum = (accumulator, currentValue) => accumulator + currentValue
const blockTrackerEvents = ['sync', 'latest']


function timeout (duration, unref) {
  return new Promise(resolve => {
    const timoutRef = setTimeout(resolve, duration)
    // don't keep process open
    if (timoutRef.unref && unref) {
      timoutRef.unref()
    }
  })
}

class BaseBlockTracker extends SafeEventEmitter {

  constructor(opts = {}) {
    super()
    // config
    this._blockResetDuration = opts.blockResetDuration || 20 * sec
    // state
    this._blockResetTimeout
    this._currentBlock = null
    this._isRunning = false
    // bind functions for internal use
    this._onNewListener = this._onNewListener.bind(this)
    this._onRemoveListener = this._onRemoveListener.bind(this)
    this._resetCurrentBlock = this._resetCurrentBlock.bind(this)
    // listen for handler changes
    this._setupInternalEvents()
  }

  isRunning() {
    return this._isRunning
  }

  getCurrentBlock () {
    return this._currentBlock
  }

  async getLatestBlock () {
    // return if available
    if (this._currentBlock) return this._currentBlock
    // wait for a new latest block
    const latestBlock = await new Promise(resolve => this.once('latest', resolve))
    // return newly set current block
    return latestBlock
  }

  // dont allow module consumer to remove our internal event listeners
  removeAllListeners(eventName) {
    // perform default behavior, preserve fn arity
    if (eventName) {
      super.removeAllListeners(eventName)
    } else {
      super.removeAllListeners()
    }
    // re-add internal events
    this._setupInternalEvents()
    // trigger stop check just in case
    this._onRemoveListener()
  }

  //
  // to be implemented in subclass
  //

  _start () {
    // default behavior is noop
  }

  _end () {
    // default behavior is noop
  }

  //
  // private
  //

  _setupInternalEvents () {
    // first remove listeners for idempotence
    this.removeListener('newListener', this._onNewListener)
    this.removeListener('removeListener', this._onRemoveListener)
    // then add them
    this.on('newListener', this._onNewListener)
    this.on('removeListener', this._onRemoveListener)
  }

  _onNewListener (eventName, handler) {
    // `newListener` is called *before* the listener is added
    if (!blockTrackerEvents.includes(eventName)) return
    this._maybeStart()
  }

  _onRemoveListener (eventName, handler) {
    // `removeListener` is called *after* the listener is removed
    if (this._getBlockTrackerEventCount() > 0) return
    this._maybeEnd()
  }

  _maybeStart () {
    if (this._isRunning) return
    this._isRunning = true
    // cancel setting latest block to stale
    this._cancelBlockResetTimeout()
    this._start()
  }

  _maybeEnd () {
    if (!this._isRunning) return
    this._isRunning = false
    this._setupBlockResetTimeout()
    this._end()
  }

  _getBlockTrackerEventCount () {
    return blockTrackerEvents
      .map(eventName => this.listenerCount(eventName))
      .reduce(calculateSum)
  }

  _newPotentialLatest (newBlock) {
    const currentBlock = this._currentBlock
    // only update if blok number is higher
    if (currentBlock && (newBlock <= currentBlock)) return
    this._setCurrentBlock(newBlock)
  }

  _setCurrentBlock (newBlock) {
    const oldBlock = this._currentBlock
    this._currentBlock = newBlock
    this.emit('latest', newBlock)
    this.emit('sync', { oldBlock, newBlock })
  }

  _setupBlockResetTimeout() {
    // clear any existing timeout
    this._cancelBlockResetTimeout()
    // clear latest block when stale
    this._blockResetTimeout = setTimeout(this._resetCurrentBlock, this._blockResetDuration)
    // nodejs - dont hold process open
    if (this._blockResetTimeout.unref) {
      this._blockResetTimeout.unref()
    }
  }

  _cancelBlockResetTimeout() {
    clearTimeout(this._blockResetTimeout)
  }

  _resetCurrentBlock  () {
    this._currentBlock = null
  }

}



class PollingBlockTracker extends BaseBlockTracker {

  constructor(opts = {}) {
    // parse + validate args
    if (!opts.provider) throw new Error('PollingBlockTracker - no provider specified.')
    const pollingInterval = opts.pollingInterval || 10 * sec
    const retryTimeout = opts.retryTimeout || pollingInterval / 10
    const keepEventLoopActive = opts.keepEventLoopActive !== undefined ? opts.keepEventLoopActive : true
    // BaseBlockTracker constructor
    super(Object.assign({
      blockResetDuration: pollingInterval,
    }, opts))
    // config
    this._provider = opts.provider
    this._pollingInterval = pollingInterval
    this._retryTimeout = retryTimeout
    this._keepEventLoopActive = keepEventLoopActive
  }

  //
  // public
  //

  // trigger block polling
  async checkForLatestBlock() {
    await this._updateLatestBlock()
    return await this.getLatestBlock()
  }

  //
  // private
  //

  _start() {
    this._performSync().catch(err => this.emit('error', err))
  }

  async _performSync () {
    while (this._isRunning) {
      try {
        await this._updateLatestBlock()
        await timeout(this._pollingInterval, !this._keepEventLoopActive)
      } catch (err) {
        const newErr = new Error(`PollingBlockTracker - encountered an error while attempting to update latest block:\n${err.stack}`)
        try {
          this.emit('error', newErr)
        } catch (emitErr) {
          console.error(newErr)
        }
        await timeout(this._retryTimeout, !this._keepEventLoopActive)
      }
    }
  }

  async _updateLatestBlock () {
    // fetch + set latest block
    const latestBlock = parseInt(+ (new Date()/1000))
    this._newPotentialLatest(latestBlock)
  }

}

module.exports = PollingBlockTracker


