import { HttpLibrary, HttpRequestParams, HttpResponse } from 'enonic-types/http'
const xmlParser: XmlParser = __.newBean('no.ssb.xp.xmlparser.XmlParser')
import { XmlParser } from '../types/xmlParser'
import { RepoQueryLib } from '../repo/query'

const {
  sleep
} = __non_webpack_require__('/lib/xp/task')
const http: HttpLibrary = __non_webpack_require__('/lib/http-client')

const {
  logUserDataQuery,
  Events
}: RepoQueryLib = __non_webpack_require__('/lib/repo/query')

export function get(url: string, queryId?: string): object | null {
  const requestParams: HttpRequestParams = {
    url,
    method: 'POST',
    contentType: 'text/html',
    headers: {
      'Cache-Control': 'no-cache',
      'Accept': 'text/html'
    },
    connectionTimeout: 20000,
    readTimeout: 5000
  }

  if (queryId) {
    logUserDataQuery(queryId, {
      file: '/lib/statbankSaved/statbankSaved.ts',
      function: 'fetch',
      message: Events.REQUEST_DATA,
      request: requestParams
    })
  }

  const response: HttpResponse = http.request(requestParams)

  if (response.status !== 200) {
    if (queryId) {
      logUserDataQuery(queryId, {
        file: '/lib/statbankSaved/statbankSaved.ts',
        function: 'fetch',
        message: Events.REQUEST_GOT_ERROR_RESPONSE,
        response
      })
    }
    log.error(`HTTP ${url} (${response.status} ${response.message})`)
  }

  if (response.status === 429) { // 429 = too many requests
    sleep(30 * 1000)
  }

  if (response.status === 200 && response.body) {
    return {
      html: response.body,
      json: xmlParser.parse(response.body)
    }
  }
  return null
}
