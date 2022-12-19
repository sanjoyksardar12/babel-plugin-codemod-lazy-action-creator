// path=> connect statement
// return= second params name in connect statement as node
function getMapDispatchToPropsNode(path) {
  const args = path.get('arguments')
  if (args.length > 1) {
    return args[1]
  }
  return undefined
}

// eslint-disable-next-line import/prefer-default-export
export { getMapDispatchToPropsNode }
