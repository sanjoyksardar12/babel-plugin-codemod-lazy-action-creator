import React, { Component } from "react";
import { connect } from "react-redux";
import multiplication, * as multiplicationActions from "./actions/multiplication.js";
import addition, { additionThree, additionFour } from "./actions/addition.js";
import subtraction, {
  subtractionThree as subThree,
} from "./actions/subtraction.js";

class App extends Component {
  componentDidMount() {
    additionFour(2, 3, 4, 5);

    setTimeout(() => {
      const { multiplication2, multiplication3 } = this.props;
      multiplication2(2, 3);

      setTimeout(() => {
        multiplication3(2, 3, 4);
      }, 1000);
    }, 1000 * 2);

    setTimeout(() => {
      const { addition2, addition3 } = this.props;
      addition2(2, 3, 4);

      setTimeout(() => {
        addition3(2, 3, 4);
      }, 1000);
    }, 1000 * 4);

    setTimeout(() => {
      const { subtraction2, subtraction3 } = this.props;
      subtraction2(2, 3);

      setTimeout(() => {
        subtraction3(2, 3, 4);
      }, 1000);
    }, 1000 * 6);
  }

  render() {
    const { addition, subtraction, multiplication } = this.props;
    return (
      <div className="App">
        <h1>Map dispatchToProps as function</h1>
        <h2> Multiplication: {multiplication} </h2>
        <h2> Addition: {addition} </h2>
        <h2> Subtraction: {subtraction} </h2>
      </div>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    ...state,
  };
};

const mapDispatchToProps = (dispatch) => ({
  multiplication2: async function (...rest) {
    dispatch(multiplication(...rest));
  },
  multiplication3: function (...rest) {
    dispatch(multiplicationActions.multiplication3(...rest));
  },
  addition2: function (...rest) {
    dispatch(addition(...rest));
  },
  addition3: function (...rest) {
    dispatch(additionThree(...rest));
  },
  subtraction2: function (...rest) {
    dispatch(subtraction(...rest));
  },
  subtraction3: function (...rest) {
    dispatch(subThree(...rest));
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(App);
