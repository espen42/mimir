const {
  data: {
    forceArray
  }
} = __non_webpack_require__( '/lib/util')
const {
  concat
} = require('ramda')
const {
  get
} = __non_webpack_require__( '/lib/xp/content')
const {
  getContent
} = __non_webpack_require__('/lib/xp/portal')
const {
  getPhrases
} = __non_webpack_require__( '/lib/language')
const {
  render
} = __non_webpack_require__('/lib/thymeleaf')
const {
  renderError
} = __non_webpack_require__('/lib/error/error')

const moment = require('moment/min/moment-with-locales')
const tableController = __non_webpack_require__('../table/table')
const React4xp = __non_webpack_require__('/lib/enonic/react4xp')
const view = resolve('./statisticsAttachmentsAccordions.html')

exports.get = function(req) {
  try {
    return renderPart(req)
  } catch (e) {
    return renderError(req, 'Error in part', e)
  }
}

exports.preview = (req) => renderPart(req)

const renderPart = (req) => {
  const page = getContent()

  moment.locale(page.language ? page.language : 'nb')
  const phrases = getPhrases(page)

  const title = phrases.statisticsAttachmentsAccordion

  const attachmentTables = page.data.attachmentTables ? forceArray(page.data.attachmentTables) : []
  if (!attachmentTables) {
    if (req.mode === 'edit' && page.type !== `${app.name}:statistics`) {
      return {
        body: render(view, {
          label: title
        })
      }
    } else {
      return {
        body: null
      }
    }
  }

  const attachmentTable = getAttachmentTable(attachmentTables, req, phrases.tableSubHeader)
  const accordionComponent = new React4xp('site/parts/accordion/accordion')
    .setProps({
      accordions: attachmentTable.map(({
        id, open, subHeader, body, items
      }) => {
        return {
          id,
          open,
          subHeader,
          body,
          items
        }
      })
    })
    .uniqueId()

  const tablesPageContributions = attachmentTable.map(({
    pageContributions
  }) => {
    return {
      pageContributions
    }
  })

  const isOutsideContentStudio = (
    req.mode === 'live' || req.mode === 'preview'
  )

  const accordionBody = accordionComponent.renderBody({
    body: render(view, {
      title,
      accordionId: accordionComponent.react4xpId
    }),
    clientRender: isOutsideContentStudio
  })
  const accordionPageContributions = accordionComponent.renderPageContributions({
    clientRender: isOutsideContentStudio
  })

  //const pageContributions = getPageContributions(accordionPageContributions, tablesPageContributions)
  const pageContributions = {
    bodyEnd: concat(accordionPageContributions.bodyEnd, tablesPageContributions[0].pageContributions.bodyEnd)
  }

  return {
    body: accordionBody,
    pageContributions,
    contentType: 'text/html'
  }
}

const getAttachmentTable = (attachmentTable, req, tableSubHeader) => {
  if (attachmentTable.length > 0) {
    return attachmentTable.map((attachmentTableId, index) => {
      const attachmentTableContent = get({
        key: attachmentTableId
      })

      const tablePreview = tableController.preview(req, attachmentTableId)

      return {
        id: `attachment-table-${index + 1}`,
        open: attachmentTableContent.displayName,
        subHeader: tableSubHeader,
        body: tablePreview.body,
        items: [],
        pageContributions: tablePreview.pageContributions
      }
    })
  }
  return
}

const getPageContributions = (accordionPageContributions, tablesPageContributions) => {
  let pageContributions
  if (tablesPageContributions.length > 0) {
    pageContributions = {
      bodyEnd: concat(accordionPageContributions.bodyEnd, tablesPageContributions.map((tablePageContributions) => {
        return tablePageContributions.pageContributions.bodyEnd
      }))
    }
    return pageContributions
  }
  return accordionPageContributions
}
