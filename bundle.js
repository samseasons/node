// node bundle.js a/a.js a/y.js

fs = require('fs')

base64 = '$0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz'

function resolve (f, file) {
  if (f.indexOf('./') == 0) {
    f = f.slice(2)
  }
  i = f[0]
  if (i != '.' && i != '/') {
    f = file.slice(0, file.lastIndexOf('/')) + '/' + f
  } else if (f.indexOf('../') == 0) {
    while (f.indexOf('../') == 0) {
      f = f.slice(3)
      file = file.slice(0, file.lastIndexOf('/'))
    }
    f = file.slice(0, file.lastIndexOf('/')) + '/' + f
  }
  if (f.slice(-3) != '.js') {
    f += '.js'
  }
  return f
}

function substitute (match, next, text) {
  a = text.indexOf(match)
  j = match.length
  k = next.length
  while (a != -1) {
    if (base64.indexOf(text[a + j]) != -1 || (a != 0 && (base64 + '"\'.').indexOf(text[a - 1]) != -1)) {
      a = text.indexOf(match, a + j)
    } else {
      text = text.slice(0, a) + next + text.slice(a + j)
      a = text.indexOf(match, a + k)
    }
  }
  return text
}

function parse (file, modules, texts) {
  if (fs.existsSync(file) && fs.lstatSync(file).isFile()) {
    text = fs.readFileSync(file, 'utf8')
  } else {
    texts[file] = ''
    return
  }
  lines = text.split('\n')
  remove = false
  text = ''
  for (i = 0, length = lines.length; i < length; i++) {
    line = lines[i]
    if (line.replace(/^\s+/, '').indexOf('//') == 0) {
      continue
    }
    if (!remove && (j = line.indexOf('/*')) != -1 && line.indexOf('//*') == -1) {
      if ((k = line.indexOf('*/')) != -1) {
        line = line.slice(0, j) + ' ' + line.slice(k + 2)
      } else {
        line = line.slice(0, j)
        remove = true
      }
    }
    if (remove) {
      if ((j = line.indexOf('*/')) != -1) {
        line = line.slice(j + 2)
        remove = false
      } else {
        continue
      }
    }
    line = line.replace(/\s+$/, '')
    if (line) {
      text += line + '\n'
    }
  }
  defaults = {}
  exports = {}
  exports[file] = {}
  order = []
  texta = text
  while ((i = text.indexOf('import ')) != -1) {
    if (i != 0) {
      j = text[i - 1]
      if (j != '\t' && j != '\n' && j != ' ') {
        text = text.slice(i + 6)
        continue
      }
    }
    i += 6
    while (text[i] == ' ') {
      i += 1
    }
    defaulted = ''
    names = {}
    text = text.slice(i)
    i = text.indexOf('from')
    j = text.indexOf('"')
    k = text.indexOf("'")
    if (i != -1 && (i < j || j == -1) && (i < k || k == -1)) {
      length = text.length
      while (i < length) {
        j = text[i - 1]
        k = text[i + 4]
        if ((j == ' ' || j == '}') && (k == ' ' || k == '"' || k == "'")) {
          break
        }
        i += 4
        i += text.slice(i).indexOf('from')
      }
      variables = text.slice(0, i)
      if ((j = variables.indexOf('{')) != -1) {
        k = variables.indexOf('}')
        split = variables.slice(j + 1, k).split(',')
        variables = variables.slice(0, j)
        for (j = 0, length = split.length; j < length; j++) {
          name = split[j].replace(/^\s+/, '').replace(/\s+$/, '')
          if ((k = name.indexOf(' as ')) != -1) {
            names[name.slice(0, k)] = name.slice(k + 4)
          } else if (name) {
            names[name] = name
          }
        }
      }
      name = variables.slice(0, variables.indexOf(','))
      name = name.replace(/^\s+/, '').replace(/\s+$/, '')
      if (name) {
        defaulted = name
        names[name] = name
      }
      i += 5
      while (text[i] == ' ') {
        i += 1
      }
    } else {
      i = 0
    }
    f = text[i]
    if (f == '"' || f == "'") {
      text = text.slice(i + 1)
      f = resolve(text.slice(0, text.indexOf(f)), file)
      if (order.indexOf(f) == -1) {
        exports[f] = {}
        order.push(f)
      }
      if (defaulted) {
        defaults[f] = defaulted
      }
      for (name in names) {
        exports[f][name] = names[name]
      }
    }
  }
  dependencies = false
  mods = []
  for (i = 0, length = order.length; i < length; i++) {
    f = order[i]
    if (!(f in texts)) {
      mods.push(f)
      if (!(f in modules)) {
        dependencies = true
      }
    }
  }
  if (dependencies) {
    modules[file] = mods
    return
  }
  declares = ['async', 'class', 'const', 'default', 'function', 'let', 'var']
  defines = ['\n', ' ', '(', ',', '.', '[']
  text = texta
  while ((i = text.indexOf('export ')) != -1) {
    text = text.slice(i + 7)
    if (text.indexOf('default ') == 0) {
      continue
    }
    for (i = 0; i < 7; i++) {
      name = declares[i]
      j = text.indexOf(name)
      if (j != -1 && j < 3) {
        text = text.slice(j + name.length)
      }
    }
    if ((i = text.indexOf('\n')) != -1) {
      variables = text.slice(0, i)
      i = 0
      length = variables.length
      while (i < length && variables[i] == ' ') {
        i += 1
      }
      split = []
      if (i < length && variables[i] == '{') {
        variables = variables.slice(i + 1)
        split = variables.slice(0, variables.indexOf('}')).split(',')
      } else {
        i = variables.indexOf('(')
        j = variables.indexOf('=')
        if (j == -1 || (i < j && i != -1)) {
          split.push(variables)
        } else {
          while (j != -1 && variables[j + 1] != '>') {
            split.push(variables.slice(0, j))
            variables = variables.slice(j)
            if ((j = variables.indexOf(',')) == -1) {
              break
            }
            variables = variables.slice(j)
            j = variables.indexOf('=')
          }
        }
      }
      for (i = 0, length = split.length; i < length; i++) {
        name = split[i]
        while (defines.indexOf(name[0]) != -1) {
          name = name.slice(1)
        }
        for (j = 0; j < 6; j++) {
          if ((k = name.indexOf(defines[j])) != -1) {
            name = name.slice(0, k)
          }
        }
        exports[file][name] = name
      }
    }
  }
  defaulted = ''
  text = texta
  for (f in exports) {
    path = f.slice(0, -3)
    split = path.split('')
    for (i = 0, length = split.length; i < length; i++) {
      if (base64.indexOf(split[i]) == -1) {
        split[i] = '_'
      }
    }
    path = split.join('')
    if (f == file) {
      defaulted = path
    }
    exported = exports[f]
    for (named in exported) {
      name = exported[named]
      if (f in defaults && defaults[f] == name) {
        text = substitute(name, '_' + path, text)
      } else {
        text = substitute(name, named + '_' + path, text)
      }
    }
  }
  lines = text.split('\n')
  text = ''
  for (i = 0, length = lines.length; i < length; i++) {
    line = lines[i]
    a = line.replace(/^\s+/, '')
    if (a.indexOf('export default ') == 0) {
      line = '_' + defaulted + ' = ' + a.slice(15)
    } else if (a.indexOf('export ') == 0) {
      line = a.slice(7)
      a = line.replace(/^\s+/, '')
      if (a[0] == '{') {
        continue
      }
    }
    if (line && a.indexOf('import ') != 0) {
      text += line + '\n'
    }
  }
  texts[file] = text
}

function build (file, output) {
  file = file || 'a/a.js'
  output = output || 'a/y.js'
  imported = []
  imports = [file]
  modules = {}
  texts = {}
  while (imports.length != 0) {
    file = imports[0]
    if (imported.indexOf(file) != -1) {
      imports.splice(0, 1)
    } else {
      parse(file, modules, texts)
      if (file in modules) {
        imports = modules[file].concat(imports)
      }
      if (file in texts) {
        imported.push(file)
        imports.splice(0, 1)
      }
    }
  }
  text = ''
  for (i = 0, length = imported.length; i < length; i++) {
    text += texts[imported[i]]
  }
  fs.writeFileSync(output, text)
}

build(process.argv[2], process.argv[3])