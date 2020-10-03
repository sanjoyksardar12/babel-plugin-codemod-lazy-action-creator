const babel = require("@babel/core");
const plugin = require("../../index.js");

const babelConfig = { presets: ["@babel/preset-react"], plugins: [plugin] };

var noMapDispatToPropParam = `
  import React, { Component } from "react";
  import { connect } from "react-redux";
  class App extends Component {
    render() {
      const { addition, subtraction, multiplication } = this.props;
      return (
        <div className="App">
          <h1>Map dispatchToProps as object</h1>
          <h2> Multiplication: {multiplication} </h2>
          <h2> Addition: {addition} </h2>
          <h2> Subtraction: {subtraction} </h2>
        </div>
      );
    }
  }

  const mapStateToProps = state=>{
    return{
      ...state
    }
  }
  export default connect(mapStateToProps)(App);
`;

it("no MapDispatToProp Param", () => {
  const { code } = babel.transform(noMapDispatToPropParam, babelConfig);
  expect(code).toMatchSnapshot();
});


var mapDispatchToPropsAsUndified = `
  import React, { Component } from "react";
  import { connect } from "react-redux";
  class App extends Component {
    render() {
      const { addition, subtraction, multiplication } = this.props;
      return (
        <div className="App">
          <h1>Map dispatchToProps as object</h1>
          <h2> Multiplication: {multiplication} </h2>
          <h2> Addition: {addition} </h2>
          <h2> Subtraction: {subtraction} </h2>
        </div>
      );
    }
  }

  const mapStateToProps = state=>{
    return{
      ...state
    }
  }
  export default connect(mapStateToProps, undefined)(App);
`;

it("MapDispatToProp as undefined", () => {
  const { code } = babel.transform(mapDispatchToPropsAsUndified, babelConfig);
  expect(code).toMatchSnapshot()
});


var mapDispatchToPropsAsNull = `
  import React, { Component } from "react";
  import { connect } from "react-redux";
  class App extends Component {
    render() {
      const { addition, subtraction, multiplication } = this.props;
      return (
        <div className="App">
          <h1>Map dispatchToProps as object</h1>
          <h2> Multiplication: {multiplication} </h2>
          <h2> Addition: {addition} </h2>
          <h2> Subtraction: {subtraction} </h2>
        </div>
      );
    }
  }

  const mapStateToProps = state=>{
    return{
      ...state
    }
  }
  export default connect(mapStateToProps, null)(App);
`;

it("MapDispatToProp as null", () => {
  const { code } = babel.transform(mapDispatchToPropsAsNull, babelConfig);
  expect(code).toMatchSnapshot()
})





var mapDispatchToPropsAsEmptyObj = `
  import React, { Component } from "react";
  import { connect } from "react-redux";
  class App extends Component {
    render() {
      const { addition, subtraction, multiplication } = this.props;
      return (
        <div className="App">
          <h1>Map dispatchToProps as object</h1>
          <h2> Multiplication: {multiplication} </h2>
          <h2> Addition: {addition} </h2>
          <h2> Subtraction: {subtraction} </h2>
        </div>
      );
    }
  }

  const mapStateToProps = state=>{
    return{
      ...state
    }
  }
  export default connect(mapStateToProps, {})(App);
`;

it("MapDispatToProp as empty obj", () => {
  const { code } = babel.transform(mapDispatchToPropsAsEmptyObj, babelConfig);
  expect(code).toMatchSnapshot()
})



