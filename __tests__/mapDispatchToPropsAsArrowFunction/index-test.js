const babel = require("@babel/core");
const path = require("path");
const plugin = require("../../index.js");

const babelConfig = { presets: ["@babel/preset-react"], plugins: [plugin] };

it("MapDispatchToProps as arrowFuction", () => {
  const { code } = babel.transformFileSync(
    path.resolve(__dirname, "../../test-data/asArrowFunction.js"),
    babelConfig
  );
  expect(code).toMatchSnapshot();
});

it("MapDispatchToProps as arrowFuction Expression", () => {
  const { code } = babel.transformFileSync(
    path.resolve(__dirname, "../../test-data/asArrowFunctionExpression.js"),
    babelConfig
  );
  expect(code).toMatchSnapshot();
});
