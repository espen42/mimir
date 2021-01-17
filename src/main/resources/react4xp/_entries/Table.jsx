import React from 'react'
import PropTypes from 'prop-types'
import { Dropdown, Link } from '@statisticsnorway/ssb-component-library'
import { isEmpty } from 'ramda'
import NumberFormat from 'react-number-format'
import { Alert, Button } from 'react-bootstrap'

import '../../assets/js/jquery-global.js'
import { ChevronLeft, ChevronRight } from 'react-feather'
import XLSX from 'xlsx/dist/xlsx.core.min'
import '../../assets/js/tableExport'

class Table extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      prevClientWidth: 0,
      showPreviewToggle: this.props.showPreviewDraft && (!this.props.pageTypeStatistic || this.props.paramShowDraft && this.props.pageTypeStatistic),
      fetchUnPublished: this.props.paramShowDraft,
      table: this.props.paramShowDraft && this.props.draftExist ? this.props.tableDraft : this.props.table
    }

    this.captionRef = React.createRef()
    this.tableControlsDesktopRef = React.createRef()
    this.tableControlsMobileRef = React.createRef()
    this.tableRef = React.createRef()
    this.tableWrapperRef = React.createRef()

    this.widthCheckInterval = undefined
    this.toggleDraft = this.toggleDraft.bind(this)
  }

  componentDidUpdate() {
    this.updateTableControlsDesktop()
  }

  componentWillUnmount() {
    clearInterval(this.widthCheckInterval)
  }

  componentDidMount() {
    this.updateTableControlsDesktop()
    // NOTE terrible solution, but its from react docs (https://reactjs.org/docs/state-and-lifecycle.html#adding-lifecycle-methods-to-a-class)
    this.widthCheckInterval = setInterval(() => {
      this.widthCheck()
    }, 250)
    window.addEventListener('resize', () => this.updateTableControlsDesktop())
  }

  widthCheck() {
    if (this.tableWrapperRef.current.clientWidth !== this.state.prevClientWidth) {
      this.setState({
        prevClientWidth: this.tableWrapperRef.current.clientWidth
      })
      this.updateTableControlsDesktop()
    }
  }

  updateTableControlsDesktop() {
    const controls = this.tableControlsDesktopRef.current
    const tableWrapper = this.tableWrapperRef.current
    const left = controls.children.item(0)
    const right = controls.children.item(1)

    // hide controlls if there is no scrollbar
    if (tableWrapper.scrollWidth > tableWrapper.clientWidth || tableWrapper.clientWidth === 0) {
      controls.classList.remove('d-none')
      this.tableControlsMobileRef.current.classList.remove('d-none')
      // disable left
      if (tableWrapper.scrollLeft <= 0) {
        left.classList.add('disabled')
      } else {
        left.classList.remove('disabled')
      }

      // disable right
      if (tableWrapper.scrollLeft + tableWrapper.clientWidth >= tableWrapper.scrollWidth) {
        right.classList.add('disabled')
      } else {
        right.classList.remove('disabled')
      }

      // move desktop controls to correct pos
      const captionHalfHeight = this.captionRef.current.offsetHeight / 2
      const controlsHalfHeight = left.scrollHeight / 2
      left.style.marginTop = `${captionHalfHeight - controlsHalfHeight}px`
      right.style.marginTop = `${captionHalfHeight - controlsHalfHeight}px`
    } else {
      controls.classList.add('d-none')
      this.tableControlsMobileRef.current.classList.add('d-none')
    }
  }

  scrollLeft() {
    this.tableWrapperRef.current.scrollLeft -= 100
    this.updateTableControlsDesktop()
  }

  scrollRight() {
    this.tableWrapperRef.current.scrollLeft += 100
    this.updateTableControlsDesktop()
  }

  trimValue(value) {
    if (value != undefined && typeof value === 'string') {
      return value.trim()
    }
    return value
  }

  formatNumber(value) {
    const language = this.props.table.language
    const decimalSeparator = (language == 'en') ? '.' : ','
    if (value != undefined) {
      if (typeof value === 'number') {
        return (
          <NumberFormat
            value={value}
            displayType={'text'}
            thousandSeparator={' '}
            decimalSeparator={decimalSeparator}
          />
        )
      } else {
        return value.trim()
      }
    }
    return value
  }

  addDownloadTableDropdown(mobile) {
    const {
      downloadTableLabel,
      downloadTableTitle,
      downloadTableOptions
    } = this.props

    const downloadTable = (item) => {
      if (item.id === 'downloadTableAsCSV') {
        { this.downloadTableAsCSV() }
      }

      if (item.id === 'downloadTableAsXLSX') {
        { this.downloadTableAsExcel() }
      }
    }

    return (
      <div className={`download-table-container ${mobile ? 'd-flex d-lg-none' : 'd-none d-lg-flex'}`}>
        <Dropdown
          header={downloadTableLabel}
          selectedItem={downloadTableTitle}
          items={downloadTableOptions}
          onSelect={downloadTable}
        />
      </div>
    )
  }

  downloadTableAsCSV() {
    const table = $(this.tableRef.current)
    table.tableExport({
      type: 'csv',
      fileName: 'tabell',
      csvSeparator: ';'
    })
  }

  downloadTableAsExcel() {
    const table = $(this.tableRef.current)
    table.tableExport({
      type: 'xlsx',
      jsxlsx: XLSX,
      fileName: 'tabell',
      numbers: {
        html: {
          decimalMark: ',',
          thousandsSeparator: ' '
        },
        output:
            {
              decimalMark: '.',
              thousandsSeparator: ''
            }
      }
    })
  }

  createTable() {
    const {
      tableClass
    } = this.props.table

    return (
      <table className={tableClass} ref={this.tableRef}>
        {this.addCaption()}
        {this.state.table.thead.map( (t, index) => {
          return (
            <React.Fragment key={index}>
              {this.addThead(index)}
              {this.addTbody(index)}
            </React.Fragment>
          )
        })}
        {this.addTFoot()}
      </table>
    )
  }

  addCaption() {
    const {
      caption
    } = this.state.table
    if (caption) {
      const hasNoteRefs = typeof caption === 'object'
      return (
        <caption noterefs={hasNoteRefs ? caption.noterefs : null} ref={this.captionRef}>
          <div className="caption-text-wrapper">
            {hasNoteRefs ? caption.content : caption}
            {hasNoteRefs ? this.addNoteRefs(caption.noterefs) : null}
          </div>
        </caption>
      )
    }
  }

  createScrollControlsMobile() {
    return (
      <div className="table-controls-mobile" ref={this.tableControlsMobileRef}>
        <img src={this.props.iconUrl} />
      </div>
    )
  }

  createScrollControlsDesktop() {
    return (
      <div className="table-controls-desktop" ref={this.tableControlsDesktopRef}>
        <span className="mr-2" onClick={() => this.scrollLeft()}><ChevronLeft/></span>
        <span onClick={() => this.scrollRight()}><ChevronRight/></span>
      </div>
    )
  }

  addThead(index) {
    return (
      <thead>
        {this.createRowsHead(this.state.table.thead[index].tr)}
      </thead>
    )
  }

  addTbody(index) {
    return (
      <tbody>
        {this.createRowsBody(this.state.table.tbody[index].tr)}
      </tbody>
    )
  }

  renderCorrectionNotice() {
    if (this.state.table.tfoot.correctionNotice) {
      return (
        <tr className="correction-notice">
          <td colSpan="100%">
            {this.state.table.tfoot.correctionNotice}
          </td>
        </tr>
      )
    }
    return null
  }

  addTFoot() {
    const {
      footnotes, correctionNotice
    } = this.state.table.tfoot
    const noteRefsList = this.state.table.noteRefs
    if (footnotes.length > 0 && noteRefsList.length > 0 || correctionNotice) {
      return (
        <tfoot>
          {noteRefsList.map((noteRef, index) => {
            const footNote = footnotes.find((note) => note.noteid === noteRef)
            return ( footNote &&
              <tr key={index} className="footnote">
                <td colSpan="100%">
                  <sup>{index + 1}</sup>{footNote.content}
                </td>
              </tr>
            )
          })}
          {this.renderCorrectionNotice()}
        </tfoot>
      )
    }
    return null
  }

  createRowsHead(rows) {
    if (rows) {
      return rows.map((row, i) => {
        return (
          <tr key={i}>
            { this.createHeaderCell(row) }
          </tr>
        )
      })
    }
  }

  createRowsBody(rows) {
    if (rows) {
      return rows.map((row, i) => {
        return (
          <tr key={i}>
            { this.createBodyTh(row) }
            { this.createBodyTd(row) }
          </tr>
        )
      })
    }
  }

  createHeaderCell(row) {
    return Object.keys(row).map((keyName, keyIndex) => {
      const value = row[keyName]
      if (keyName === 'th') {
        return (
          this.createHeadTh(value)
        )
      } else if (keyName === 'td') {
        return (
          this.createHeadTd(value)
        )
      }
    })
  }

  createHeadTh(value) {
    return value.map((cellValue, i) => {
      if (typeof cellValue === 'object') {
        if (Array.isArray(cellValue)) {
          // TODO: Because some values is split into array by xmlParser i have to do this, find better fix
          return (
            <th key={i}>{cellValue.join(' ')}</th>
          )
        } else {
          return (
            <th key={i} className={cellValue.class} rowSpan={cellValue.rowspan} colSpan={cellValue.colspan}>
              {this.trimValue(cellValue.content)}
              {this.addNoteRefs(cellValue.noterefs)}
            </th>
          )
        }
      } else {
        return (
          <th key={i}>{this.trimValue(cellValue)}</th>
        )
      }
    })
  }

  createHeadTd(value) {
    return value.map((cellValue, i) => {
      if (typeof cellValue === 'object') {
        return (
          <td key={i} className={cellValue.class} rowSpan={cellValue.rowspan} colSpan={cellValue.colspan}>
            {this.trimValue(cellValue.content)}
            {this.addNoteRefs(cellValue.noterefs)}
          </td>
        )
      } else {
        return (
          <td key={i}>{this.trimValue(cellValue)}</td>
        )
      }
    })
  }

  createBodyTh(row) {
    return Object.keys(row).map((key, index) => {
      const value = row[key]
      if (key === 'th') {
        return value.map((cellValue, i) => {
          if (typeof cellValue === 'object') {
            return (
              <th key={i} className={cellValue.class} rowSpan={cellValue.rowspan} colSpan={cellValue.colspan}>
                {this.trimValue(cellValue.content)}
                {this.addNoteRefs(cellValue.noterefs)}
              </th>
            )
          } else {
            return (
              <th key={i}>{this.trimValue(cellValue)}</th>
            )
          }
        })
      }
    })
  }

  createBodyTd(row) {
    return Object.keys(row).map((keyName, keyIndex) => {
      const value = row[keyName]
      if (keyName === 'td') {
        return value.map((cellValue, i) => {
          if (typeof cellValue === 'object') {
            return (
              <td key={i} className={cellValue.class} rowSpan={cellValue.rowspan} colSpan={cellValue.colspan}>
                {this.formatNumber(cellValue.content)}
              </td>
            )
          } else {
            return (
              <td key={i}>{this.formatNumber(cellValue)}</td>
            )
          }
        })
      }
    })
  }

  addNoteRefs(noteRefId) {
    const noteRefsList = noteRefId ? this.state.table.noteRefs : undefined
    if (noteRefsList !== undefined) {
      const noteRefIndex = noteRefsList.indexOf(noteRefId)
      if (noteRefIndex > -1) {
        return (
          <sup>{noteRefIndex + 1}</sup>
        )
      }
    }
  }

  addStandardSymbols() {
    if (this.props.standardSymbol) {
      return (
        <Link href={this.props.standardSymbol.href} >{this.props.standardSymbol.text}</Link>
      )
    }
    return
  }

  addPreviewButton() {
    if (this.state.showPreviewToggle && !this.props.pageTypeStatistic) {
      return (
        <Button
          variant="primary"
          onClick={this.toggleDraft}
        >
          {!this.state.fetchUnPublished ? 'Vis upubliserte tall' : 'Vis publiserte tall'}
        </Button>
      )
    }
    return
  }

  toggleDraft() {
    this.setState({
      fetchUnPublished: !this.state.fetchUnPublished,
      table: !this.state.fetchUnPublished && this.props.draftExist ? this.props.tableDraft : this.props.table
    })
  }

  addPreviewInfo() {
    if (this.props.showPreviewDraft) {
      if (this.state.fetchUnPublished && this.props.draftExist) {
        return (
          <Alert variant='info'>
          Tallene i tabellen nedenfor er upublisert
          </Alert>
        )
      } else if (this.state.fetchUnPublished && !this.props.draftExist) {
        return (
          <Alert variant='warning'>
              Finnes ikke upubliserte tall for denne tabellen
          </Alert>
        )
      }
    }
    return
  }

  renderSources() {
    const {
      sources,
      sourceLabel,
      sourceListTables,
      sourceTableLabel,
      statBankWebUrl
    } = this.props

    if (sourceListTables && sourceListTables.length > 0 || sources && sources.length > 0) {
      return (
        <div className="row mt-5 source">
          <div className="w-100 col-12">
            <span><strong>{sourceLabel}</strong></span>
          </div>
          {sourceListTables.map((tableId, index) => {
            return (
              <div key={index} className="col-lg-3 col-12 mb-3">
                <Link href={statBankWebUrl + '/table/' + tableId}>{sourceTableLabel + ' ' + tableId}</Link>
              </div>
            )
          })}
          {sources.map((source, index) => {
            if (source.url !== undefined && source.url !== null && source.urlText !== undefined && source.urlText !== null) {
              return (
                <div key={index} className="col-lg-3 col-12 mb-3">
                  <Link href={source.url}>{source.urlText}</Link>
                </div>
              )
            }
          })}
        </div>
      )
    }
    return null
  }

  render() {
    if (!isEmpty(this.state.table)) {
      return (
        <div className="container">
          {this.addPreviewButton()}
          {this.addDownloadTableDropdown(false)}
          {this.addPreviewInfo()}
          {this.createScrollControlsDesktop()}
          {this.createScrollControlsMobile()}
          <div className="table-wrapper searchabletext" onScroll={() => this.updateTableControlsDesktop()} ref={this.tableWrapperRef}>
            {this.createTable()}
          </div>
          {this.addDownloadTableDropdown(true)}
          {this.addStandardSymbols()}
          {this.renderSources()}
        </div>
      )
    } else {
      return <div>
        <p>Ingen tilknyttet Tabell</p>
      </div>
    }
  }
}

Table.propTypes = {
  downloadTableLabel: PropTypes.string,
  downloadTableTitle: PropTypes.object,
  downloadTableOptions: PropTypes.arrayOf(
    PropTypes.shape({
      title: PropTypes.string,
      id: PropTypes.string
    })
  ),
  standardSymbol: PropTypes.shape({
    href: PropTypes.string,
    text: PropTypes.string
  }),
  sourceLabel: PropTypes.string,
  sources: PropTypes.arrayOf(PropTypes.shape({
    urlText: PropTypes.string,
    url: PropTypes.string
  })),
  iconUrl: PropTypes.string,
  table: PropTypes.shape({
    caption: PropTypes.string | PropTypes.shape({
      content: PropTypes.string,
      noterefs: PropTypes.string
    }),
    tableClass: PropTypes.string,
    thead: PropTypes.arrayOf(
      PropTypes.shape({
        td: PropTypes.array | PropTypes.number | PropTypes.string | PropTypes.shape({
          rowspan: PropTypes.number,
          colspan: PropTypes.number,
          content: PropTypes.string,
          class: PropTypes.string
        }),
        th: PropTypes.array | PropTypes.number | PropTypes.string | PropTypes.shape({
          rowspan: PropTypes.number,
          colspan: PropTypes.number,
          content: PropTypes.string,
          class: PropTypes.string,
          noterefs: PropTypes.string
        })
      })
    ),
    tbody: PropTypes.arrayOf(
      PropTypes.shape({
        th: PropTypes.array | PropTypes.number | PropTypes.string | PropTypes.shape({
          content: PropTypes.string,
          class: PropTypes.string,
          noterefs: PropTypes.string
        }),
        td: PropTypes.array | PropTypes.number | PropTypes.string | PropTypes.shape({
          content: PropTypes.string,
          class: PropTypes.string
        })
      })
    ),
    tfoot: PropTypes.shape({
      footnotes: PropTypes.arrayOf(
        PropTypes.shape({
          noteid: PropTypes.string,
          content: PropTypes.string
        })
      ),
      correctionNotice: PropTypes.string
    }),
    language: PropTypes.string,
    noteRefs: PropTypes.arrayOf(PropTypes.string)
  }),
  tableDraft: PropTypes.shape({
    caption: PropTypes.string | PropTypes.shape({
      content: PropTypes.string,
      noterefs: PropTypes.string
    }),
    thead: PropTypes.arrayOf(
      PropTypes.shape({
        td: PropTypes.array | PropTypes.number | PropTypes.string | PropTypes.shape({
          rowspan: PropTypes.number,
          colspan: PropTypes.number,
          content: PropTypes.string,
          class: PropTypes.string
        }),
        th: PropTypes.array | PropTypes.number | PropTypes.string | PropTypes.shape({
          rowspan: PropTypes.number,
          colspan: PropTypes.number,
          content: PropTypes.string,
          class: PropTypes.string,
          noterefs: PropTypes.string
        })
      })
    ),
    tbody: PropTypes.arrayOf(
      PropTypes.shape({
        th: PropTypes.array | PropTypes.number | PropTypes.string | PropTypes.shape({
          content: PropTypes.string,
          class: PropTypes.string,
          noterefs: PropTypes.string
        }),
        td: PropTypes.array | PropTypes.number | PropTypes.string | PropTypes.shape({
          content: PropTypes.string,
          class: PropTypes.string
        })
      })
    ),
    tfoot: PropTypes.shape({
      footnotes: PropTypes.arrayOf(
        PropTypes.shape({
          noteid: PropTypes.string,
          content: PropTypes.string
        })
      ),
      correctionNotice: PropTypes.string
    }),
    noteRefs: PropTypes.arrayOf(PropTypes.string)
  }),
  showPreviewDraft: PropTypes.bool,
  paramShowDraft: PropTypes.bool,
  draftExist: PropTypes.bool,
  pageTypeStatistic: PropTypes.bool,
  sourceListTables: PropTypes.arrayOf(PropTypes.string),
  sourceTableLabel: PropTypes.string,
  statBankWebUrl: PropTypes.string
}

export default (props) => <Table {...props}/>
