import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import infuraCurrencies from '../../../../infura-conversion.json'
import validUrl from 'valid-url'
import { exportAsFile } from '../../../../util'
import SimpleDropdown from '../../../dropdowns/simple-dropdown'
import ToggleButton from 'react-toggle-button'
import { REVEAL_SEED_ROUTE } from '../../../../routes'
import locales from '../../../../../../app/_locales/index.json'
import TextField from '../../../text-field'
import Button from '../../../button'

const sortedCurrencies = infuraCurrencies.objects.sort((a, b) => {
  return a.quote.name.toLocaleLowerCase().localeCompare(b.quote.name.toLocaleLowerCase())
})

const infuraCurrencyOptions = sortedCurrencies.map(({ quote: { code, name } }) => {
  return {
    displayValue: `${code.toUpperCase()} - ${name}`,
    key: code,
    value: code,
  }
})

const localeOptions = locales.map(locale => {
  return {
    displayValue: `${locale.name}`,
    key: locale.code,
    value: locale.code,
  }
})

export default class SettingsTab extends PureComponent {
  static contextTypes = {
    t: PropTypes.func,
  }

  static propTypes = {
    metamask: PropTypes.object,
    setUseBlockie: PropTypes.func,
    setHexDataFeatureFlag: PropTypes.func,
    setPrivacyMode: PropTypes.func,
    privacyMode: PropTypes.bool,
    setCurrentCurrency: PropTypes.func,
    displayWarning: PropTypes.func,
    revealSeedConfirmation: PropTypes.func,
    setFeatureFlagToBeta: PropTypes.func,
    showClearApprovalModal: PropTypes.func,
    showResetAccountConfirmationModal: PropTypes.func,
    warning: PropTypes.string,
    history: PropTypes.object,
    isMascara: PropTypes.bool,
    updateCurrentLocale: PropTypes.func,
    currentLocale: PropTypes.string,
    useBlockie: PropTypes.bool,
    sendHexData: PropTypes.bool,
    currentCurrency: PropTypes.string,
    conversionDate: PropTypes.number,
    nativeCurrency: PropTypes.string,
    useNativeCurrencyAsPrimaryCurrency: PropTypes.bool,
    setUseNativeCurrencyAsPrimaryCurrencyPreference: PropTypes.func,
  }

  state = {
    newRpc: '',
    chainId: '',
    showOptions: false,
    ticker: '',
    nickname: '',
  }

  renderCurrentConversion () {
    const { t } = this.context
    const { currentCurrency, conversionDate, setCurrentCurrency } = this.props

    return (
      <div className="settings-page__content-row">
        <div className="settings-page__content-item">
          <span>{ t('currentConversion') }</span>
          <span className="settings-page__content-description">
            { t('updatedWithDate', [Date(conversionDate)]) }
          </span>
        </div>
        <div className="settings-page__content-item">
          <div className="settings-page__content-item-col">
            <SimpleDropdown
              placeholder={t('selectCurrency')}
              options={infuraCurrencyOptions}
              selectedOption={currentCurrency}
              onSelect={newCurrency => setCurrentCurrency(newCurrency)}
            />
          </div>
        </div>
      </div>
    )
  }

  renderCurrentLocale () {
    const { t } = this.context
    const { updateCurrentLocale, currentLocale } = this.props
    const currentLocaleMeta = locales.find(locale => locale.code === currentLocale)
    const currentLocaleName = currentLocaleMeta ? currentLocaleMeta.name : ''

    return (
      <div className="settings-page__content-row">
        <div className="settings-page__content-item">
          <span className="settings-page__content-label">
            { t('currentLanguage') }
          </span>
          <span className="settings-page__content-description">
            { currentLocaleName }
          </span>
        </div>
        <div className="settings-page__content-item">
          <div className="settings-page__content-item-col">
            <SimpleDropdown
              placeholder={t('selectLocale')}
              options={localeOptions}
              selectedOption={currentLocale}
              onSelect={async newLocale => updateCurrentLocale(newLocale)}
            />
          </div>
        </div>
      </div>
    )
  }


  renderStateLogs () {
    const { t } = this.context
    const { displayWarning } = this.props

    return (
      <div className="settings-page__content-row">
        <div className="settings-page__content-item">
          <span>{ t('stateLogs') }</span>
          <span className="settings-page__content-description">
            { t('stateLogsDescription') }
          </span>
        </div>
        <div className="settings-page__content-item">
          <div className="settings-page__content-item-col">
            <Button
              type="primary"
              large
              onClick={() => {
                window.logStateString((err, result) => {
                  if (err) {
                    displayWarning(t('stateLogError'))
                  } else {
                    exportAsFile('Linker State Logs.json', result)
                  }
                })
              }}
            >
              { t('downloadStateLogs') }
            </Button>
          </div>
        </div>
      </div>
    )
  }

  renderClearApproval () {
    const { t } = this.context
    const { showClearApprovalModal } = this.props
    return (
      <div className="settings-page__content-row">
        <div className="settings-page__content-item">
          <span>{ t('approvalData') }</span>
          <span className="settings-page__content-description">
            { t('approvalDataDescription') }
          </span>
        </div>
        <div className="settings-page__content-item">
          <div className="settings-page__content-item-col">
            <Button
              type="secondary"
              large
              className="settings-tab__button--orange"
              onClick={event => {
                event.preventDefault()
                showClearApprovalModal()
              }}
            >
              { t('clearApprovalData') }
            </Button>
          </div>
        </div>
      </div>
    )
  }

  renderSeedWords () {
    const { t } = this.context
    const { history } = this.props

    return (
      <div className="settings-page__content-row">
        <div className="settings-page__content-item">
          <span>{ t('revealSeedWords') }</span>
        </div>
        <div className="settings-page__content-item">
          <div className="settings-page__content-item-col">
            <Button
              type="secondary"
              large
              onClick={event => {
                event.preventDefault()
                history.push(REVEAL_SEED_ROUTE)
              }}
            >
              { t('revealSeedWords') }
            </Button>
          </div>
        </div>
      </div>
    )
  }

  renderResetAccount () {
    const { t } = this.context
    const { showResetAccountConfirmationModal } = this.props

    return (
      <div className="settings-page__content-row">
        <div className="settings-page__content-item">
          <span>{ t('resetAccount') }</span>
        </div>
        <div className="settings-page__content-item">
          <div className="settings-page__content-item-col">
            <Button
              type="secondary"
              large
              className="settings-tab__button--orange"
              onClick={event => {
                event.preventDefault()
                showResetAccountConfirmationModal()
              }}
            >
              { t('resetAccount') }
            </Button>
          </div>
        </div>
      </div>
    )
  }




  renderUsePrimaryCurrencyOptions () {
    const { t } = this.context
    const {
      nativeCurrency,
      setUseNativeCurrencyAsPrimaryCurrencyPreference,
      useNativeCurrencyAsPrimaryCurrency,
    } = this.props

    return (
      <div className="settings-page__content-row">
        <div className="settings-page__content-item">
          <span>{ t('primaryCurrencySetting') }</span>
          <div className="settings-page__content-description">
            { t('primaryCurrencySettingDescription') }
          </div>
        </div>
        <div className="settings-page__content-item">
          <div className="settings-page__content-item-col">
            <div className="settings-tab__radio-buttons">
              <div className="settings-tab__radio-button">
                <input
                  type="radio"
                  id="native-primary-currency"
                  onChange={() => setUseNativeCurrencyAsPrimaryCurrencyPreference(true)}
                  checked={Boolean(useNativeCurrencyAsPrimaryCurrency)}
                />
                <label
                  htmlFor="native-primary-currency"
                  className="settings-tab__radio-label"
                >
                  { nativeCurrency }
                </label>
              </div>
              <div className="settings-tab__radio-button">
                <input
                  type="radio"
                  id="fiat-primary-currency"
                  onChange={() => setUseNativeCurrencyAsPrimaryCurrencyPreference(false)}
                  checked={!useNativeCurrencyAsPrimaryCurrency}
                />
                <label
                  htmlFor="fiat-primary-currency"
                  className="settings-tab__radio-label"
                >
                  { t('fiat') }
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }


  render () {
    const { warning, isMascara } = this.props

    return (
      <div className="settings-page__content">
        { warning && <div className="settings-tab__error">{ warning }</div> }
        { this.renderCurrentConversion() }
        { this.renderUsePrimaryCurrencyOptions() }
        { this.renderCurrentLocale() }
        { this.renderStateLogs() }
        { this.renderSeedWords() }
        { this.renderResetAccount() }
        { this.renderClearApproval() }
      </div>
    )
  }
}
