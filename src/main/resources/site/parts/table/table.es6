const React4xp = __non_webpack_require__('/lib/enonic/react4xp')
const {
  getContent, pageUrl, assetUrl
} = __non_webpack_require__('/lib/xp/portal')
const {
  render
} = __non_webpack_require__('/lib/thymeleaf')
const {
  renderError
} = __non_webpack_require__('/lib/error/error')
const {
  parseTable
} = __non_webpack_require__( '/lib/ssb/table')
const {
  getSources
} = __non_webpack_require__( '/lib/ssb/utils')
const {
  data: {
    forceArray
  }
} = __non_webpack_require__( '/lib/util')
const {
  get
} = __non_webpack_require__( '/lib/xp/content')
const {
  getLanguage
} = __non_webpack_require__( '/lib/language')
const {
  DATASET_BRANCH,
  UNPUBLISHED_DATASET_BRANCH
} = __non_webpack_require__('/lib/repo/dataset')
const {
  hasWritePermissions
} = __non_webpack_require__('/lib/ssb/permissions')

const moment = require('moment/min/moment-with-locales')
const view = resolve('./table.html')

exports.get = function(req) {
  try {
    const tableId = getContent().data.mainTable
    return renderPart(req, tableId)
  } catch (e) {
    return renderError(req, 'Error in part', e)
  }
}

exports.preview = (req, id) => {
  return renderPart(req, [id])
}

function renderPart(req, tableId) {
  const page = getContent()
  const language = getLanguage(page)
  const phrases = language.phrases

  if (!tableId) {
    if (req.mode === 'edit' && page.type !== `${app.name}:statistics`) {
      return {
        body: render(view, {
          label: phrases.table
        })
      }
    } else {
      return {
        body: null
      }
    }
  }

  const tableContent = get({
    key: tableId
  })

  const showPreviewDraft = hasWritePermissions(req, tableId)
  const table = parseTable(req, tableContent, DATASET_BRANCH)
  let tableDraft = undefined
  if (showPreviewDraft) {
    tableDraft = parseTable(req, tableContent, UNPUBLISHED_DATASET_BRANCH)
  }
  const draftExist = tableDraft && tableDraft.thead.length > 0
  const pageTypeStatistic = page.type === `${app.name}:statistics`

  moment.locale(tableContent.language ? tableContent.language : 'nb')

  // sources
  const sourceConfig = tableContent.data.sources ? forceArray(tableContent.data.sources) : []
  const sourceLabel = phrases.source
  const sourceTableLabel = phrases.statbankTableSource
  const sources = getSources(sourceConfig)
  const iconUrl = assetUrl({
    path: 'swipe-icon.svg'
  })

  const standardSymbol = getStandardSymbolPage(language.standardSymbolPage, phrases.tableStandardSymbols)
  const baseUrl = app.config && app.config['ssb.baseUrl'] ? app.config['ssb.baseUrl'] : 'https://www.ssb.no'
  const statBankWebUrl = tableContent.language === 'en' ? baseUrl + '/en/statbank' : baseUrl + '/statbank'
  const sourceList = table.sourceList ? forceArray(table.sourceList) : []
  const sourceListExternal = sourceList.length > 0 ? sourceList.filter((s) => s.tableApproved === 'internet') : []
  const uniqueTableIds = sourceListExternal.length > 0 ? sourceListExternal.map((item) => item.tableId.toString())
    .filter((value, index, self) => self.indexOf(value) === index) : []

  const props = {
    downloadTableLabel: phrases.tableDownloadAs,
    downloadTableTitle: {
      title: phrases.tableDownloadAs
    },
    downloadTableOptions: getDownloadTableOptions(phrases),
    displayName: tableContent.displayName,
    table: {
      caption: table.caption,
      thead: table.thead,
      tbody: table.tbody,
      tfoot: table.tfoot,
      tableClass: table.tableClass,
      language: language.code,
      noteRefs: table.noteRefs
    },
    tableDraft: {
      caption: tableDraft ? tableDraft.caption : undefined,
      thead: tableDraft ? tableDraft.thead : undefined,
      tbody: tableDraft ? tableDraft.tbody : undefined,
      tfoot: tableDraft ? tableDraft.tfoot : undefined,
      noteRefs: tableDraft ? tableDraft.noteRefs : undefined
    },
    standardSymbol: standardSymbol,
    sources,
    sourceLabel,
    iconUrl: iconUrl,
    showPreviewDraft,
    paramShowDraft: req.params.showDraft ? true : false,
    draftExist,
    pageTypeStatistic,
    sourceListTables: uniqueTableIds,
    sourceTableLabel,
    statBankWebUrl
  }

  const tableReact = new React4xp('Table')
    .setProps(props)
    .setId('table')
    .uniqueId()

  const body = render(view, {
    tableId: tableReact.react4xpId
  })

  return {
    body: tableReact.renderBody({
      body,
      clientRender: true
    }),
    pageContributions: tableReact.renderPageContributions({
      clientRender: true
    }),
    contentType: 'text/html'
  }
}

const getDownloadTableOptions = () => {
  const downloadTable = []

  const XLS = {
    title: '.xlsx (Excel)',
    id: 'downloadTableAsXLSX'
  }
  downloadTable.push(XLS)

  const CSV = {
    title: '.CSV',
    id: 'downloadTableAsCSV'
  }
  downloadTable.push(CSV)

  return downloadTable
}

const getStandardSymbolPage = (standardSymbolPage, standardSymbolText) => {
  if (standardSymbolPage) {
    const standardSymbolHref = standardSymbolPage ? pageUrl({
      id: standardSymbolPage
    }) : ''

    return {
      href: standardSymbolHref,
      text: standardSymbolText
    }
  }
  return null
}
