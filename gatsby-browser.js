"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _extends2 = _interopRequireDefault(require("@babel/runtime/helpers/extends"));

var _jsxFileName = "/Users/laurent/Documents/soluble-brand-center-authentication/testsite/plugins/gatsby-plugin-data-protect/src/gatsby-browser.js";

var React = require('react');

var Wrapper = require('./Wrapper').default;

exports.wrapPageElement = function (_ref) {
  var element = _ref.element,
      props = _ref.props;
  return React.createElement(Wrapper, (0, _extends2.default)({}, props, {
    __source: {
      fileName: _jsxFileName,
      lineNumber: 5
    },
    __self: this
  }), element);
};