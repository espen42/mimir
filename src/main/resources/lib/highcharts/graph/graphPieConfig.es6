const {
  mergeDeepRight
} = require('ramda')

const {
  createDefaultConfig
} = __non_webpack_require__('/lib/highcharts/graph/config')

export function pieConfig(highchartsContent, options) {
  const defaultConfig = createDefaultConfig(highchartsContent.data, highchartsContent.displayName)
  const customConfig = {
    chart: {
      type: 'pie'
    },
    yAxis: {
      stackLabels: {
        enabled: false,
        x: 0,
        y: 0
      }
    }
  }
  return mergeDeepRight(defaultConfig, customConfig)
}
