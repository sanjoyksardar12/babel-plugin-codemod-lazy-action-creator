const babel = require("@babel/core");
const path = require("path");
const plugin = require("../../index.js");

const babelConfig = { presets: [ "@babel/preset-react"], plugins: [plugin] };

it("MapDispatchToProps as fuction", () => {
  const { code } = babel.transformFileSync(path.resolve(__dirname, "../../src/asFunction.js"), babelConfig);
  expect(code).toMatchSnapshot();
});
