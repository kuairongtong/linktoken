const ObservableStore = require('obs-store')

/**
 * A controller that services user-approved requests for a full LinkToken provider API
 */
class ProviderApprovalController {
  /**
   * Determines if caching is enabled
   */
  caching = true

  /**
   * Creates a ProviderApprovalController
   *
   * @param {Object} [config] - Options to configure controller
   */
  constructor ({ closePopup, keyringController, openPopup, platform, preferencesController, publicConfigStore } = {}) {
    this.approvedOrigins = {}
    this.closePopup = closePopup
    this.keyringController = keyringController
    this.openPopup = openPopup
    this.platform = platform
    this.preferencesController = preferencesController
    this.publicConfigStore = publicConfigStore
    this.store = new ObservableStore({
      providerRequests: [],
    })

    if (platform && platform.addMessageListener) {
      platform.addMessageListener(({ action = '', force, origin, siteTitle, siteImage }) => {
        switch (action) {
          case 'lk-init-provider-request':
            this._handleProviderRequest(origin, siteTitle, siteImage, force)
            break
          case 'lk-init-is-approved':
            this._handleIsApproved(origin)
            break
          case 'lk-init-is-unlocked':
            this._handleIsUnlocked()
            break
          case 'lk-init-privacy-request':
            this._handlePrivacyRequest()
            break
        }
      })
    }
  }

  /**
   * Called when a tab requests access to a full LinkToken provider API
   *
   * @param {string} origin - Origin of the window requesting full provider access
   * @param {string} siteTitle - The title of the document requesting full provider access
   * @param {string} siteImage - The icon of the window requesting full provider access
   */
  _handleProviderRequest (origin, siteTitle, siteImage, force) {
    this.store.updateState({ providerRequests: [{ origin, siteTitle, siteImage }] })
    const isUnlocked = this.keyringController.memStore.getState().isUnlocked
    if (!force && this.approvedOrigins[origin] && this.caching && isUnlocked) {
      this.approveProviderRequest(origin)
      return
    }
    this.openPopup && this.openPopup()
  }

  /**
   * Called by a tab to determine if an origin has been approved in the past
   *
   * @param {string} origin - Origin of the window
   */
  _handleIsApproved (origin) {
    this.platform && this.platform.sendMessage({
      action: 'lkanswer-is-approved',
      isApproved: this.approvedOrigins[origin] && this.caching,
      caching: this.caching,
    }, { active: true })
  }

  /**
   * Called by a tab to determine if Linker is currently locked or unlocked
   */
  _handleIsUnlocked () {
    const isUnlocked = this.keyringController.memStore.getState().isUnlocked
    this.platform && this.platform.sendMessage({ action: 'lkanswer-is-unlocked', isUnlocked }, { active: true })
  }

  /**
   * Called to check privacy mode; if privacy mode is off, this will automatically enable the provider (legacy behavior)
   */
  _handlePrivacyRequest () {
      this.publicConfigStore.emit('update', this.publicConfigStore.getState())
  }

  /**
   * Called when a user approves access to a full LinkToken provider API
   *
   * @param {string} origin - Origin of the target window to approve provider access
   */
  approveProviderRequest (origin) {
    this.closePopup && this.closePopup()
    const requests = this.store.getState().providerRequests
    this.platform && this.platform.sendMessage({
      action: 'lk-approve-provider-request',
      selectedAddress: this.publicConfigStore.getState().selectedAddress,
    }, { active: true })
    this.publicConfigStore.emit('update', this.publicConfigStore.getState())
    const providerRequests = requests.filter(request => request.origin !== origin)
    this.store.updateState({ providerRequests })
    this.approvedOrigins[origin] = true
  }

  /**
   * Called when a tab rejects access to a full LinkToken provider API
   *
   * @param {string} origin - Origin of the target window to reject provider access
   */
  rejectProviderRequest (origin) {
    this.closePopup && this.closePopup()
    const requests = this.store.getState().providerRequests
    this.platform && this.platform.sendMessage({ action: 'lk-reject-provider-request' }, { active: true })
    const providerRequests = requests.filter(request => request.origin !== origin)
    this.store.updateState({ providerRequests })
    delete this.approvedOrigins[origin]
  }

  /**
   * Clears any cached approvals for user-approved origins
   */
  clearApprovedOrigins () {
    this.approvedOrigins = {}
  }

  /**
   * Determines if a given origin should have accounts exposed
   *
   * @param {string} origin - Domain origin to check for approval status
   * @returns {boolean} - True if the origin has been approved
   */
  shouldExposeAccounts (origin) {
    return this.approvedOrigins[origin]
  }

  /**
   * Tells all tabs that Linker is now locked. This is primarily used to set
   * internal flags in the contentscript and inpage script.
   */
  setLocked () {
    this.platform && this.platform.sendMessage({ action: 'linktoken-set-locked' })
  }
}

module.exports = ProviderApprovalController
