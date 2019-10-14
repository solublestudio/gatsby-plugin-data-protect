"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard");

exports.__esModule = true;
exports.default = void 0;

var _objectWithoutPropertiesLoose2 = _interopRequireDefault(require("@babel/runtime/helpers/objectWithoutPropertiesLoose"));

var _react = _interopRequireWildcard(require("react"));

var _gatsby = require("gatsby");

var _utils = require("./utils");

var _jsxFileName = "/Users/laurent/Documents/soluble-brand-center-authentication/testsite/plugins/gatsby-plugin-data-protect/src/Wrapper.js";

var hasData = function hasData(sensitiveKeys) {
  var uuids = Object.values(sensitiveKeys);
  return uuids.length && (0, _utils.getStoredValue)(uuids[0]) ? true : false;
};

var timeoutNavigate = function timeoutNavigate(path, startTime) {
  if (path === void 0) {
    path = null;
  }

  if (startTime === void 0) {
    startTime = 0;
  }

  var endTime = Date.now();
  var difference = endTime - startTime;
  setTimeout(function () {
    (0, _gatsby.navigate)(path, {
      replace: false
    });
  }, Math.max(difference, 500));
};

var _default = function _default(_ref) {
  var children = _ref.children,
      props = (0, _objectWithoutPropertiesLoose2.default)(_ref, ["children"]);

  var _useState = (0, _react.useState)(null),
      data = _useState[0],
      setData = _useState[1];

  var prevPath = usePrevious(props.path);
  (0, _react.useEffect)(function () {
    if (!props.pageContext.dataProtectValues) {
      setData(props);
      return;
    }

    var _props$pageContext$da = props.pageContext.dataProtectValues,
        isLoadingPage = _props$pageContext$da.isLoadingPage,
        loadingPath = _props$pageContext$da.loadingPath,
        sensitiveKeys = _props$pageContext$da.sensitiveKeys,
        loginPath = _props$pageContext$da.loginPath,
        loginUrl = _props$pageContext$da.loginUrl,
        version = _props$pageContext$da.version,
        publicUrl = _props$pageContext$da.publicUrl;
    setTimeout(_utils.hookLoginForm.bind(null, loginUrl, version), 0);

    if (props.pageContext.dataProtectValues.isLoginPage) {
      if (!data) {
        setData(props);
      }

      return;
    }

    if (hasData(sensitiveKeys)) {
      setData((0, _utils.getNewProps)(props, sensitiveKeys));
      return;
    }

    if (!isLoadingPage) {
      (0, _utils.storeValue)('data-protect-redirect', props.path);
      (0, _gatsby.navigate)(loadingPath, {
        replace: false
      });
      return;
    } else if (!data) {
      setData(props);
    }

    var token = isLoadingPage && props.token && props.token !== 'loading' ? props.token : (0, _utils.getStoredValue)('data-protect-token');
    var startTime = Date.now();

    if (!isLoadingPage && !prevPath || !token) {
      timeoutNavigate(loginPath, startTime);
      return;
    }

    var reset = function reset() {
      (0, _utils.removeValue)();
      timeoutNavigate(loginPath, startTime);
    };

    (0, _utils.makeLoginCall)(loginUrl, {
      token: token,
      version: version
    }, function (response) {
      if (!response || !response.filename) {
        reset();
        return;
      }

      fetch(publicUrl + "/" + response.filename + ".json").then(function (res) {
        return res.json();
      }).catch(function (error) {
        reset();
        return;
      }).then(function (response) {
        var redirectPath = (0, _utils.getStoredValue)('data-protect-redirect');
        (0, _utils.removeValue)();
        Object.keys(response).forEach(function (key) {
          (0, _utils.storeValue)(key, JSON.stringify(response[key]));
        });
        (0, _utils.storeValue)('data-protect-token', token);

        if (redirectPath) {
          (0, _utils.storeValue)('data-protect-redirect', redirectPath);
          timeoutNavigate(redirectPath, startTime);
        } else {
          reset();
        }
      });
    }, function (error) {
      reset();
      return;
    });
  }, [props.path]);
  return _react.default.createElement("div", {
    style: {
      opacity: data ? 1 : 0
    },
    __source: {
      fileName: _jsxFileName,
      lineNumber: 123
    },
    __self: this
  }, data ? (0, _react.cloneElement)(children, data) : children);
};

exports.default = _default;

function usePrevious(value) {
  var ref = (0, _react.useRef)();
  (0, _react.useEffect)(function () {
    ref.current = value;
  }, [value]);
  return ref.current;
}