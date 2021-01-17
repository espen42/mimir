__non_webpack_require__('/lib/polyfills/nashorn')
import { Content } from 'enonic-types/content'
import { Table } from '../../site/content-types/table/table'
import { TbmlDataUniform,
  TableRowUniform,
  TableCellUniform,
  Note,
  NotesUniform,
  PreliminaryData,
  Title,
  Source, Thead, StatbankSavedRaw, StatbankSavedUniform, TableCellRaw } from '../types/xmlParser'
import { Request } from 'enonic-types/controller'
import { DatasetRepoNode, RepoDatasetLib } from '../repo/dataset'
import { DataSource as DataSourceType } from '../repo/dataset'
import { StatbankSavedLib } from './dataset/statbankSaved'
import { SSBCacheLibrary } from './cache'

const {
  data: {
    forceArray
  }
} = __non_webpack_require__( '/lib/util')

const {
  getDataset
} = __non_webpack_require__( '/lib/ssb/dataset/dataset')

const {
  datasetOrUndefined
}: SSBCacheLibrary = __non_webpack_require__('/lib/ssb/cache')
const {
  fetchStatbankSavedData
}: StatbankSavedLib = __non_webpack_require__('/lib/ssb/dataset/statbankSaved')

const {
  DATASET_BRANCH,
  UNPUBLISHED_DATASET_BRANCH
}: RepoDatasetLib = __non_webpack_require__('/lib/repo/dataset')

export function parseTable(req: Request, table: Content<Table>, branch: string = DATASET_BRANCH): TableView {
  let tableViewData: TableView = {
    caption: undefined,
    thead: [],
    tbody: [],
    tfoot: {
      footnotes: [],
      correctionNotice: ''
    },
    tableClass: '',
    noteRefs: [],
    sourceList: []
  }

  let datasetRepo: DatasetRepoNode<TbmlDataUniform | StatbankSavedRaw | object> | undefined
  if (branch === UNPUBLISHED_DATASET_BRANCH) {
    datasetRepo = getDataset(table, UNPUBLISHED_DATASET_BRANCH)
  } else {
    datasetRepo = datasetOrUndefined(table)
  }

  const dataSource: Table['dataSource'] | undefined = table.data.dataSource

  if (datasetRepo) {
    const data: string | TbmlDataUniform | StatbankSavedRaw | object | undefined = datasetRepo.data

    if (dataSource && dataSource._selected === DataSourceType.TBPROCESSOR) {
      const tbmlData: TbmlDataUniform = data as TbmlDataUniform
      if (tbmlData && tbmlData.tbml && tbmlData.tbml.metadata && tbmlData.tbml.presentation) {
        tableViewData = getTableViewData(table, tbmlData)
      }
    }
  }

  if (dataSource && dataSource._selected === DataSourceType.STATBANK_SAVED) {
    const statbankSavedData: StatbankSavedRaw | null = fetchStatbankSavedData(table)
    const parsedStatbankSavedData: StatbankSavedUniform = statbankSavedData ? JSON.parse(statbankSavedData.json) : null
    if (parsedStatbankSavedData) {
      tableViewData = getTableViewDataStatbankSaved(table, parsedStatbankSavedData)
    }
  }
  return tableViewData
}

function getTableViewData(table: Content<Table>, dataContent: TbmlDataUniform ): TableView {
  const title: Title = dataContent.tbml.metadata.title
  const notes: NotesUniform = dataContent.tbml.metadata.notes
  const sourceList: Array<Source> = dataContent.tbml.metadata && dataContent.tbml.metadata.sourceList ? dataContent.tbml.metadata.sourceList : []
  const headRows: Array<TableRowUniform> = forceArray(dataContent.tbml.presentation.table.thead)
  const bodyRows: Array<TableRowUniform> = forceArray(dataContent.tbml.presentation.table.tbody)

  const headNoteRefs: Array<string> = headRows.reduce((acc: Array<string>, row: TableRowUniform) => {
    const tableCells: Array<TableCellUniform> = row.tr
    tableCells.map((cell: TableCellUniform) => {
      if (cell) acc.push(...getNoterefsHeader(cell))
    })
    return acc
  }, [])

  const bodyNoteRefs: Array<string> = bodyRows.reduce((acc: Array<string>, row: TableRowUniform) => {
    const tableCells: Array<TableCellUniform> = row.tr
    tableCells.map((cell: TableCellUniform) => {
      if (cell) acc.push(...getNoterefsHeader(cell))
    })
    return acc
  }, [])

  const noteRefs: Array<string> = title && title.noterefs ?
    [title.noterefs, ...headNoteRefs, ...bodyNoteRefs] :
    [...headNoteRefs, ...bodyNoteRefs]

  return {
    caption: title,
    thead: headRows,
    tbody: bodyRows,
    tableClass: dataContent.tbml.presentation.table.class ? dataContent.tbml.presentation.table.class : 'statistics',
    tfoot: {
      footnotes: notes ? notes.note : [],
      correctionNotice: table.data.correctionNotice || ''
    },
    noteRefs,
    sourceList
  }
}

function getTableViewDataStatbankSaved(table: Content<Table>, dataContent: StatbankSavedUniform ): TableView {
  const title: Title = dataContent.table.caption
  const headRows: Array<TableRowUniform> = forceArray(dataContent.table.thead)
    .map( (thead: Thead) => ({
      tr: getTableCellHeader(forceArray(thead.tr))
    }))
  const bodyRows: Array<TableRowUniform> = forceArray(dataContent.table.tbody)
    .map( (tbody: Thead) => ({
      tr: getTableCellBody(forceArray(tbody.tr))
    }))

  return {
    caption: title,
    thead: headRows,
    tbody: bodyRows,
    tableClass: 'statistics',
    tfoot: {
      footnotes: [],
      correctionNotice: ''
    },
    noteRefs: [],
    sourceList: []
  }
}


function getTableCellHeader(tableCell: Array<TableCellRaw>): Array<TableCellUniform> {
  return forceArray(tableCell)
    .map( (cell: TableCellUniform) => ({
      td: typeof cell.td != 'undefined' ? forceArray(cell.td) : undefined,
      th: typeof cell.th != 'undefined' ? forceArray(cell.th) : undefined
    }))
}

function getTableCellBody(tableCell: Array<TableCellRaw>): Array<TableCellUniform> {
  return forceArray(tableCell)
    .map( (cell: TableCellUniform) => ({
      th: typeof cell.th != 'undefined' ? forceArray(cell.th) : undefined,
      td: typeof cell.td != 'undefined' ? forceArray(cell.td) : undefined
    }))
}

function getNoterefsHeader(row: TableCellUniform): Array<string> {
  const values: Array<number | string | PreliminaryData> = forceArray(row.th)
  const noteRefs: Array<string> = values.reduce((acc: Array<string>, cell: number | string | PreliminaryData) => {
    if (typeof cell === 'object') {
      if (cell.noterefs && !acc.includes(cell.noterefs)) {
        acc.push(cell.noterefs)
      }
    }
    return acc
  }, [])
  return noteRefs
}

interface TableView {
  caption?: Title;
  thead: Array<TableRowUniform>;
  tbody: Array<TableRowUniform>;
  tfoot: {
    footnotes: Array<Note>;
    correctionNotice: string;
  };
  tableClass: string;
  noteRefs: Array<string>;
  sourceList: Source | Array<Source> | undefined;
}
