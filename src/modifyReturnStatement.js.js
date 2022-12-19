/* eslint-disable no-continue */
/* eslint-disable no-plusplus */
import {
  modifyImport,
  getImportStatement,
  cleanUpImportStatement,
} from './importStatement'
import { getReturnStatementProperties } from './returnStatement'
import { isPluginDisableForProperty } from './validateLazyload'
import { constructLazyActionCreator } from './constructLazyAction'

function calculateOriginalActionNameAndSpecifier(returnArgument) {
  // ArrowFunctionExpression|FunctionExpression|Identifier|MemberExpression
  let originalActionName
  let originalActionSpecifier

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
          // considering only one dispatch method will be in the callback
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
    return t.restElement(t.identifier('rest')) // passing reset operator for object type
  }
  return prop.node.value.params
}
function modifyReturnStatetmentWithDynamicImport(
  returnStatement,
  t,
  isMapDispatchToPropsObject
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
    const prop = properties[i] // ObjectProperty(key, value)
    if (isPluginDisableForProperty(prop)) continue

    const returnArgument = prop.get('value') // ArrowFunctionExpression|FunctionExpression|Identifier|MemberExpression

    const actionNameAsProp = prop.node.key.name
    const { originalActionName, originalActionSpecifier } =
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
    // let prog = path.findParent((p) => p.isProgram());
    // prog.node.body.push(modifiedFunction);
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

// eslint-disable-next-line import/prefer-default-export
export { modifyReturnStatetmentWithDynamicImport }
