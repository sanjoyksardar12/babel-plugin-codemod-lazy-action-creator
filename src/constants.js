const SPECIFIER_TYPES = {
  ImportDefaultSpecifier: 'ImportDefaultSpecifier',
  ImportNamespaceSpecifier: 'ImportNamespaceSpecifier',
  ImportSpecifier: 'ImportSpecifier',
}

const COMMENT_TYPE_REGEX =
  /\s*babel\s+lazy-codemod-action-creator:\s+"disable"\s*/

export { SPECIFIER_TYPES, COMMENT_TYPE_REGEX }
