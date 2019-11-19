import * as klass from '/lib/klass'

const contentType = 'application/json'

exports.get = function(req) {
  const municipality = klass.getMunicipality({ code: req.params.postalCode })
  const body = { municipality }
  return { body, contentType, status: 200 }
}