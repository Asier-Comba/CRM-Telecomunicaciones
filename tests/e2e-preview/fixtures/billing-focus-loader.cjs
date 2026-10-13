module.exports = function (source) {
  const callback=this.async(), fileName=this.resourcePath
  import('typescript').then(module=>{
    const ts=module.default ?? module
    callback(null, ts.transpileModule(source, { fileName, compilerOptions: {
      target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX,
    } }).outputText)
  }, callback)
}
