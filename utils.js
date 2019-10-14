"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

exports.__esModule = true;
exports.hookLoginForm = exports.dispatchEvent = exports.getNewProps = exports.makeLoginCall = exports.removeValue = exports.storeValue = exports.getStoredValue = void 0;

var _extends2 = _interopRequireDefault(require("@babel/runtime/helpers/extends"));

var getStoredValue = function getStoredValue(key) {
  return window.localStorage.getItem(key);
};

exports.getStoredValue = getStoredValue;

var storeValue = function storeValue(key, value) {
  return window.localStorage.setItem(key, value);
};

exports.storeValue = storeValue;

var removeValue = function removeValue(key) {
  if (key === void 0) {
    key = null;
  }

  return key ? window.localStorage.removeItem(key) : window.localStorage.clear();
};

exports.removeValue = removeValue;

var makeLoginCall = function makeLoginCall(url, params, successCallback, errorCallback) {
  fetch(url, {
    method: 'POST',
    body: JSON.stringify(params),
    headers: {
      'Content-Type': 'application/json'
    }
  }).then(function (res) {
    return res.json();
  }).catch(errorCallback).then(successCallback);
};

exports.makeLoginCall = makeLoginCall;

var getNewProps = function getNewProps(props, sensitiveKeys) {
  var newProps = (0, _extends2.default)({}, props);
  Object.keys(sensitiveKeys).forEach(function (dataKey) {
    var sensitiveData = JSON.parse(getStoredValue(sensitiveKeys[dataKey]));
    newProps.pageContext[dataKey] = sensitiveData;
  });
  return newProps;
};

exports.getNewProps = getNewProps;

var dispatchEvent = function dispatchEvent(dom, eventName, data) {
  if (data === void 0) {
    data = {};
  }

  var newEvent = new CustomEvent(eventName, data);
  dom.dispatchEvent(newEvent);
};

exports.dispatchEvent = dispatchEvent;

var hookLoginForm = function hookLoginForm(loginUrl, version) {
  var form = document.getElementById('data-protect-form');
  console.log(loginUrl, version);

  if (!form) {
    return;
  }

  form.addEventListener('submit', function (e) {
    dispatchEvent(form, 'loading');
    e.preventDefault();

    if (form.elements && form.elements.email && form.elements.email.value) {
      makeLoginCall(loginUrl, {
        email: form.elements.email.value,
        version: version
      }, function (response) {
        if (!response || response.msg == 'forbidden') {
          dispatchEvent(form, 'error', response);
        } else {
          dispatchEvent(form, 'success', response);
        }
      }, function (error) {
        dispatchEvent(form, 'error', {
          msg: 'error'
        });
      });
    }
  });
};

exports.hookLoginForm = hookLoginForm;