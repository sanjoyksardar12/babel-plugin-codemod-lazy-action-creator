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
  // generating---> dispatch(addition(...rest))
  const customDispatchMethod = t.callExpression(t.identifier('dispatch'), [
    t.callExpression(functionName, [
      t.spreadElement(t.identifier(originalParams.argument.name)),
    ]),
  ])
  return customDispatchMethod
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
  // prog.node.body.push(outerFunction);
  return outerFunction
}

// eslint-disable-next-line import/prefer-default-export
export { constructLazyActionCreator }
