const {
  getComponent,
  imageUrl
} = __non_webpack_require__('/lib/xp/portal')
const {
  renderError
} = __non_webpack_require__('/lib/error/error')
const {
  render
} = __non_webpack_require__('/lib/thymeleaf')
const React4xp = require('/lib/enonic/react4xp')
const {
  data
} = __non_webpack_require__( '/lib/util')

const view = resolve('./externalCard.html')


exports.get = function(req) {
  try {
    return renderPart(req)
  } catch (e) {
    return renderError(req, 'Error in part: ', e)
  }
}

exports.preview = (req) => renderPart(req)

const NO_LINKS_FOUND = {
  body: '',
  contentType: 'text/html'
}

const renderPart = (req) => {
  const part = getComponent()

  return renderExternalCard(part.config.externalCards ? data.forceArray(part.config.externalCards) : [])
}

const renderExternalCard = (links) => {
  if (links && links.length) {
    const externalCardComponent = new React4xp('ExternalCards')
      .setProps({
        links: links.map((link) => {
          return {
            href: link.linkUrl,
            children: link.linkText,
            content: link.content,
            image: imageUrl({
              id: link.image,
              scale: 'height(70)'
            })
          }
        })
      })
      .setId('externalCard')
      .uniqueId()

    const body = render(view, {
      categoryId: externalCardComponent.react4xpId
    })

    return {
      body: externalCardComponent.renderBody({
        body,
        clientRender: true
      }),
      pageContributions: externalCardComponent.renderPageContributions({
        clientRender: true
      })
    }
  }
  return NO_LINKS_FOUND
}
