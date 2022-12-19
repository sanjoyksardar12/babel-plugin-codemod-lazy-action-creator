/* eslint-disable no-unused-expressions */
/* eslint-disable no-use-before-define */
// eslint-disable-next-line import/no-import-module-exports
const { updateNodePath } = require('./nodePath')
const { validateLazyload } = require('./validateLazyload')
const {
  getMapDispatchToPropsNode,
} = require('./mapDispatchToProps/getMapDispatchToPropsNode')
const { getReturnStatement } = require('./returnStatement')
const {
  modifyReturnStatetmentWithDynamicImport,
} = require('./modifyReturnStatement.js')
const { isValidMapDispatchToProps } = require('./mapDispatchToProps/validate')

exports.default = function ({ types: t }) {
  return {
    name: 'babel-plugin-codemod-lazy-action-creator',
    visitor: {
      CallExpression(path) {
        if (!validateLazyload(path)) {
          return
        }
        const mapDispatchToPropsNode = getMapDispatchToPropsNode(path)
        if (isValidMapDispatchToProps(mapDispatchToPropsNode)) {
          return
        }

        let isMapDispatchToPropsObject = false

        const {
          returnStatement,
          aMDTPDecl,
          isConnectItselfContainingDeclaration,
        } = getReturnStatement(path, mapDispatchToPropsNode) // ObjectExpression|ArrowFunctionExpression|FunctionExpression

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
          isMapDispatchToPropsObject
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
  }
}
