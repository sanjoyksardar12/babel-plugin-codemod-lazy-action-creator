# babel-plugin-codemod-lazy-action-creator
   Lazy load actions defined in mapDispatchToProps

# problem:
We used to define mapDispatchToProps
using syntax like
```
const mapdispatchToProps = {
  multiplication,
  addition,
  subtraction,
}
```
or
```
const mapDispatchToProps= (dispatch) => {
  return {
    multiplication2: (a, b) => {
      return dispatch(multiplication(a, b))
    },
    addition: (arg, ...rest) => dispatch(addition(arg, ...rest)),
    subtraction: (a, b) => dispatch(subtraction(a, b)),
  }
}
```

then after bundle all the code related to these actions will attached into bundle.

But these actions definition may not required for the first load time, it may required for later on user interaction.

so we can do lazy load these actions definitions when required, then systax will be like
```
const mapDispatchToProps= (dispatch) => {
  return {
    multiplication: (a, b) => import("./action-multiplication.js")
      .then(({default: multiplication})=>{
        return dispatch(multiplication(a, b))
      },

    addition: (arg, ...rest) =>import("./action-addition.js")
      .then(({default: addition})=>dispatch(addition(arg, ...rest))),

    subtraction: (arg1, arg2) =>import("./action-subtraction.js")
      .then(({default: subtraction})=>dispatch(subtraction(arg1, arg2)))
  }
}
```
Now if we bundle this, then we will get four chunks,
  -  one for the code of the file
  -  action-multiplication.js
  -   for action-addition.js
  -  for action-subtraction.js

# usage
```
  npm i babel-plugin-codemod-lazy-action-creator --save-dev
```
and add .babelrc
```
"plugins": [
  "babel-plugin-codemod-lazy-action-creator",
  ...
]
```


# options
 You can disable this rule by adding  **/\*babel-plugin-codemod-lazy-action-creator: "disable"\*\/**
  - for whole file add it in global scope
  - for a particular action add this comment before use of the action


 # Examples
 https://github.com/sanjoyksardar12/babel-plugin-codemod-lazy-action-creator-examples
