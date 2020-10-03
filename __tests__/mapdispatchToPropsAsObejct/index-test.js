const babel = require("@babel/core");
const path = require("path");
const plugin = require("../../index.js");

const babelConfig = { presets: ["@babel/preset-react"], plugins: [plugin] };

it("MapDispatchToProps as object", () => {
  const { code } = babel.transformFileSync(
    path.resolve(__dirname, "../../test-data/asObject.js"),
    babelConfig
  );
  expect(code).toMatchSnapshot();
});
