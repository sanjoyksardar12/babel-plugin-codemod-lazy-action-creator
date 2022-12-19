"use strict";

/* eslint-disable no-use-before-define */
// var fs = require('fs');
// var babelParser = require('@babel/parser');
// var traverse = require('@babel/traverse')["default"];
'use strict';
exports.__esModule = true;
exports["default"] = function (_ref) {
  var t = _ref.types;
  return {
    name: 'babel-plugin-codemod-lazy-action-creator',
    pre: function pre(state) {
      this.cache = new Map();
    },
    visitor: {
      CallExpression: function CallExpression(path) {
        if (!isRequiredlazyLoad(path)) {
          return;
        }
        debugger;
        var mapDispatchToPropsNode = getMapDispatchToPropsNode(path);
        if (isValidMapDispatchToProps(mapDispatchToPropsNode)) {
          return;
        }
        var isMapDispatchToPropsObject = false;
        var _getReturnStatement = getReturnStatement(path, mapDispatchToPropsNode),
          returnStatement = _getReturnStatement.returnStatement,
          aMDTPDecl = _getReturnStatement.aMDTPDecl,
          isConnectItselfContainingDeclaration = _getReturnStatement.isConnectItselfContainingDeclaration; //ObjectExpression|ArrowFunctionExpression|FunctionExpression

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
        modifyReturnStatetmentWithDynamicImport(returnStatement, t, isMapDispatchToPropsObject, path);
        updateNodePath(aMDTPDecl !== undefined ? !['ArrowFunctionExpression', 'FunctionDeclaration'].includes(aMDTPDecl.node.type) : isMapDispatchToPropsObject, isConnectItselfContainingDeclaration, t, aMDTPDecl, path);
      }
    },
    post: function post(state) {}
  };
};
var COMMENT_TYPE_REGEX = /\s*babel\s+lazy\-codemod\-action\-creator\:\s+\"disable\"\s*/;
var SPECIFIER_TYPES = {
  ImportDefaultSpecifier: 'ImportDefaultSpecifier',
  ImportNamespaceSpecifier: 'ImportNamespaceSpecifier',
  ImportSpecifier: 'ImportSpecifier'
};
function updateNodePath(isMapDispatchToPropsObject, isConnectItselfContainingDeclaration, t, aMDTPDecl, path) {
  if (isMapDispatchToPropsObject && !isConnectItselfContainingDeclaration) {
    var returnStatement = t.returnStatement(aMDTPDecl.node.init);
    var BlockStatement = t.blockStatement([returnStatement]);
    var arrowFunction = t.arrowFunctionExpression([t.identifier('dispatch')], BlockStatement);
    var mdp = t.variableDeclarator(aMDTPDecl.node.id, arrowFunction);
    aMDTPDecl.replaceWith(mdp);
  } else if (isMapDispatchToPropsObject && isConnectItselfContainingDeclaration) {
    var arrowFuncBody = t.arrowFunctionExpression([t.identifier('dispatch')], path.node.arguments[1]);
    var duplicateConnect = t.callExpression(t.identifier('connect'), [path.node.arguments[0], arrowFuncBody]);
    path.parentPath.node[path.key] = duplicateConnect;
  }
}
function getReturnStatementProperties(returnStatement, isMapDispatchToPropsObject) {
  if (!isMapDispatchToPropsObject) {
    return returnStatement.get('argument').get('properties');
  }
  return returnStatement.get('properties');
}
function calculateOriginalActionNameAndSpecifier(returnArgument) {
  // ArrowFunctionExpression|FunctionExpression|Identifier|MemberExpression
  var originalActionName, originalActionSpecifier;
  switch (returnArgument.node.type) {
    case 'Identifier':
      {
        originalActionName = returnArgument.node.name;
        originalActionSpecifier = returnArgument.node.name;
        break;
      }
    case 'MemberExpression':
      {
        originalActionName = returnArgument.node.object.name;
        originalActionSpecifier = returnArgument.node.property.name;
        break;
      }
    case 'FunctionExpression':
    case 'ArrowFunctionExpression':
      {
        returnArgument.traverse({
          CallExpression: function CallExpression(dispatchNode) {
            //considering only one dispatch method will be in the callback
            if (dispatchNode.node.callee.name !== 'dispatch') {
              return;
            }
            var actionCallNode = dispatchNode.get('arguments')[0];
            var callee = actionCallNode.node.callee;
            if (callee.type === 'Identifier') {
              originalActionName = callee.name;
            } else if (callee.type === 'MemberExpression') {
              // if(callee.object.type=== "MemberExpression"){
              //   originalActionName = callee.object.object.name;
              //   originalActionSpecifier = callee.object.property.name;
              // }else {
              originalActionName = callee.object.name;
              originalActionSpecifier = callee.property.name;
              // }
            }
          }
        });

        break;
      }
    default:
  }
  return {
    originalActionName: originalActionName,
    originalActionSpecifier: originalActionSpecifier
  };
}
function getOriginalParams(t, prop, isMapDispatchToPropsObject) {
  if (isMapDispatchToPropsObject) {
    return t.restElement(t.identifier('rest')); //passing reset operator for object type
  }

  return prop.node.value.params;
}

// file- modifyReturnStatement.js
function modifyReturnStatetmentWithDynamicImport(returnStatement, t, isMapDispatchToPropsObject, path) {
  var properties = getReturnStatementProperties(returnStatement, isMapDispatchToPropsObject); // [ObjectProperty(key, value)]
  for (var i = 0; i < properties.length; i++) {
    var prop = properties[i];
    if (prop.node.type === 'SpreadElement' && prop.node.argument.type === 'Identifier') {
      modifyImport(prop, t);
      prop.remove();
    }
  }
  properties = getReturnStatementProperties(returnStatement, isMapDispatchToPropsObject); // [ObjectProperty(key, value)]
  var _loop = function _loop(_i) {
    var prop = properties[_i]; //ObjectProperty(key, value)
    if (isPluginDisableForProperty(prop)) {
      return "continue";
    }
    var returnArgument = prop.get('value'); //ArrowFunctionExpression|FunctionExpression|Identifier|MemberExpression

    var actionNameAsProp = prop.node.key.name;
    var _calculateOriginalAct = calculateOriginalActionNameAndSpecifier(returnArgument),
      originalActionName = _calculateOriginalAct.originalActionName,
      originalActionSpecifier = _calculateOriginalAct.originalActionSpecifier;
    var _getImportStatement = getImportStatement(returnStatement, originalActionName),
      importStatement = _getImportStatement.importStatement,
      specifierType = _getImportStatement.specifierType,
      specifier = _getImportStatement.specifier,
      namedImport = _getImportStatement.namedImport;
    var originalParams = getOriginalParams(t, prop, isMapDispatchToPropsObject);
    debugger;
    var modifiedFunction = constructLazyActionCreator(t, returnStatement, originalParams, prop, originalActionName, importStatement, specifierType, specifier, originalActionSpecifier, namedImport, isMapDispatchToPropsObject);
    cleanUpImportStatement(importStatement, originalActionName);
    //let prog = path.findParent((p) => p.isProgram());
    //prog.node.body.push(modifiedFunction);
    if (true) {
      prop.node.value = modifiedFunction;
    } else {
      returnStatement.traverse({
        ObjectExpression: function ObjectExpression(innerPath) {
          var objectProperty = t.objectProperty(t.identifier(actionNameAsProp), modifiedFunction);
          innerPath.node.properties[_i] = objectProperty;
        }
      });
    }
  };
  for (var _i = 0; _i < properties.length; _i++) {
    var _ret = _loop(_i);
    if (_ret === "continue") continue;
  }
}

// file- modifyImport.js
function modifyImport(path, t) {
  var spreadElementName = path.node.argument.name;
  var _getImportStatement2 = getImportStatement(path, spreadElementName),
    importStatement = _getImportStatement2.importStatement,
    specifierType = _getImportStatement2.specifierType,
    specifier = _getImportStatement2.specifier,
    namedImport = _getImportStatement2.namedImport;
  // replaceSpecifier(importStatement, specifier, path, t);
}

function replaceSpecifier(importStatement, specifier, spreadElement, t) {
  var exportedNamedDeclarations = getExportedFunctionsName(importStatement, spreadElement);
  exportedNamedDeclarations.forEach(function (identifier) {
    var property = t.objectProperty(t.identifier(identifier), t.identifier(identifier));
    spreadElement.parentPath.node.properties.push(property);
    updateImportDeclaration(importStatement, identifier, t);
  });
  cleanUpImportStatement(importStatement, spreadElement.node.argument.name);
}
function updateImportDeclaration(importStatement, identifier, t) {
  importStatement.node.specifiers.push(t.importSpecifier(t.identifier(identifier), t.identifier(identifier)));
}
function getExportedFunctionsName(importStatement, spreadElement) {
  var importFileAbsolutePath = getImportFileAbsolutePath(importStatement, spreadElement);
  var importFileContent = getImportedFileContent(importFileAbsolutePath);
  var importFileContentAsAst = babelParser.parse(importFileContent, {
    sourceType: 'module'
  });
  var exportedNamedDeclarations = [];
  traverse(importFileContentAsAst, {
    ExportNamedDeclaration: function ExportNamedDeclaration(_ref2) {
      var node = _ref2.node;
      var exportedFuncName;
      if (node.declaration.type === 'FunctionDeclaration') {
        exportedFuncName = node.declaration.id.name;
      } else if (node.declaration.type === 'VariableDeclaration') {
        exportedFuncName = node.declaration.declarations[0].id.name;
      }
      exportedNamedDeclarations.push(exportedFuncName);
    }
  });
  return exportedNamedDeclarations;
}
function getImportFileAbsolutePath(importStatement, spreadElement) {
  var currentFilePath = spreadElement.hub.file.opts.filename;
  var importFileRelativePath = importStatement.node.source.value;
  var currentDir = path.dirname(currentFilePath);
  var importFileAbsolutePath = path.join(currentDir, importFileRelativePath);
  return importFileAbsolutePath;
}
function isPluginDisableForProperty(path) {
  return (path.node.leadingComments || []).filter(function (_ref3) {
    var type = _ref3.type,
      value = _ref3.value;
    return type === 'CommentBlock' && COMMENT_TYPE_REGEX.test(value);
  }).length;
}
function getImportedFileContent(importFileAbsolutePath) {
  return fs.readFileSync(importFileAbsolutePath, 'utf-8');
}
function constructLazyActionCreator(t, path, originalParams, prop, originalActionName, importStatement, specifierType, specifier, originalActionSpecifier, namedImport, isMapDispatchToPropsObject) {
  var filename = importStatement.node.source.value;
  var importState = t.memberExpression(t.callExpression(t["import"](), [t.stringLiteral(filename)]), t.identifier('then'));
  // let prog = path.findParent((p) => p.isProgram());
  // prog.node.body.push(importState);
  var objectState;
  var keyname = originalActionName;
  if (specifierType === 'ImportSpecifier') {
    keyname = namedImport;
  } else if (specifierType === 'ImportDefaultSpecifier') {
    keyname = 'default';
  }
  if (specifierType === 'ImportNamespaceSpecifier') {
    objectState = t.identifier(originalActionName);
  } else {
    objectState = t.objectPattern([t.objectProperty(t.identifier(keyname), t.identifier(originalActionName))]);
  }
  var arrowFuncBody = getActionDispatcherBody(t, prop, isMapDispatchToPropsObject, originalParams, originalActionName, originalActionSpecifier, specifierType);
  var args = t.arrowFunctionExpression([objectState], arrowFuncBody);
  var returnStatement = t.callExpression(importState, [args]);
  var params = isMapDispatchToPropsObject ? [originalParams] : originalParams;
  var outerFunction = t.arrowFunctionExpression(params, returnStatement);
  // let prog = path.findParent((p) => p.isProgram());
  //prog.node.body.push(outerFunction);
  return outerFunction;
}
function getActionDispatcherBody(t, prop, isMapDispatchToPropsObject, originalParams, originalActionName, originalActionSpecifier, specifierType) {
  if (!isMapDispatchToPropsObject) {
    return prop.node.value.body;
  }
  var functionName = t.identifier(originalActionName);
  if (specifierType === 'ImportNamespaceSpecifier') {
    functionName = t.memberExpression(functionName, t.identifier(originalActionSpecifier));
  }
  //generating---> dispatch(addition(...rest))
  var customDispatchMethod = t.callExpression(t.identifier('dispatch'), [t.callExpression(functionName, [t.spreadElement(t.identifier(originalParams.argument.name))])]);
  return customDispatchMethod;
}
function cleanUpImportStatement(importStatement, actionName) {
  //stop traversal as soon as action name is matched
  importStatement.traverse({
    ImportDefaultSpecifier: function ImportDefaultSpecifier(specifierPath) {
      removeSpecifierHandler(importStatement, specifierPath, actionName);
    },
    ImportSpecifier: function ImportSpecifier(specifierPath) {
      removeSpecifierHandler(importStatement, specifierPath, actionName);
    },
    ImportNamespaceSpecifier: function ImportNamespaceSpecifier(specifierPath) {
      removeSpecifierHandler(importStatement, specifierPath, actionName);
    }
  });
}
function removeSpecifierHandler(importStatement, specifierPath, actionName) {
  if (specifierPath.node.local.name === actionName) {
    if (importStatement.node.specifiers && importStatement.node.specifiers.length === 1) {
      importStatement.remove();
    } else {
      specifierPath.remove();
    }
  }
}
function getImportStatement(path, requiredSpecifierName) {
  var program = path.findParent(function (p) {
    return p.isProgram();
  });
  var programBody = program.get('body');
  var importDeclarations = programBody.filter(function (path) {
    return path.node.type === 'ImportDeclaration';
  });
  var importStatement, specifierType, matchedSpecifier, namedImport;
  for (var i = 0; i < importDeclarations.length; i++) {
    var importDeclaration = importDeclarations[i];
    var specifiersNode = importDeclaration.node.specifiers;
    if (specifiersNode && specifiersNode.length) {
      for (var _i2 = 0; _i2 < specifiersNode.length; _i2++) {
        var specifier = specifiersNode[_i2];
        var _isSpecifierContainRe = isSpecifierContainRequiredSpecifier(specifier, requiredSpecifierName),
          specType = _isSpecifierContainRe.specifierType,
          status = _isSpecifierContainRe.status,
          originalNamedImport = _isSpecifierContainRe.namedImport;
        if (status) {
          importStatement = importDeclaration;
          specifierType = specType;
          matchedSpecifier = specifier;
          namedImport = originalNamedImport;
          break;
        }
      }
    }
  }
  return {
    importStatement: importStatement,
    specifierType: specifierType,
    specifier: matchedSpecifier,
    namedImport: namedImport
  };
}
function isSpecifierContainRequiredSpecifier(specifier, requiredSpecifierName) {
  var local = specifier.local,
    imported = specifier.imported;
  var status = false;
  switch (specifier.type) {
    case SPECIFIER_TYPES.ImportDefaultSpecifier:
    case SPECIFIER_TYPES.ImportNamespaceSpecifier:
    case SPECIFIER_TYPES.ImportSpecifier:
      {
        status = local.name === requiredSpecifierName;
        break;
      }
    default:
      {
        status = false;
      }
  }
  return {
    status: status,
    specifierType: specifier.type,
    namedImport: imported ? imported.name : null
  };
}

// file- lazyloadvalidation.js
//start
function isRequiredlazyLoad(path) {
  if (path.node.callee.name !== 'connect') {
    return false;
  }
  if (isDisableFile(getParentProgram(path))) {
    return false;
  }
  return true;
}

// file- utils.js
function getParentProgram(path) {
  return path.findParent(function (p) {
    return p.isProgram();
  });
}

// file- disability.js
function isDisableFile(program) {
  for (var i = 0; program.node.body && i < program.node.body.length; i++) {
    var bodyElement = program.node.body[i];
    for (var j = 0; bodyElement.leadingComments && j < bodyElement.leadingComments.length; j++) {
      var comment = bodyElement.leadingComments[j];
      var type = comment.type,
        value = comment.value;
      if (type === 'CommentBlock' && COMMENT_TYPE_REGEX.test(value.trim())) {
        return true;
      }
    }
  }
}

//path=> connect statement
//return= second params name in connect statement as node
function getMapDispatchToPropsNode(path) {
  var args = path.get('arguments');
  if (args.length > 1) {
    return args[1];
  }
  return undefined;
}

// file- validateMapDispatchToProps.js
//mapDispatchToPropsNode=> connect expression's 2nd parameter as node
function isValidMapDispatchToProps(mapDispatchToPropsNode) {
  return !mapDispatchToPropsNode || mapDispatchToPropsNode.isNullLiteral() || mapDispatchToPropsNode.node.name === 'undefined';
}
// file- returnStatement.js
//refactor this code using switch
//path=> connect statement
//mapDispatchToPropsNode => connect expression's 2nd parameter as node
function getReturnStatement(path, mapDispatchToPropsNode) {
  debugger;
  switch (mapDispatchToPropsNode.node.type) {
    case 'ObjectExpression':
      {
        return {
          returnStatement: mapDispatchToPropsNode,
          isConnectItselfContainingDeclaration: true,
          aMDTPDecl: undefined
        };
      }
    case 'Identifier':
      {
        var mapDispatchToPropsName = mapDispatchToPropsNode.node.name;
        var program = getParentProgram(path);
        var aMDTPDecl = getActualMapDispToPropsDeclaration(program, mapDispatchToPropsName);
        if (aMDTPDecl.node.type === 'VariableDeclarator') {
          var declaratorValue = aMDTPDecl.get('init');
          var declaratorValueType = declaratorValue.node.type;
          if (declaratorValueType === 'ObjectExpression') {
            return {
              returnStatement: declaratorValue,
              isConnectItselfContainingDeclaration: false,
              aMDTPDecl: aMDTPDecl
            };
          } else if (['ArrowFunctionExpression', 'FunctionDeclaration', 'FunctionExpression'].includes(declaratorValueType)) {
            return getReturnStatementFromFunctionDeclaration(declaratorValue);
          }
        } else if (aMDTPDecl.node.type === 'FunctionDeclaration') {
          return getReturnStatementFromFunctionDeclaration(aMDTPDecl);
        }
      }
  }
}
function getReturnStatementFromFunctionDeclaration(funcDeclaration) {
  var funcBody = funcDeclaration.get('body');
  var returnStatement = getFunctionsReturnStatement(funcBody);
  return {
    returnStatement: returnStatement,
    isConnectItselfContainingDeclaration: false,
    aMDTPDecl: funcDeclaration
  };
}
function getFunctionsReturnStatement(funcBody) {
  switch (funcBody.node.type) {
    case 'ObjectExpression':
      {
        return funcBody;
      }
    case 'BlockStatement':
      {
        var blockStatements = funcBody.get('body');
        return blockStatements.filter(function (_ref4) {
          var type = _ref4.node.type;
          return type === 'ReturnStatement';
        })[0];
      }
  }
}
function getActualMapDispToPropsDeclaration(program, mapDispatchToPropsName) {
  var declarations = getRootLevelVariablesAndFunctions(program);
  for (var i = 0; i < declarations.length; i++) {
    var declaration = declarations[i];
    if (declaration.node.type === 'VariableDeclaration') {
      var declarators = declaration.get('declarations');
      for (var j = 0; j < declarators.length; j++) {
        var declarator = declarators[j];
        if (declarator.node.id.name === mapDispatchToPropsName) {
          return declarator;
        }
      }
    } else if (declaration.node.type === 'FunctionDeclaration') {
      if (declaration.node.id.name === mapDispatchToPropsName) {
        return declaration;
      }
    }
  }
}
function getRootLevelVariablesAndFunctions(program) {
  var progBody = program.get('body');
  return progBody.filter(function (_ref5) {
    var type = _ref5.node.type;
    return type === 'VariableDeclaration' || type === 'FunctionDeclaration';
  });
}