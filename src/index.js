/* eslint-disable no-use-before-define */
const fs = require('fs')
const babelParser = require('@babel/parser')
const traverse = require('@babel/traverse').default

;('use strict')

exports.__esModule = true

exports.default = function ({ types: t }) {
  return {
    name: 'babel-plugin-codemod-lazy-action-creator',
    pre(state) {
      this.cache = new Map()
    },
    visitor: {
      CallExpression(path) {
        if (!isRequiredlazyLoad(path)) {
          return
        }
        
        const mapDispatchToPropsNode = getMapDispatchToPropsNode(path)
        if (isValidMapDispatchToProps(mapDispatchToPropsNode)) {
          return
        }

        let isMapDispatchToPropsObject = false

        let {
          returnStatement,
          aMDTPDecl,
          isConnectItselfContainingDeclaration,
        } = getReturnStatement(path, mapDispatchToPropsNode) //ObjectExpression|ArrowFunctionExpression|FunctionExpression

        if (!returnStatement) {
          return
        }
        if (returnStatement.node.type === 'ObjectExpression') {
          isMapDispatchToPropsObject = true
        }
        // if(isConnectItselfContainingDeclaration){
        //   isMapDispatchToPropsObject = true;
        // }
        if (
          !isMapDispatchToPropsObject &&
          returnStatement.node.argument.type !== 'ObjectExpression'
        ) {
          return
        }
        modifyReturnStatetmentWithDynamicImport(
          returnStatement,
          t,
          isMapDispatchToPropsObject,
          path
        )
        updateNodePath(
          aMDTPDecl !== undefined
            ? !['ArrowFunctionExpression', 'FunctionDeclaration'].includes(
                aMDTPDecl.node.type
              )
            : isMapDispatchToPropsObject,
          isConnectItselfContainingDeclaration,
          t,
          aMDTPDecl,
          path
        )
      },
    },
    post(state) {},
  }
}

const COMMENT_TYPE_REGEX =
  /\s*babel\s+lazy\-codemod\-action\-creator\:\s+\"disable\"\s*/

const SPECIFIER_TYPES = {
  ImportDefaultSpecifier: 'ImportDefaultSpecifier',
  ImportNamespaceSpecifier: 'ImportNamespaceSpecifier',
  ImportSpecifier: 'ImportSpecifier',
}

function updateNodePath(
  isMapDispatchToPropsObject,
  isConnectItselfContainingDeclaration,
  t,
  aMDTPDecl,
  path
) {
  if (isMapDispatchToPropsObject && !isConnectItselfContainingDeclaration) {
    const returnStatement = t.returnStatement(aMDTPDecl.node.init)
    const BlockStatement = t.blockStatement([returnStatement])
    const arrowFunction = t.arrowFunctionExpression(
      [t.identifier('dispatch')],
      BlockStatement
    )
    const mdp = t.variableDeclarator(aMDTPDecl.node.id, arrowFunction)
    aMDTPDecl.replaceWith(mdp)
  } else if (
    isMapDispatchToPropsObject &&
    isConnectItselfContainingDeclaration
  ) {
    const arrowFuncBody = t.arrowFunctionExpression(
      [t.identifier('dispatch')],
      path.node.arguments[1]
    )
    const duplicateConnect = t.callExpression(t.identifier('connect'), [
      path.node.arguments[0],
      arrowFuncBody,
    ])
    path.parentPath.node[path.key] = duplicateConnect
  }
}

function getReturnStatementProperties(
  returnStatement,
  isMapDispatchToPropsObject
) {
  if (!isMapDispatchToPropsObject) {
    return returnStatement.get('argument').get('properties')
  }
  return returnStatement.get('properties')
}
function calculateOriginalActionNameAndSpecifier(returnArgument) {
  // ArrowFunctionExpression|FunctionExpression|Identifier|MemberExpression
  let originalActionName, originalActionSpecifier
  switch (returnArgument.node.type) {
    case 'Identifier': {
      originalActionName = returnArgument.node.name
      originalActionSpecifier = returnArgument.node.name
      break
    }
    case 'MemberExpression': {
      originalActionName = returnArgument.node.object.name
      originalActionSpecifier = returnArgument.node.property.name
      break
    }
    case 'FunctionExpression':
    case 'ArrowFunctionExpression': {
      returnArgument.traverse({
        CallExpression(dispatchNode) {
          //considering only one dispatch method will be in the callback
          if (dispatchNode.node.callee.name !== 'dispatch') {
            return
          }
          const actionCallNode = dispatchNode.get('arguments')[0]
          const { callee } = actionCallNode.node
          if (callee.type === 'Identifier') {
            originalActionName = callee.name
          } else if (callee.type === 'MemberExpression') {
            // if(callee.object.type=== "MemberExpression"){
            //   originalActionName = callee.object.object.name;
            //   originalActionSpecifier = callee.object.property.name;
            // }else {
            originalActionName = callee.object.name
            originalActionSpecifier = callee.property.name
            // }
          }
        },
      })
      break
    }
    default:
  }
  return {
    originalActionName,
    originalActionSpecifier,
  }
}
function getOriginalParams(t, prop, isMapDispatchToPropsObject) {
  if (isMapDispatchToPropsObject) {
    return t.restElement(t.identifier('rest')) //passing reset operator for object type
  }
  return prop.node.value.params
}

// file- modifyReturnStatement.js
function modifyReturnStatetmentWithDynamicImport(
  returnStatement,
  t,
  isMapDispatchToPropsObject,
  path
) {
  let properties = getReturnStatementProperties(
    returnStatement,
    isMapDispatchToPropsObject
  ) // [ObjectProperty(key, value)]
  for (let i = 0; i < properties.length; i++) {
    const prop = properties[i]

    if (
      prop.node.type === 'SpreadElement' &&
      prop.node.argument.type === 'Identifier'
    ) {
      modifyImport(prop, t)
      prop.remove()
    }
  }
  properties = getReturnStatementProperties(
    returnStatement,
    isMapDispatchToPropsObject
  ) // [ObjectProperty(key, value)]
  for (let i = 0; i < properties.length; i++) {
    let prop = properties[i] //ObjectProperty(key, value)
    if (isPluginDisableForProperty(prop)) {
      continue
    }

    const returnArgument = prop.get('value') //ArrowFunctionExpression|FunctionExpression|Identifier|MemberExpression

    const actionNameAsProp = prop.node.key.name
    let { originalActionName, originalActionSpecifier } =
      calculateOriginalActionNameAndSpecifier(returnArgument)

    const { importStatement, specifierType, specifier, namedImport } =
      getImportStatement(returnStatement, originalActionName)

    const originalParams = getOriginalParams(
      t,
      prop,
      isMapDispatchToPropsObject
    )
    
    const modifiedFunction = constructLazyActionCreator(
      t,
      returnStatement,
      originalParams,
      prop,
      originalActionName,
      importStatement,
      specifierType,
      specifier,
      originalActionSpecifier,
      namedImport,
      isMapDispatchToPropsObject
    )

    cleanUpImportStatement(importStatement, originalActionName)
    //let prog = path.findParent((p) => p.isProgram());
    //prog.node.body.push(modifiedFunction);
    if (true) {
      prop.node.value = modifiedFunction
    } else {
      returnStatement.traverse({
        ObjectExpression(innerPath) {
          const objectProperty = t.objectProperty(
            t.identifier(actionNameAsProp),
            modifiedFunction
          )
          innerPath.node.properties[i] = objectProperty
        },
      })
    }
  }
}

// file- modifyImport.js
function modifyImport(path, t) {
  let spreadElementName = path.node.argument.name
  const { importStatement, specifierType, specifier, namedImport } =
    getImportStatement(path, spreadElementName)
  // replaceSpecifier(importStatement, specifier, path, t);
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
function updateImportDeclaration(importStatement, identifier, t) {
  importStatement.node.specifiers.push(
    t.importSpecifier(t.identifier(identifier), t.identifier(identifier))
  )
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
  let exportedNamedDeclarations = []

  traverse(importFileContentAsAst, {
    ExportNamedDeclaration: function ({ node }) {
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

function getImportFileAbsolutePath(importStatement, spreadElement) {
  const currentFilePath = spreadElement.hub.file.opts.filename
  const importFileRelativePath = importStatement.node.source.value
  const currentDir = path.dirname(currentFilePath)
  const importFileAbsolutePath = path.join(currentDir, importFileRelativePath)

  return importFileAbsolutePath
}

function isPluginDisableForProperty(path) {
  return (path.node.leadingComments || []).filter(
    ({ type, value }) =>
      type === 'CommentBlock' && COMMENT_TYPE_REGEX.test(value)
  ).length
}

function getImportedFileContent(importFileAbsolutePath) {
  return fs.readFileSync(importFileAbsolutePath, 'utf-8')
}

function constructLazyActionCreator(
  t,
  path,
  originalParams,
  prop,
  originalActionName,
  importStatement,
  specifierType,
  specifier,
  originalActionSpecifier,
  namedImport,
  isMapDispatchToPropsObject
) {
  const filename = importStatement.node.source.value
  const importState = t.memberExpression(
    t.callExpression(t.import(), [t.stringLiteral(filename)]),
    t.identifier('then')
  )
  // let prog = path.findParent((p) => p.isProgram());
  // prog.node.body.push(importState);
  let objectState
  let keyname = originalActionName
  if (specifierType === 'ImportSpecifier') {
    keyname = namedImport
  } else if (specifierType === 'ImportDefaultSpecifier') {
    keyname = 'default'
  }
  if (specifierType === 'ImportNamespaceSpecifier') {
    objectState = t.identifier(originalActionName)
  } else {
    objectState = t.objectPattern([
      t.objectProperty(t.identifier(keyname), t.identifier(originalActionName)),
    ])
  }

  const arrowFuncBody = getActionDispatcherBody(
    t,
    prop,
    isMapDispatchToPropsObject,
    originalParams,
    originalActionName,
    originalActionSpecifier,
    specifierType
  )

  const args = t.arrowFunctionExpression([objectState], arrowFuncBody)
  const returnStatement = t.callExpression(importState, [args])
  const params = isMapDispatchToPropsObject ? [originalParams] : originalParams
  const outerFunction = t.arrowFunctionExpression(params, returnStatement)
  // let prog = path.findParent((p) => p.isProgram());
  //prog.node.body.push(outerFunction);
  return outerFunction
}

function getActionDispatcherBody(
  t,
  prop,
  isMapDispatchToPropsObject,
  originalParams,
  originalActionName,
  originalActionSpecifier,
  specifierType
) {
  if (!isMapDispatchToPropsObject) {
    return prop.node.value.body
  }
  let functionName = t.identifier(originalActionName)
  if (specifierType === 'ImportNamespaceSpecifier') {
    functionName = t.memberExpression(
      functionName,
      t.identifier(originalActionSpecifier)
    )
  }
  //generating---> dispatch(addition(...rest))
  const customDispatchMethod = t.callExpression(t.identifier('dispatch'), [
    t.callExpression(functionName, [
      t.spreadElement(t.identifier(originalParams.argument.name)),
    ]),
  ])
  return customDispatchMethod
}

function cleanUpImportStatement(importStatement, actionName) {
  //stop traversal as soon as action name is matched
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
function getImportStatement(path, requiredSpecifierName) {
  const program = path.findParent((p) => p.isProgram())
  const programBody = program.get('body')

  const importDeclarations = programBody.filter(
    (path) => path.node.type === 'ImportDeclaration'
  )

  let importStatement, specifierType, matchedSpecifier, namedImport

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
    namedImport: namedImport,
  }
}

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

// file- lazyloadvalidation.js
//start
function isRequiredlazyLoad(path) {
  if (path.node.callee.name !== 'connect') {
    return false
  }
  if (isDisableFile(getParentProgram(path))) {
    return false
  }
  return true
}

// file- utils.js
function getParentProgram(path) {
  return path.findParent((p) => p.isProgram())
}

// file- disability.js
function isDisableFile(program) {
  for (let i = 0; program.node.body && i < program.node.body.length; i++) {
    const bodyElement = program.node.body[i]
    for (
      let j = 0;
      bodyElement.leadingComments && j < bodyElement.leadingComments.length;
      j++
    ) {
      let comment = bodyElement.leadingComments[j]
      const { type, value } = comment
      if (type === 'CommentBlock' && COMMENT_TYPE_REGEX.test(value.trim())) {
        return true
      }
    }
  }
}

//path=> connect statement
//return= second params name in connect statement as node
function getMapDispatchToPropsNode(path) {
  const args = path.get('arguments')
  if (args.length > 1) {
    return args[1]
  }
  return undefined
}

// file- validateMapDispatchToProps.js
//mapDispatchToPropsNode=> connect expression's 2nd parameter as node
function isValidMapDispatchToProps(mapDispatchToPropsNode) {
  return (
    !mapDispatchToPropsNode ||
    mapDispatchToPropsNode.isNullLiteral() ||
    mapDispatchToPropsNode.node.name === 'undefined'
  )
}
// file- returnStatement.js
//refactor this code using switch
//path=> connect statement
//mapDispatchToPropsNode => connect expression's 2nd parameter as node
function getReturnStatement(path, mapDispatchToPropsNode) {
  switch (mapDispatchToPropsNode.node.type) {
    case 'ObjectExpression': {
      return {
        returnStatement: mapDispatchToPropsNode,
        isConnectItselfContainingDeclaration: true,
        aMDTPDecl: undefined,
      }
    }
    case 'Identifier': {
      const mapDispatchToPropsName = mapDispatchToPropsNode.node.name
      const program = getParentProgram(path)
      let aMDTPDecl = getActualMapDispToPropsDeclaration(
        program,
        mapDispatchToPropsName
      )

      if (aMDTPDecl.node.type === 'VariableDeclarator') {
        const declaratorValue = aMDTPDecl.get('init')
        const {
          node: { type: declaratorValueType },
        } = declaratorValue
        if (declaratorValueType === 'ObjectExpression') {
          return {
            returnStatement: declaratorValue,
            isConnectItselfContainingDeclaration: false,
            aMDTPDecl: aMDTPDecl,
          }
        } else if (
          [
            'ArrowFunctionExpression',
            'FunctionDeclaration',
            'FunctionExpression',
          ].includes(declaratorValueType)
        ) {
          return getReturnStatementFromFunctionDeclaration(declaratorValue)
        }
      } else if (aMDTPDecl.node.type === 'FunctionDeclaration') {
        return getReturnStatementFromFunctionDeclaration(aMDTPDecl)
      }
    }
  }
}

function getReturnStatementFromFunctionDeclaration(funcDeclaration) {
  const funcBody = funcDeclaration.get('body')
  const returnStatement = getFunctionsReturnStatement(funcBody)
  return {
    returnStatement: returnStatement,
    isConnectItselfContainingDeclaration: false,
    aMDTPDecl: funcDeclaration,
  }
}

function getFunctionsReturnStatement(funcBody) {
  switch (funcBody.node.type) {
    case 'ObjectExpression': {
      return funcBody
    }
    case 'BlockStatement': {
      const blockStatements = funcBody.get('body')
      return blockStatements.filter(
        ({ node: { type } }) => type === 'ReturnStatement'
      )[0]
    }
  }
}

function getActualMapDispToPropsDeclaration(program, mapDispatchToPropsName) {
  const declarations = getRootLevelVariablesAndFunctions(program)
  for (let i = 0; i < declarations.length; i++) {
    const declaration = declarations[i]
    if (declaration.node.type === 'VariableDeclaration') {
      const declarators = declaration.get('declarations')
      for (let j = 0; j < declarators.length; j++) {
        const declarator = declarators[j]
        if (declarator.node.id.name === mapDispatchToPropsName) {
          return declarator
        }
      }
    } else if (declaration.node.type === 'FunctionDeclaration') {
      if (declaration.node.id.name === mapDispatchToPropsName) {
        return declaration
      }
    }
  }
}

function getRootLevelVariablesAndFunctions(program) {
  const progBody = program.get('body')
  return progBody.filter(
    ({ node: { type } }) =>
      type === 'VariableDeclaration' || type === 'FunctionDeclaration'
  )
}
