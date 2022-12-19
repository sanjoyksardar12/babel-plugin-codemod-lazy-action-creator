/* eslint-disable consistent-return */
/* eslint-disable no-plusplus */
const { getParentProgram } = require('./utils')

function getFunctionsReturnStatement(funcBody) {
  // eslint-disable-next-line default-case
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

function getReturnStatementFromFunctionDeclaration(funcDeclaration) {
  const funcBody = funcDeclaration.get('body')
  const returnStatement = getFunctionsReturnStatement(funcBody)
  return {
    returnStatement,
    isConnectItselfContainingDeclaration: false,
    aMDTPDecl: funcDeclaration,
  }
}

function getRootLevelVariablesAndFunctions(program) {
  const progBody = program.get('body')
  return progBody.filter(
    ({ node: { type } }) =>
      type === 'VariableDeclaration' || type === 'FunctionDeclaration'
  )
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

// FIXME:  add proper comments
// path=> connect statement
// mapDispatchToPropsNode => connect expression's 2nd parameter as node
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
      const aMDTPDecl = getActualMapDispToPropsDeclaration(
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
            aMDTPDecl,
          }
          // eslint-disable-next-line no-else-return
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
      return {}
    }
    default:
      return {}
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

exports.getReturnStatement = getReturnStatement
exports.getReturnStatementProperties = getReturnStatementProperties
