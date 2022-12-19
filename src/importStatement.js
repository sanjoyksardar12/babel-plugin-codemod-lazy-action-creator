/* eslint-disable no-shadow */
/* eslint-disable no-plusplus */
import { SPECIFIER_TYPES } from './constants'

const path = require('path')
const fs = require('fs')
const babelParser = require('@babel/parser')
const traverse = require('@babel/traverse').default

function isSpecifierContainRequiredSpecifier(specifier, requiredSpecifierName) {
  const { local, imported } = specifier
  let status = false
  switch (specifier.type) {
    case SPECIFIER_TYPES.ImportDefaultSpecifier:
    case SPECIFIER_TYPES.ImportNamespaceSpecifier:
    case SPECIFIER_TYPES.ImportSpecifier: {
      status = local.name === requiredSpecifierName
      break
    }
    default: {
      status = false
    }
  }
  return {
    status,
    specifierType: specifier.type,
    namedImport: imported ? imported.name : null,
  }
}

function getImportStatement(path, requiredSpecifierName) {
  const program = path.findParent((p) => p.isProgram())
  const programBody = program.get('body')

  const importDeclarations = programBody.filter(
    (path) => path.node.type === 'ImportDeclaration'
  )

  let importStatement
  let specifierType
  let matchedSpecifier
  let namedImport

  for (let i = 0; i < importDeclarations.length; i++) {
    const importDeclaration = importDeclarations[i]
    const specifiersNode = importDeclaration.node.specifiers

    if (specifiersNode && specifiersNode.length) {
      for (let i = 0; i < specifiersNode.length; i++) {
        const specifier = specifiersNode[i]
        const {
          specifierType: specType,
          status,
          namedImport: originalNamedImport,
        } = isSpecifierContainRequiredSpecifier(
          specifier,
          requiredSpecifierName
        )
        if (status) {
          importStatement = importDeclaration
          specifierType = specType
          matchedSpecifier = specifier
          namedImport = originalNamedImport
          break
        }
      }
    }
  }
  return {
    importStatement,
    specifierType,
    specifier: matchedSpecifier,
    namedImport,
  }
}
function getImportFileAbsolutePath(importStatement, spreadElement) {
  const currentFilePath = spreadElement.hub.file.opts.filename
  const importFileRelativePath = importStatement.node.source.value
  const currentDir = path.dirname(currentFilePath)
  const importFileAbsolutePath = path.join(currentDir, importFileRelativePath)

  return importFileAbsolutePath
}

function getImportedFileContent(importFileAbsolutePath) {
  return fs.readFileSync(importFileAbsolutePath, 'utf-8')
}

function getExportedFunctionsName(importStatement, spreadElement) {
  const importFileAbsolutePath = getImportFileAbsolutePath(
    importStatement,
    spreadElement
  )
  const importFileContent = getImportedFileContent(importFileAbsolutePath)
  const importFileContentAsAst = babelParser.parse(importFileContent, {
    sourceType: 'module',
  })
  const exportedNamedDeclarations = []

  traverse(importFileContentAsAst, {
    ExportNamedDeclaration({ node }) {
      let exportedFuncName
      if (node.declaration.type === 'FunctionDeclaration') {
        exportedFuncName = node.declaration.id.name
      } else if (node.declaration.type === 'VariableDeclaration') {
        exportedFuncName = node.declaration.declarations[0].id.name
      }
      exportedNamedDeclarations.push(exportedFuncName)
    },
  })
  return exportedNamedDeclarations
}

function updateImportDeclaration(importStatement, identifier, t) {
  importStatement.node.specifiers.push(
    t.importSpecifier(t.identifier(identifier), t.identifier(identifier))
  )
}

function removeSpecifierHandler(importStatement, specifierPath, actionName) {
  if (specifierPath.node.local.name === actionName) {
    if (
      importStatement.node.specifiers &&
      importStatement.node.specifiers.length === 1
    ) {
      importStatement.remove()
    } else {
      specifierPath.remove()
    }
  }
}

function cleanUpImportStatement(importStatement, actionName) {
  // stop traversal as soon as action name is matched
  importStatement.traverse({
    ImportDefaultSpecifier(specifierPath) {
      removeSpecifierHandler(importStatement, specifierPath, actionName)
    },
    ImportSpecifier(specifierPath) {
      removeSpecifierHandler(importStatement, specifierPath, actionName)
    },
    ImportNamespaceSpecifier(specifierPath) {
      removeSpecifierHandler(importStatement, specifierPath, actionName)
    },
  })
}

function replaceSpecifier(importStatement, specifier, spreadElement, t) {
  const exportedNamedDeclarations = getExportedFunctionsName(
    importStatement,
    spreadElement
  )
  exportedNamedDeclarations.forEach((identifier) => {
    const property = t.objectProperty(
      t.identifier(identifier),
      t.identifier(identifier)
    )
    spreadElement.parentPath.node.properties.push(property)
    updateImportDeclaration(importStatement, identifier, t)
  })
  cleanUpImportStatement(importStatement, spreadElement.node.argument.name)
}

// eslint-disable-next-line import/prefer-default-export
function modifyImport(path, t) {
  const spreadElementName = path.node.argument.name
  const { importStatement, specifier } = getImportStatement(
    path,
    spreadElementName
  )

  replaceSpecifier(importStatement, specifier, path, t)
}

export { modifyImport, getImportStatement, cleanUpImportStatement }
