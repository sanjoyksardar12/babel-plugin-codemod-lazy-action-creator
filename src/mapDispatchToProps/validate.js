// file- validateMapDispatchToProps.js
// mapDispatchToPropsNode=> connect expression's 2nd parameter as node
function isValidMapDispatchToProps(mapDispatchToPropsNode) {
  return (
    !mapDispatchToPropsNode ||
    mapDispatchToPropsNode.isNullLiteral() ||
    mapDispatchToPropsNode.node.name === 'undefined'
  )
}

// eslint-disable-next-line import/prefer-default-export
export { isValidMapDispatchToProps }
