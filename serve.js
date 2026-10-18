// node serve.js a 1234

fs = require('fs')
http = require('http')

types = {
  'css': 'text/css',
  'html': 'text/html',
  'ico': 'image/x-icon',
  'js': 'application/javascript'
}

function serve (folder, port) {
  folder = folder || 'a'
  port = port || 1234
  var index = '/x.html'
  if (folder.slice(-5) == '.html') {
    var i = folder.lastIndexOf('/')
    if (i != -1) {
      index = folder.slice(i)
      folder = folder.slice(0, i)
    }
  }
  var server = http.createServer(function (request, response) {
    var file = request.url
    if (file[0] == '/' && file.indexOf('..') == -1) {
      console.log(file)
      file = file.replaceAll('%20', ' ')
      var type = file.slice(file.lastIndexOf('.') + 1)
      if (type in types) {
        type = types[type]
      } else {
        file = index
        type = 'text/html'
      }
      file = folder + file
      if (fs.existsSync(file) && fs.lstatSync(file).isFile()) {
        response.setHeader('content-type', type)
        fs.createReadStream(file).pipe(response)
      }
    }
  })
  server.listen(port, function () {
    console.log('localhost:' + port)
  })
}

serve(process.argv[2], process.argv[3])