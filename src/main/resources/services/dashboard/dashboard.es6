const auth = __non_webpack_require__( '/lib/xp/auth')
const context = __non_webpack_require__( '/lib/xp/context')
const content = __non_webpack_require__( '/lib/xp/content')
const {
  getData, refreshDatasetWithData
} = __non_webpack_require__('/lib/dataquery')
const {
  getAllOrOneDataQuery
} = __non_webpack_require__('/lib/ssb/dataquery')
const {
  getDataSetWithDataQueryId,
  getUpdated,
  getUpdatedReadable
} = __non_webpack_require__( '/lib/ssb/dataset')
const {
  createJob, finishJobWithResult
} = __non_webpack_require__('/lib/repo/job')


exports.get = function(req) {
  const params = req.params

  let updateResult
  let jobLog
  if (params && params.id) {
    updateResult = context.run(createContextOption('master'), () => {
      const dataqueries = getAllOrOneDataQuery(param.id)
      const allDataQueryIds = dataqueries.map( (dataquery) => dataquery._id)
      jobLog = createJob(allDataQueryIds)
      return dataqueries.map((dataquery) => updateDataQuery(dataquery))
    })
  } else {
    updateResult = [{
      success: false,
      message: `Missing parameter "id"`,
      status: 400
    }]
  }

  const messageObject = createFeedback(updateResult)
  const finishJobResult = finishJobWithResult(jobLog._id, messageObject.success, messageObject.message, messageObject.status)
  return {
    body: {
      updates: updateResult,
      message: messageObject.message,
      status: messageObject.status,
      success: messageObject.success
    },
    contentType: 'application/json',
    status: messageObject.status
  }
}

function createFeedback(updateResult) {
  if (updateResult.length === 1) {
    return {
      message: updateResult[0].message,
      status: updateResult[0].status,
      success: updateResult[0].success
    }
  } else {
    return {
      message: `Successfully Updated/created: ${
        updateResult.filter( (result) => result.status === 201).length
      }, Ignored : ${
        updateResult.filter( (result) => result.status === 204).length
      } , Failed:  ${
        updateResult.filter( (result) => result.status === 500).length
      } , Total: ${
        updateResult.length
      }`,
      success: true,
      status: 201
    }
  }
}

function updateDataQuery(dataquery, jobLog) {
  const returnObj = {
    message: '',
    success: false,
    status: 0,
    datasetInfo: []
  }

  if (dataquery) {
    const data = getData(dataquery)
    if (data) {
      const dataset = refreshDatasetWithData(JSON.stringify(data), dataquery)
      if (dataset) {
        returnObj.message = `Successfully updated/created dataset for dataquery`
        returnObj.success = true
        returnObj.status = 201

        returnObj.datasetInfo.push({
          id: dataset.data.dataquery,
          updated: getUpdated(dataset),
          updatedHumanReadable: getUpdatedReadable(dataset),
          hasData: true
        })
      } else {
        returnObj.success = true
        returnObj.message = `No new data for dataquery`
        returnObj.status = 204 // 204: no content
      }
    } else {
      returnObj.success = false
      returnObj.message = `Failed to get data for dataquery: ${dataquery._id}`
      returnObj.status = 500
    }
  } else {
    returnObj.success = false
    returnObj.message = `No dataquery found with id: ${req.params.id}`
    returnObj.status = 404
  }
  return returnObj
}


exports.delete = (req) => {
  let status = 200
  let message = ''
  let success = true
  const datasetInfo = []
  const params = req.params

  if (params && params.id) {
    context.run(createContextOption('draft'), () => {
      let datasets = []
      if (params.id === '*') { // delete all
        datasets = content.query({
          start: 0,
          count: 999,
          contentTypes: [`${app.name}:dataset`]
        }).hits
      } else { // delete one
        datasets = getDataSetWithDataQueryId(params.id).hits
      }
      if (datasets.length > 0) {
        const datasetsToPublish = []
        datasets.forEach((dataset) => {
          const isDeleted = content.delete({
            key: dataset._id
          })
          if (isDeleted) {
            datasetInfo.push({
              id: dataset.data.dataquery,
              updated: '',
              updatedHumanReadable: '',
              hasData: false
            })
            datasetsToPublish.push(dataset._id)
          }
        })
        content.publish({
          keys: datasetsToPublish,
          sourceBranch: 'draft',
          targetBranch: 'master'
        })
        message = `Successfully deleted ${datasetInfo.length} of ${datasets.length} datasets`
      } else {
        success = false
        message = `No dataset found for dataquery with id ${params.id}`
        status = 404
      }
    })
  } else {
    success = false
    message = `Missing parameter "id"`
    status = 400
  }

  return {
    body: {
      success,
      message,
      updates: datasetInfo
    },
    contentType: 'application/json',
    status
  }
}

const createContextOption = (branch) => {
  const _user = auth.getUser()
  const user = {
    login: _user.login,
    userStore: _user.idProvider
  }

  const contextOption = {
    repository: 'com.enonic.cms.default',
    principals: ['role:system.admin'],
    branch,
    user
  }

  return contextOption
}
