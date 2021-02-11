
__non_webpack_require__('/lib/polyfills/nashorn')
const {
  getAllStatisticsFromRepo
} = __non_webpack_require__('/lib/repo/statreg/statistics')
const {
  handleRepoGet
} = __non_webpack_require__('/lib/ssb/statreg/repoUtils')

const {
  publishDataset
} = __non_webpack_require__('/lib/ssb/dataset/publish')

const {
  cronContext
} = __non_webpack_require__('/lib/ssb/cron')

const {
  run
} = __non_webpack_require__('/lib/xp/context')

const toOption = (stat) => ({
  ...stat,
  displayName: stat.shortName,
  description: stat.name
})

const filterByShortName = (stats, filters) => {
  if (!filters.query) {
    return stats
  }

  log.info(`searching ${filters.query} in ${stats.length} stats`)
  return stats.filter((s) => s.shortName.toLowerCase().includes(filters.query.toLowerCase()))
}

const filterByIds = (stats, filters) => {
  return filters.ids && filters.ids.split(',')
    .reduce((acc, id) => {
      const found = stats.find((s) => `${s.id}` === id)
      return found ? acc.concat(found) : acc
    }, [])
}

exports.get = (req) => {
  return handleRepoGet(
    req,
    'Statistics',
    getAllStatisticsFromRepo,
    toOption,
    req.params.ids ? filterByIds : filterByShortName)
}

exports.post = (req) => {
  if (req.params.runPublishDataset === 'OK') {
    run(cronContext, publishDataset)
    return {
      body: {
        status: 'Running statRegJon'
      },
      contentType: 'application/json',
      status: 200
    }
  }
}
