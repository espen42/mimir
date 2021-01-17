__non_webpack_require__('/lib/polyfills/nashorn')
import { TaskLib } from '../types/task'
import { CacheLib, Cache } from '../types/cache'
import { Request, Response } from 'enonic-types/controller'
import { EventLibrary, EnonicEvent, EnonicEventData } from 'enonic-types/event'
import { ContextLibrary } from 'enonic-types/context'
import { ContentLibrary, QueryResponse, Content } from 'enonic-types/content'
import { JSONstat } from '../types/jsonstat-toolkit'
import { TbmlDataUniform } from '../types/xmlParser'
import { DATASET_REPO, DatasetRepoNode } from '../repo/dataset'
import { Socket } from '../types/socket'
import { Table } from '../../site/content-types/table/table'
import { Highchart } from '../../site/content-types/highchart/highchart'
import { MunicipalityWithCounty } from '../klass/municipalities'
import { ServerLogLib } from './serverLog'
import { DatasetLib } from './dataset/dataset'

const {
  newCache
}: CacheLib = __non_webpack_require__( '/lib/cache')
const {
  listener,
  send
}: EventLibrary = __non_webpack_require__('/lib/xp/event')
const {
  run
}: ContextLibrary = __non_webpack_require__('/lib/xp/context')
const {
  submit, sleep
}: TaskLib = __non_webpack_require__('/lib/xp/task')
const {
  query,
  get
}: ContentLibrary = __non_webpack_require__('/lib/xp/content')
const {
  getDataset,
  extractKey
}: DatasetLib = __non_webpack_require__('/lib/ssb/dataset/dataset')
const {
  cacheLog
}: ServerLogLib = __non_webpack_require__('/lib/ssb/serverLog')

const masterFilterCaches: Map<string, Cache> = new Map()
const draftFilterCaches: Map<string, Cache> = new Map()
const masterMenuCache: Cache = newCache({
  expire: 3600,
  size: 2
})
const draftMenuCache: Cache = newCache({
  expire: 3600,
  size: 2
})
const dividerCache: Cache = newCache({
  expire: 3600,
  size: 2
})
const draftRelatedArticlesCache: Cache = newCache({
  expire: 3600,
  size: 200
})
const masterRelatedArticlesCache: Cache = newCache({
  expire: 3600,
  size: 200
})
const draftRelatedFactPageCache: Cache = newCache({
  expire: 3600,
  size: 200
})
const masterRelatedFactPageCache: Cache = newCache({
  expire: 3600,
  size: 200
})
const datasetRepoCache: Cache = newCache({
  expire: 3600,
  size: 1500
})
const parsedMunicipalityCache: Cache = newCache({
  expire: 3600,
  size: 1000
})
const municipalityWithCodeCache: Cache = newCache({
  expire: 3600,
  size: 1000
})
const municipalityWithNameCache: Cache = newCache({
  expire: 3600,
  size: 1000
})

const parentTypeCache: Cache = newCache({
  expire: 3600,
  size: 2000
})

let changeQueue: EnonicEventData['nodes'] = []
let clearTaskId: string | undefined

export function setup(): void {
  cacheLog('initializing cache node listener')
  listener({
    type: 'node.*',
    localOnly: true,
    callback: addToChangeQueue
  })

  listener({
    type: 'custom.clearCache',
    callback: (e: EnonicEvent<CompletelyClearCacheOptions>) => completelyClearCache(e.data)
  })
}

const validRepos: Array<string> = ['com.enonic.cms.default', DATASET_REPO]
function addToChangeQueue(event: EnonicEvent<EnonicEventData>): void {
  const validNodes: EnonicEventData['nodes'] = event.data.nodes.filter((n) => validRepos.includes(n.repo))
  if (validNodes.length > 0) {
    changeQueue = changeQueue.concat(validNodes)
    addClearTask()
  }
}

function addClearTask(): void {
  if (clearTaskId) {
    return
  }
  const changeQueueLength: number = changeQueue.length
  clearTaskId = submit({
    description: 'check cache clearing in mimir',
    task: () => {
      sleep(250)
      if (changeQueueLength === changeQueue.length) {
        const changedNodes: EnonicEventData['nodes'] = changeQueue
        changeQueue = [] // reset queue
        if (changeQueueLength >= 200) { // just clear everything if there is too many changes
          completelyClearCache({
            clearFilterCache: true,
            clearMenuCache: true,
            clearDividerCache: true,
            clearRelatedArticlesCache: true,
            clearRelatedFactPageCache: true,
            clearDatasetRepoCache: true,
            clearParsedMunicipalityCache: true,
            clearMunicipalityWithCodeCache: true,
            clearMunicipalityWithNameCache: true,
            clearParentTypeCache: true
          })
        } else {
          onNodeChange(changedNodes)
        }
        clearTaskId = undefined
      } else {
        clearTaskId = undefined
        addClearTask()
      }
    }
  })
}

function onNodeChange(validNodes: EnonicEventData['nodes']): void {
  const draftNodes: EnonicEventData['nodes'] = validNodes.filter((n) => n.branch === 'draft')
  if (draftNodes.length > 0) {
    clearForBranch(draftNodes, 'draft')
  }
  const masterNodes: EnonicEventData['nodes'] = validNodes.filter((n) => n.branch === 'master')
  if (masterNodes.length > 0) {
    clearForBranch(masterNodes, 'master')
  }
}

function clearForBranch(nodes: EnonicEventData['nodes'], branch: string): void {
  // need to run in correct context for getReferences to work
  run({
    repository: 'com.enonic.cms.default',
    branch: branch,
    user: {
      login: 'su',
      idProvider: 'system'
    },
    principals: ['role:system.admin']
  },
  () => {
    const cleared: Array<string> = []
    nodes.forEach((n) => {
      if (n.repo === 'com.enonic.cms.default') {
        // clear id and all references to id from cache
        cacheLog(`try to clear ${n.id}(${branch})`)
        const content: Content | null = get({
          key: n.id
        })
        if (content) {
          clearCache(content, branch, cleared)
        } else {
          // the element is deleted, so lets try to clear it only based on id, and its parent
          clearCache({
            _id: n.id
          } as Content, branch, cleared )
          // the path on these nodes are not site, but repo relative, so we need to strip out the /content at the start
          const parentPath: string = n.path.substring('/content'.length, n.path.lastIndexOf('/'))
          const parent: Content | null = get({
            key: parentPath
          })
          if (parent) {
            clearCache(parent, branch, cleared)
          }
        }
      } else if (n.repo === DATASET_REPO) {
        clearCacheRepo(n)
      }
    })
  })
}

function getReferences(id: string): Array<Content> {
  let start: number = 0
  let count: number = 10
  let hits: Array<Content> = []
  while (count === 10) {
    const result: QueryResponse<Content> = query({
      start,
      count,
      query: `_references LIKE "${id}"`
    })
    count = result.count
    start += count
    hits = hits.concat(result.hits)
  }
  return hits
}

function clearCache(content: Content, branch: string, cleared: Array<string>): Array<string> {
  if (cleared.filter((c) => content._id === c).length > 0) { // already cleared
    cacheLog(`already cleared ${content._id}(${branch})`)
    return cleared
  }
  cleared.push(content._id)

  // try to clear filter cache
  const cacheMap: Map<string, Cache> = branch === 'master' ? masterFilterCaches : draftFilterCaches
  const filterCache: Cache | undefined = cacheMap.get(content._id)
  if (filterCache) {
    cacheLog(`clear ${content._id} filter cache(${branch})`)
    filterCache.clear()
  }

  // clear related article cache
  if (content.type === `${app.name}:article`) {
    const relatedArticlesCache: Cache = branch === 'master' ? masterRelatedArticlesCache : draftRelatedArticlesCache
    cacheLog(`clear ${content._id} from related articles cache (${branch})`)
    relatedArticlesCache.remove(content._id)
  }

  // clear related fact page cache
  if (content.type === `${app.name}:contentList` || content.type === `${app.name}:page`) {
    const relatedFactPageCache: Cache = branch === 'master' ? masterRelatedFactPageCache : draftRelatedFactPageCache
    cacheLog(`clear ${content._id} from related fact page cache (${branch})`)
    relatedFactPageCache.remove(content._id)
  }

  // clear menu cache
  if (content.type === `${app.name}:menuItem`) {
    completelyClearMenuCache(branch)
  }

  const references: Array<Content> = getReferences(content._id)
  references.forEach((ref) => {
    cacheLog(`try to clear reference ${ref._id} to ${content._id}(${branch})`)
    clearCache(ref, branch, cleared)
  })

  return cleared
}

function clearCacheRepo(node: EnonicEventData['nodes'][0]): void {
  cacheLog(`clear ${node.path} from dataset repo cache`)
  datasetRepoCache.remove(node.path)
}

function getFilterCache(branch: string, filterKey: string): Cache {
  const cacheMap: Map<string, Cache> = branch === 'master' ? masterFilterCaches : draftFilterCaches
  let filterCache: Cache | undefined = cacheMap.get(filterKey)
  if (!filterCache) {
    filterCache = newCache({
      size: 1000,
      expire: 3600
    })
    cacheMap.set(filterKey, filterCache)
  }
  return filterCache
}

export function fromFilterCache(req: Request, filterKey: string, key: string, fallback: () => Response): Response {
  if (req.mode === 'live' || req.mode === 'preview') {
    const branch: string = req.mode === 'live' ? 'master' : 'draft'
    const filterCache: Cache = getFilterCache(branch, filterKey)
    return filterCache.get(key, () => {
      cacheLog(`added ${key} to ${filterKey} filter cache (${branch})`)
      return fallback()
    })
  }
  return fallback()
}

export function fromMenuCache(req: Request, key: string, fallback: () => unknown): unknown {
  if (req.mode === 'live' || req.mode === 'preview') {
    const branch: string = req.mode === 'live' ? 'master' : 'draft'
    const menuCache: Cache = branch === 'master' ? masterMenuCache : draftMenuCache
    return menuCache.get(key, () => {
      cacheLog(`added ${key} to menu cache (${branch})`)
      return fallback()
    })
  }
  return fallback()
}

export function fromDividerCache(dividerColor: string, fallback: () => string): string {
  return dividerCache.get(dividerColor, () => {
    cacheLog(`added ${dividerColor} to divider cache`)
    return fallback()
  })
}

export function fromRelatedArticlesCache(req: Request, key: string, fallback: () => unknown): unknown {
  if (req.mode === 'live' || req.mode === 'preview') {
    const branch: string = req.mode === 'live' ? 'master' : 'draft'
    const relatedArticlesCache: Cache = branch === 'master' ? masterRelatedArticlesCache : draftRelatedArticlesCache
    return relatedArticlesCache.get(key, () => {
      cacheLog(`added ${key} to related articles cache (${branch})`)
      return fallback()
    })
  }
  return fallback()
}

export function fromRelatedFactPageCache(req: Request, key: string, fallback: () => unknown): unknown {
  if (req.mode === 'live' || req.mode === 'preview') {
    const branch: string = req.mode === 'live' ? 'master' : 'draft'
    const relatedFactPageCache: Cache = branch === 'master' ? masterRelatedFactPageCache : draftRelatedFactPageCache
    return relatedFactPageCache.get(key, () => {
      cacheLog(`added ${key} to related fact page cache (${branch})`)
      return fallback()
    })
  }
  return fallback()
}

export function fromDatasetRepoCache(
  key: string,
  fallback: () => DatasetRepoNode<JSONstat | TbmlDataUniform | object> | null): DatasetRepoNode<JSONstat | TbmlDataUniform | object> | undefined {
  return datasetRepoCache.get(key, () => {
    cacheLog(`added ${key} to dataset repo cache`)
    const res: DatasetRepoNode<JSONstat | TbmlDataUniform | object> | null = fallback()
    // cant be null for some reason, so store it as undefined instead
    return res || undefined
  })
}

export function datasetOrUndefined(content: Content<Highchart | Table>): DatasetRepoNode<JSONstat | TbmlDataUniform | object> | undefined {
  return content.data.dataSource && content.data.dataSource._selected ?
    fromDatasetRepoCache(`/${content.data.dataSource._selected}/${extractKey(content)}`,
      () => getDataset(content)) :
    undefined
}

export function fromParsedMunicipalityCache(key: string, fallback: () => Array<MunicipalityWithCounty>): Array<MunicipalityWithCounty> {
  return parsedMunicipalityCache.get(key, () => {
    cacheLog(`added ${key} to parsed municipality cache`)
    return fallback()
  })
}

export function fromMunicipalityWithCodeCache(key: string, fallback: () => MunicipalityWithCounty | undefined): MunicipalityWithCounty | undefined {
  return municipalityWithCodeCache.get(key, () => {
    cacheLog(`added ${key} to municipality with code cache`)
    return fallback()
  })
}

export function fromMunicipalityWithNameCache(key: string, fallback: () => MunicipalityWithCounty | undefined): MunicipalityWithCounty | undefined {
  return municipalityWithNameCache.get(key, () => {
    cacheLog(`added ${key} to municipality with name cache`)
    return fallback()
  })
}

export function fromParentTypeCache(
  key: string,
  fallback: () => string): string {
  return parentTypeCache.get(key, () => {
    return fallback()
  })
}

function completelyClearFilterCache(branch: string): void {
  const cacheMap: Map<string, Cache> = branch === 'master' ? masterFilterCaches : draftFilterCaches
  cacheMap.forEach((cache: Cache, filterKey: string) => {
    cacheLog(`clear ${filterKey} filter cache(${branch})`)
    cache.clear()
    cacheMap.delete(filterKey)
  })
}

function completelyClearMenuCache(branch: string): void {
  cacheLog(`clear header/footer cache (${branch})`)
  const menuCache: Cache = branch === 'master' ? masterMenuCache : draftMenuCache
  menuCache.clear()
}

function completelyClearDividerCache(): void {
  cacheLog(`clear divider cache`)
  dividerCache.clear()
}

function completelyClearRelatedArticleCache(branch: string): void {
  cacheLog(`clear related article cache (${branch})`)
  const relatedArticlesCache: Cache = branch === 'master' ? masterRelatedArticlesCache : draftRelatedArticlesCache
  relatedArticlesCache.clear()
}

function completelyClearRelatedFactPageCache(branch: string): void {
  cacheLog(`clear related fact page cache (${branch})`)
  const relatedFactPageCache: Cache = branch === 'master' ? masterRelatedFactPageCache : draftRelatedFactPageCache
  relatedFactPageCache.clear()
}

function completelyClearDatasetRepoCache(): void {
  cacheLog(`clear dataset repo cache`)
  datasetRepoCache.clear()
}

function completelyClearParsedMunicipalityCache(): void {
  cacheLog(`clear parsed municipality cache`)
  parsedMunicipalityCache.clear()
}

function completelyClearMunicipalityWithCodeCache(): void {
  cacheLog(`clear municipality with code cache`)
  municipalityWithCodeCache.clear()
}

function completelyClearMunicipalityWithNameCache(): void {
  cacheLog(`clear municipality with name cache`)
  municipalityWithNameCache.clear()
}

function completelyClearParentTypeCache(): void {
  cacheLog(`clear parent type cache`)
  parentTypeCache.clear()
}

function completelyClearCache(options: CompletelyClearCacheOptions): void {
  if (options.clearFilterCache) {
    completelyClearFilterCache('master')
    completelyClearFilterCache('draft')
  }

  if (options.clearMenuCache) {
    completelyClearMenuCache('master')
    completelyClearMenuCache('draft')
  }

  if (options.clearDividerCache) {
    completelyClearDividerCache()
  }

  if (options.clearRelatedArticlesCache) {
    completelyClearRelatedArticleCache('master')
    completelyClearRelatedArticleCache('draft')
  }

  if (options.clearRelatedFactPageCache) {
    completelyClearRelatedFactPageCache('master')
    completelyClearRelatedFactPageCache('draft')
  }

  if (options.clearDatasetRepoCache) {
    completelyClearDatasetRepoCache()
  }

  if (options.clearParsedMunicipalityCache) {
    completelyClearParsedMunicipalityCache()
  }

  if (options.clearMunicipalityWithCodeCache) {
    completelyClearMunicipalityWithCodeCache()
  }

  if (options.clearMunicipalityWithNameCache) {
    completelyClearMunicipalityWithNameCache()
  }

  if (options.clearParentTypeCache) {
    completelyClearParentTypeCache()
  }
}

export function setupHandlers(socket: Socket): void {
  socket.on('clear-cache', () => {
    send({
      type: 'clearCache',
      distributed: true,
      data: {
        clearFilterCache: true,
        clearMenuCache: true,
        clearDividerCache: true,
        clearRelatedArticlesCache: true,
        clearRelatedFactPageCache: true,
        clearDatasetRepoCache: true,
        clearParsedMunicipalityCache: true,
        clearMunicipalityWithCodeCache: true,
        clearMunicipalityWithNameCache: true
      }
    })

    socket.emit('clear-cache-finished', {})
  })
}

export interface CompletelyClearCacheOptions {
  clearFilterCache: boolean;
  clearMenuCache: boolean;
  clearDividerCache: boolean;
  clearRelatedArticlesCache: boolean;
  clearRelatedFactPageCache: boolean;
  clearDatasetRepoCache: boolean;
  clearParsedMunicipalityCache: boolean;
  clearMunicipalityWithCodeCache: boolean;
  clearMunicipalityWithNameCache: boolean;
  clearParentTypeCache: boolean;
}

export interface SSBCacheLibrary {
  setup: () => void;
  fromFilterCache: (req: Request, filterKey: string, key: string, fallback: () => Response) => Response;
  fromMenuCache: (req: Request, key: string, fallback: () => unknown) => unknown;
  fromDividerCache: (dividerColor: string, fallback: () => string) => string;
  fromRelatedArticlesCache: (req: Request, key: string, fallback: () => unknown) => unknown;
  fromRelatedFactPageCache: (req: Request, key: string, fallback: () => unknown) => unknown;
  fromDatasetRepoCache:
    (key: string, fallback: () => DatasetRepoNode<JSONstat | TbmlDataUniform | object> | null)
      => DatasetRepoNode<JSONstat | TbmlDataUniform | object> | undefined;
  fromParsedMunicipalityCache: (key: string, fallback: () => Array<MunicipalityWithCounty>) => Array<MunicipalityWithCounty>;
  fromMunicipalityWithCodeCache: (key: string, fallback: () => MunicipalityWithCounty | undefined) => MunicipalityWithCounty | undefined;
  fromMunicipalityWithNameCache: (key: string, fallback: () => MunicipalityWithCounty | undefined) => MunicipalityWithCounty | undefined;
  fromParentTypeCache: (path: string, fallback: () => string) => string;
  datasetOrUndefined: (content: Content<Highchart | Table>) => DatasetRepoNode<JSONstat | TbmlDataUniform | object> | undefined;
  setupHandlers: (socket: Socket) => void;
}
