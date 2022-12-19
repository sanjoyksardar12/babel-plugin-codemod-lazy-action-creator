/* eslint-disable no-plusplus */
/* eslint-disable consistent-return */
import { getParentProgram } from './utils'
import { COMMENT_TYPE_REGEX } from './constants'

function isDisableFile(program) {
  for (let i = 0; program.node.body && i < program.node.body.length; i++) {
    const bodyElement = program.node.body[i]
    for (
      let j = 0;
      bodyElement.leadingComments && j < bodyElement.leadingComments.length;
      j++
    ) {
      const comment = bodyElement.leadingComments[j]
      const { type, value } = comment
      if (type === 'CommentBlock' && COMMENT_TYPE_REGEX.test(value.trim())) {
        return true
      }
    }
  }
}

function validateLazyload(path) {
  if (path.node.callee.name !== 'connect') {
    return false
  }
  if (isDisableFile(getParentProgram(path))) {
    return false
  }
  return true
}

function isPluginDisableForProperty(path) {
  return (path.node.leadingComments || []).filter(
    ({ type, value }) =>
      type === 'CommentBlock' && COMMENT_TYPE_REGEX.test(value)
  ).length
}

export { validateLazyload, isPluginDisableForProperty }
