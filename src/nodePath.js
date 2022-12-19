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

export { updateNodePath }
