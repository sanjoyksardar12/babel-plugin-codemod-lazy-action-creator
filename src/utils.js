// eslint-disable-next-line import/prefer-default-export
export function getParentProgram(path) {
  return path.findParent((p) => p.isProgram())
}
