"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _extends2 = _interopRequireDefault(require("@babel/runtime/helpers/extends"));

var uuid = require('uuid');

var fs = require('fs');

var path = require('path');

var ServerlessUtil = require('./ServerlessUtil');

var express = require('express');

var dotenv = require('dotenv');

dotenv.config();
var IS_BUILD = process.env.NODE_ENV === 'production';
var sensitiveData = {};
var slsUtil = new ServerlessUtil();

var getEmptyVariable = function getEmptyVariable(variable) {
  var type = typeof variable;

  if (type === 'number') {
    return 0;
  } else if (type === 'string') {
    return '';
  } else if (type === 'object') {
    if (Array.isArray(variable)) {
      return [];
    }

    return {};
  }

  return null;
};

exports.onPreInit = function (data, pluginOptions, cb) {
  slsUtil.configure(pluginOptions, IS_BUILD ? 'build' : 'develop');

  if (IS_BUILD) {
    slsUtil.init(pluginOptions);
    slsUtil.fetchApiData();
    slsUtil.fetchVersionsData();
    slsUtil.publish();
  }

  cb();
};

exports.onCreatePage = function (_ref, _ref2, cb) {
  var page = _ref.page,
      actions = _ref.actions;
  var _ref2$data_protect_ke = _ref2.data_protect_keys,
      data_protect_keys = _ref2$data_protect_ke === void 0 ? [] : _ref2$data_protect_ke,
      _ref2$login_path = _ref2.login_path,
      login_path = _ref2$login_path === void 0 ? 'login' : _ref2$login_path,
      _ref2$loading_compone = _ref2.loading_component,
      loading_component = _ref2$loading_compone === void 0 ? require.resolve(__dirname, 'Loader.js') : _ref2$loading_compone;
  var createPage = actions.createPage,
      deletePage = actions.deletePage;
  var recreatePage = false;
  var newPageContext = (0, _extends2.default)({}, page.context);
  var sensitiveKeys = {};
  var pagePath = page.path.replace(/^\//gm, '').replace(/\/$/gm, '');
  var loginPath = login_path.replace(/^\//gm, '').replace(/\/$/gm, '');
  var isLoginPage = pagePath === loginPath;
  Object.keys(page.context).forEach(function (dataKey) {
    if (data_protect_keys.includes(dataKey)) {
      var dataUuid = uuid();
      sensitiveData[dataUuid] = JSON.parse(JSON.stringify(page.context[dataKey]));
      newPageContext[dataKey] = getEmptyVariable(page.context[dataKey]);
      sensitiveKeys[dataKey] = dataUuid;
      recreatePage = true;
    }
  });

  if (recreatePage || isLoginPage) {
    newPageContext.dataProtectValues = {
      sensitiveData: true,
      isLoginPage: isLoginPage,
      isLoadingPage: false,
      loginPath: "/" + loginPath + "/",
      loadingPath: "/" + loginPath + "/loading",
      loginUrl: slsUtil.getLoginUrl(),
      publicUrl: slsUtil.getPublicUrl(),
      version: slsUtil.getCurrentVersion(),
      sensitiveKeys: sensitiveKeys
    };
    deletePage(page);
    createPage((0, _extends2.default)({}, page, {
      matchPath: isLoginPage ? "/" + loginPath + "/" : page.matchPath,
      context: newPageContext
    }));
  }

  if (isLoginPage) {
    createPage((0, _extends2.default)({}, page, {
      path: "/" + loginPath + "/loading",
      matchPath: "/" + loginPath + "/:token",
      component: loading_component,
      context: (0, _extends2.default)({}, newPageContext, {
        dataProtectValues: (0, _extends2.default)({}, newPageContext.dataProtectValues, {
          isLoginPage: false,
          isLoadingPage: true
        })
      })
    }));
  }

  cb();
};

exports.sourceNodes = function (_ref3) {
  var actions = _ref3.actions,
      createNodeId = _ref3.createNodeId,
      createContentDigest = _ref3.createContentDigest,
      pathPrefix = _ref3.pathPrefix;
  var createNode = actions.createNode;
  var nodeData = {
    loginUrl: slsUtil.getLoginUrl(),
    publicUrl: slsUtil.getPublicUrl(),
    version: slsUtil.getCurrentVersion()
  };
  var nodeContent = JSON.stringify(nodeData);
  var nodeMeta = {
    id: createNodeId("data-protect-values"),
    parent: null,
    children: [],
    internal: {
      type: "DataProtectValues",
      mediaType: "text/html",
      content: nodeContent,
      contentDigest: createContentDigest(nodeData)
    }
  };
  var node = Object.assign({}, nodeData, nodeMeta);
  createNode(node);
};

exports.onPostBootstrap = function (data, pluginOptions, cb) {
  fs.writeFileSync(path.resolve(process.env.PWD, "public/" + slsUtil.getSensitiveFilename() + ".json"), JSON.stringify(sensitiveData), 'utf8');
  cb();
};

exports.onCreateDevServer = function (_ref4) {
  var app = _ref4.app;

  if (!IS_BUILD) {
    app.use(express.json());
    app.post(slsUtil.getLoginUrl(), function (req, res) {
      var sendForbidden = function sendForbidden() {
        res.status(403);
        res.send({
          msg: 'forbidden'
        });
      };

      var sendSuccess = function sendSuccess(data) {
        res.status(200);
        res.send(data);
      };

      if (!req.body) {
        return sendForbidden();
      }

      if (req.body.token) {
        if (!req.body.version || req.body.version !== slsUtil.getCurrentVersion()) {
          return sendForbidden();
        }

        if (req.body.token === 'super_secret_token') {
          // req.body.version
          return sendSuccess({
            msg: 'Success!',
            filename: slsUtil.getSensitiveFilename()
          });
        }

        if (!req.body.email) {
          return sendForbidden();
        }
      }

      if (req.body.email === 'demo@demo.demo') {
        return sendSuccess({
          msg: 'Success! Check your inbox'
        });
      }

      return sendForbidden();
    });
  }
};