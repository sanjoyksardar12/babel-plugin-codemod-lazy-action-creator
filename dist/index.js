"use strict";

/* eslint-disable no-unused-expressions */
/* eslint-disable no-use-before-define */
// eslint-disable-next-line import/no-import-module-exports
var _require = require('./nodePath'),
  updateNodePath = _require.updateNodePath;
var _require2 = require('./validateLazyload'),
  validateLazyload = _require2.validateLazyload;
var _require3 = require('./mapDispatchToProps/getMapDispatchToPropsNode'),
  getMapDispatchToPropsNode = _require3.getMapDispatchToPropsNode;
var _require4 = require('./returnStatement'),
  getReturnStatement = _require4.getReturnStatement;
var _require5 = require('./modifyReturnStatement.js'),
  modifyReturnStatetmentWithDynamicImport = _require5.modifyReturnStatetmentWithDynamicImport;
var _require6 = require('./mapDispatchToProps/validate'),
  isValidMapDispatchToProps = _require6.isValidMapDispatchToProps;
exports["default"] = function (_ref) {
  var t = _ref.types;
  return {
    name: 'babel-plugin-codemod-lazy-action-creator',
    visitor: {
      CallExpression: function CallExpression(path) {
        if (!validateLazyload(path)) {
          return;
        }
        var mapDispatchToPropsNode = getMapDispatchToPropsNode(path);
        if (isValidMapDispatchToProps(mapDispatchToPropsNode)) {
          return;
        }
        var isMapDispatchToPropsObject = false;
        var _getReturnStatement = getReturnStatement(path, mapDispatchToPropsNode),
          returnStatement = _getReturnStatement.returnStatement,
          aMDTPDecl = _getReturnStatement.aMDTPDecl,
          isConnectItselfContainingDeclaration = _getReturnStatement.isConnectItselfContainingDeclaration; // ObjectExpression|ArrowFunctionExpression|FunctionExpression

        if (!returnStatement) {
          return;
        }
        if (returnStatement.node.type === 'ObjectExpression') {
          isMapDispatchToPropsObject = true;
        }
        // if(isConnectItselfContainingDeclaration){
        //   isMapDispatchToPropsObject = true;
        // }
        if (!isMapDispatchToPropsObject && returnStatement.node.argument.type !== 'ObjectExpression') {
          return;
        }
        modifyReturnStatetmentWithDynamicImport(returnStatement, t, isMapDispatchToPropsObject);
        updateNodePath(aMDTPDecl !== undefined ? !['ArrowFunctionExpression', 'FunctionDeclaration'].includes(aMDTPDecl.node.type) : isMapDispatchToPropsObject, isConnectItselfContainingDeclaration, t, aMDTPDecl, path);
      }
    }
  };
};