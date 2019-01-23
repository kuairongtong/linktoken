import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import classnames from 'classnames'
import { GWEI } from '../../constants/common'

export default class CurrencyDisplay extends PureComponent {
  static propTypes = {
    className: PropTypes.string,
    displayValue: PropTypes.string,
    prefix: PropTypes.string,
    prefixComponent: PropTypes.node,
    style: PropTypes.object,
    suffix: PropTypes.string,
    // Used in container
    currency: PropTypes.string,
    denomination: PropTypes.oneOf([GWEI]),
    value: PropTypes.string,
    numberOfDecimals: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    hideLabel: PropTypes.bool,
  }

  static contextTypes = {
    t: PropTypes.func,
  }

  render () {

    const { t } = this.context
    const { className, displayValue, prefix, prefixComponent, style, suffix } = this.props
    const text = `${prefix || ''}${displayValue}`
    const title = `${text} ${suffix}`
    const localeSuffix = suffix == 'LINKTOKEN' && t('linktoken') || suffix

    return (
      <div
        className={classnames('currency-display-component', className)}
        style={style}
        title={title}
      >
        { prefixComponent}
        <span className="currency-display-component__text">{ text }</span>
        {
          suffix && (
            <span className="currency-display-component__suffix">
              { localeSuffix }
            </span>
          )
        }
      </div>
    )
  }
}
