const {
  assetUrl,
  serviceUrl
} = __non_webpack_require__('/lib/xp/portal')

const {
  render
} = __non_webpack_require__('/lib/thymeleaf')
const {
  renderError
} = __non_webpack_require__('/lib/error/error')
const React4xp = __non_webpack_require__('/lib/enonic/react4xp')
const {
  getUser
} = __non_webpack_require__('/lib/xp/auth')
const {
  getToolUrl
} = __non_webpack_require__('/lib/xp/admin')

const view = resolve('./dashboard.html')
const DEFAULT_CONTENTSTUDIO_URL = getToolUrl('com.enonic.app.contentstudio', 'main')
const DEFAULT_TOOLBOX_URL = getToolUrl('systems.rcd.enonic.datatoolbox', 'data-toolbox')
const INTERNAL_BASE_URL = app.config && app.config['ssb.internal.baseUrl'] ? app.config['ssb.internal.baseUrl'] : 'https://i.ssb.no/'
const INTERNAL_STATBANK_URL = app.config && app.config['ssb.statbankintern.baseUrl'] ? app.config['ssb.statbankintern.baseUrl'] :
  'https://i.ssb.no/pxwebi/pxweb/no/prod_24v_intern/'

exports.get = function(req) {
  try {
    return renderPart(req)
  } catch (e) {
    return renderError(req, 'Error in part', e)
  }
}

/**
 * @param {object} req
 * @return {{pageContributions: *, body: *}}
 */
function renderPart(req) {
  const assets = getAssets()
  const user = getUser()

  const dashboardDataset = new React4xp('Dashboard/Dashboard')
    .setProps({
      user,
      contentStudioBaseUrl: `${DEFAULT_CONTENTSTUDIO_URL}#/default/edit/`,
      dataToolBoxBaseUrl: `${DEFAULT_TOOLBOX_URL}#nodes?repo=no.ssb.eventlog&branch=master&path=%2Fqueries%2F`,
      internalBaseUrl: `${INTERNAL_BASE_URL}`,
      internalStatbankUrl: `${INTERNAL_STATBANK_URL}`
    })
    .setId('dashboard')

  const pageContributions = parseContributions(dashboardDataset.renderPageContributions({
    clientRender: true
  }))

  const model = {
    ...assets,
    pageContributions
  }

  let body = render(view, model)

  body = dashboardDataset.renderBody({
    body,
    clientRender: true
  })

  return {
    body,
    pageContributions
  }
}

/**
 *
 * @return {{dashboardService: *, stylesUrl: *, jsLibsUrl: *, logoUrl: *}}
 */
function getAssets() {
  return {
    jsLibsUrl: assetUrl({
      path: 'js/bundle.js'
    }),
    stylesUrl: assetUrl({
      path: 'styles/bundle.css'
    }),
    logoUrl: assetUrl({
      path: 'SSB_logo_black.svg'
    }),
    wsServiceUrl: serviceUrl({
      service: 'websocket'
    })
  }
}

function parseContributions(contributions) {
  contributions.bodyEnd = contributions.bodyEnd.map((script) => script.replace(' defer>', ' defer="">'))
  return contributions
}
