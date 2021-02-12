import Button from 'react-bootstrap/Button'
import React, { useContext, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { selectInternalBaseUrl, selectInternalStatbankUrl, selectLoadingClearCache } from '../HomePage/selectors'
import { WebSocketContext } from '../../utils/websocket/WebsocketProvider'
import { requestClearCache } from '../HomePage/actions.es6'
import { ChevronDown, ChevronUp, RefreshCw, Trash } from 'react-feather'
import { Col, Container, Row } from 'react-bootstrap'
import { Link, Dropdown, Input } from '@statisticsnorway/ssb-component-library'
import { selectSearchList, selectLoadingSearchList, selectHasLoadingStatistic } from '../Statistics/selectors'
import { setOpenStatistic, setOpenModal } from '../Statistics/actions'
import { startRefresh } from '../StatRegDashboard/actions'
import { selectStatuses } from '../StatRegDashboard/selectors'
import { selectStatistics } from '../Statistics/selectors.es6'

export function DashboardTools() {
  const loadingCache = useSelector(selectLoadingClearCache)
  const statisticsSearchList = useSelector(selectSearchList)
  const statistics = useSelector(selectStatistics)
  const loadingStatisticsSearchList = useSelector(selectLoadingSearchList)
  const hasLoadingStatistic = useSelector(selectHasLoadingStatistic)
  const io = useContext(WebSocketContext)
  const dispatch = useDispatch()
  const [selectedStat, setSelectedStat] = useState(null)
  const statuses = useSelector(selectStatuses)
  const [showLinkTools, setShowLinkTools] = useState(false)
  const internalBaseUrl = useSelector(selectInternalBaseUrl)
  const internalStatbankUrl = useSelector(selectInternalStatbankUrl)

  function refreshStatReg(key) {
    startRefresh(dispatch, io, [key])
  }

  function makeRefreshButton(statRegStatus) {
    return (
      <Button
        variant="primary"
        className="mx-1"
        onClick={() => refreshStatReg(statRegStatus.key)}
        disabled={statRegStatus.loading}
      >
        Oppdater { statRegStatus.displayName } { statRegStatus.loading ? <span className="spinner-border spinner-border-sm" /> : <RefreshCw size={16}/> }
      </Button>
    )
  }

  function clearCache() {
    requestClearCache(dispatch, io)
  }

  function renderIcon(loading) {
    if (loading) {
      return (<span className="spinner-border spinner-border-sm" />)
    }
    return (<Trash size={16}/>)
  }

  function onStatisticsSearchSelect(e) {
    let stat = statistics.find((s) => s.id === e.id)
    if (!stat) {
      stat = statisticsSearchList.find((s) => s.id === e.id)
    }
    setSelectedStat(stat)
  }

  function renderStatisticsSearch() {
    if (loadingStatisticsSearchList) {
      return (
        <span className="spinner-border spinner-border-sm ml-2 mb-1" />
      )
    }
    const items = statisticsSearchList.map((s) => {
      return {
        title: `${s.shortName} - ${s.name}`,
        id: s.id
      }
    })
    if (items.length === 0) {
      items.push({
        title: `Ingen statistikker`,
        id: '-1'
      })
    }
    return (
      <Dropdown
        className="mx-1"
        placeholder="Finn statistikk"
        searchable
        items={items}
        onSelect={(e) => onStatisticsSearchSelect(e)}
      />
    )
  }

  function renderLinkTools() {
    return (
      <ul className="list-unstyled list-group">
        <li className="list-group-item">
          <Link
            isExternal
            href={internalBaseUrl + '/statistikkregisteret/publisering/list'}>Statistikkregisteret
          </Link>
        </li>
        <li className="list-group-item">
          <Link
            isExternal
            href={internalBaseUrl + '/designer'}>Tabellbygger
          </Link>
        </li>
        <li className="list-group-item">
          <Link
            isExternal
            href={internalStatbankUrl}>Intern statistikkbank
          </Link>
        </li>
        <li className="list-group-item">
          <Link
            isExternal
            href="https://wiki.ssb.no/display/VEILEDNING/Home">Veiledninger i publiseringer på ssb.no
          </Link>
        </li>
      </ul>
    )
  }

  function handleTbmlDefinitionsStatbankTableSearch(value) {
    window.open(`${internalBaseUrl}/tbprocessor/document/listByTableId?tableid=${value}`, '_blank')
  }

  function renderTbmlDefinitionsStatbankTable() {
    return (
      <Col className="mx-1">
        <span className="font-weight-bold">Vis TBML-definisjoner basert på Statbanktabell</span>
        <Input
          className="mt-3"
          ariaLabel="Search table ID"
          placeholder="Tabellens ID"
          searchField
          submitCallback={handleTbmlDefinitionsStatbankTableSearch}
        />
      </Col>
    )
  }

  return (
    <div className="p-4 tables-wrapper">
      <h2>Diverse verktøy</h2>
      <Container>
        <Row className="mb-3">
          <Col>
            <span className="mx-1">Tøm Cache</span>
            <Button
              size="sm"
              className="mx-3"
              onClick={() => clearCache()}
              disabled={loadingCache}>
              {renderIcon(loadingCache)}
            </Button>
          </Col>
        </Row>
        <Row className="mb-4">
          <Col className="col-10">
            {renderStatisticsSearch()}
          </Col>
          <Col className="col-2 pt-1">
            <Button
              variant="primary"
              size="sm"
              className="mx-1"
              onClick={() => {
                setOpenStatistic(dispatch, io, selectedStat)
                setOpenModal(dispatch, true)
              }}
              disabled={hasLoadingStatistic || loadingStatisticsSearchList || !selectedStat}
            >
              { hasLoadingStatistic ? <span className="spinner-border spinner-border-sm" /> : <RefreshCw size={16}/> }
            </Button>
          </Col>
        </Row>
        {statuses.map((statRegStatus, index) => {
          const {} = statRegStatus
          return (
            <Row className="mb-4" key={index}>
              <Col>
                {makeRefreshButton(statRegStatus)}
              </Col>
            </Row>
          )
        })}
        <Row className="mb-4">
          {renderTbmlDefinitionsStatbankTable()}
        </Row>
        <Row className="link-tools-list">
          <Col>
            <h3>Verktøyliste</h3>
            <Button
              variant="primary"
              className="mx-1 mb-2"
              onClick={showLinkTools ? () => setShowLinkTools(false) : () => setShowLinkTools(true)}
            >
              {showLinkTools ? 'Skjul lenker' : 'Vis lenker' } {showLinkTools ? <ChevronUp size={16}/> : <ChevronDown size={16}/> }
            </Button>
            {showLinkTools ? renderLinkTools() : null}
          </Col>
        </Row>
      </Container>
    </div>
  )
}

export default (props) => <DashboardTools {...props} />
