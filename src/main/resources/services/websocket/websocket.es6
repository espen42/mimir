const ws = __non_webpack_require__('/lib/wsUtil')
const convert = __non_webpack_require__('/lib/convert/convert')
const dashboard = __non_webpack_require__('/lib/ssb/dataset/dashboard')

ws.openWebsockets(exports) // make the server ready for socket connections

// use SocketEmitter expansion to handle this
const socketEmitter = new ws.SocketEmitter()

// handle socket connections
socketEmitter.connect(connectionCallback)

function connectionCallback(socket) {
  convert.setupHandlers(socket)
  dashboard.setupHandlers(socket)

  socket.on('keep-alive', () => {
    socket.emit('keep-alive', 'pong')
  })
}
