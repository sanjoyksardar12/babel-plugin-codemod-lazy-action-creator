const babel = require("@babel/core");
const path = require("path");
const plugin = require("../../index.js");

// import moduleName, {foo} from '../moduleName';

// jest.mock("../../src/actions/multiplication.js", () => {
//   return {
//     __esModule: true,
//     default: jest.fn(() => "Default multiplication of 2 nos."),
//     foo: jest.fn(() => "multiplication of 3 nos."),
//   };
// });

// moduleName(); // Will return 42
// foo();

const babelConfig = { presets: [ "@babel/preset-react"], plugins: [plugin] };

// jest.mock("./actions/multiplication.js",()=>({
//   default: ()=>"Default multiplication of 2 nos.",
//   multiplication3: ()=> "multiplication of 3 nos."
// }));

it("MapDispatchToProps as inline with connnect", () => {
  const { code } = babel.transformFileSync(path.resolve(__dirname, "../../src/inlineWithConnect.js"), babelConfig);
  expect(code).toMatchSnapshot();
});

it("MapDispatchToProps as object", () => {
  const { code } = babel.transformFileSync(path.resolve(__dirname, "../../src/asObject.js"), babelConfig);
  expect(code).toMatchSnapshot();
});

it("MapDispatchToProps as fuction", () => {
  const { code } = babel.transformFileSync(path.resolve(__dirname, "../../src/asFunction.js"), babelConfig);
  expect(code).toMatchSnapshot();
});

it("MapDispatchToProps as arrowFuction", () => {
  const { code } = babel.transformFileSync(path.resolve(__dirname, "../../src/asArrowFunction.js"), babelConfig);
  expect(code).toMatchSnapshot();
});



