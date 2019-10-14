"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _extends2 = _interopRequireDefault(require("@babel/runtime/helpers/extends"));

var path = require('path');

var fs = require('fs');

var fse = require('fs-extra');

var _require = require('child_process'),
    execSync = _require.execSync;

var replace = require('replace');

var request = require('sync-request');

var uuid = require('uuid');

function extractUrls(output) {
  var expresion = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gm;
  var results = output.match(expresion);

  if (results && results.length) {
    return results;
  }

  return [];
}

function extractToken(output) {
  var expression = /gatsbyPluginDataProtect: (.+)/gm;
  var results = expression.exec(output);

  if (results && results.length > 1) {
    return results[1];
  }

  return null;
}

function getVersionsData(url, token) {
  var res = request('GET', url, {
    headers: {
      'x-api-key': token
    }
  });

  if (res.statusCode === 200) {
    return JSON.parse(res.getBody().toString());
  }

  return null;
}

var ServerlessUtil =
/*#__PURE__*/
function () {
  function ServerlessUtil() {
    this.__init = false;
    this.__serverlessCmd = 'serverless';
    this.__baseFolder = path.resolve(__dirname, 'serverless');
    this.__buildFolder = path.resolve(__dirname, '.serverless');
    this.__urls = {
      login: '/___dataprotect/login',
      version: null
    };
    this.__token = null;
    this.__options = {};
    this.__sensitiveFilename = uuid();
    this.__versions = {};
    this.__stage = 'develop';
  }

  var _proto = ServerlessUtil.prototype;

  _proto.configure = function configure(options, stage) {
    if (stage === void 0) {
      stage = 'develop';
    }

    this.__options = (0, _extends2.default)({}, options, {
      version: options.version ? options.version : 'latest',
      public_url: options['public_url'] ? options['public_url'] : '/',
      login_path: options['login_path'] ? options['login_path'].replace(/^\//gm, '').replace(/\/$/gm, '') : 'login',
      DATA_PROTECT_SERVER_NAME: process.env.DATA_PROTECT_SERVER_NAME ? process.env.DATA_PROTECT_SERVER_NAME : 'gatsby-plugin-data-protect',
      DATA_PROTECT_SERVER_PROVIDER: process.env.DATA_PROTECT_SERVER_PROVIDER,
      DATA_PROTECT_SERVER_REGION: process.env.DATA_PROTECT_SERVER_REGION,
      DATA_PROTECT_SERVER_SECRET: process.env.DATA_PROTECT_SERVER_SECRET,
      DATA_PROTECT_SERVER_KEY: process.env.DATA_PROTECT_SERVER_KEY,
      DATA_PROTECT_DB_PROVIDER: process.env.DATA_PROTECT_DB_PROVIDER,
      DATA_PROTECT_DB_KEY: process.env.DATA_PROTECT_DB_KEY,
      DATA_PROTECT_DB_NAME: process.env.DATA_PROTECT_DB_NAME,
      DATA_PROTECT_DB_TABLE: process.env.DATA_PROTECT_DB_TABLE,
      DATA_PROTECT_MAIL_PROVIDER: process.env.DATA_PROTECT_MAIL_PROVIDER,
      DATA_PROTECT_MAIL_DOMAIN: process.env.DATA_PROTECT_MAIL_DOMAIN ? process.env.DATA_PROTECT_MAIL_DOMAIN : '',
      DATA_PROTECT_MAIL_KEY: process.env.DATA_PROTECT_MAIL_KEY,
      DATA_PROTECT_MAIL_FROM: process.env.DATA_PROTECT_MAIL_FROM,
      DATA_PROTECT_MAIL_SUBJECT: process.env.DATA_PROTECT_MAIL_SUBJECT,
      DATA_PROTECT_MAIL_TEMPLATE: process.env.DATA_PROTECT_MAIL_TEMPLATE
    });
    this.__stage = stage;
  };

  _proto.init = function init() {
    var _this = this;

    if (this.__init) {
      return;
    }

    fse.removeSync(this.__buildFolder);
    fse.copySync(this.__baseFolder, this.__buildFolder);
    var keysForEnvironment = ['DATA_PROTECT_DB_PROVIDER', 'DATA_PROTECT_DB_KEY', 'DATA_PROTECT_DB_NAME', 'DATA_PROTECT_DB_TABLE', 'DATA_PROTECT_MAIL_PROVIDER', 'DATA_PROTECT_MAIL_DOMAIN', 'DATA_PROTECT_MAIL_KEY', 'DATA_PROTECT_MAIL_FROM', 'DATA_PROTECT_MAIL_SUBJECT', 'public_url', 'login_path'];
    var environmentData = "  environment:";
    keysForEnvironment.forEach(function (key) {
      environmentData += '\n' + ("    " + key + ": " + (_this.__options[key] ? _this.__options[key] : ''));
    });
    replace({
      regex: "#  environment:",
      replacement: environmentData,
      paths: [this.__buildFolder + "/serverless.yml"],
      slient: true
    });
    replace({
      regex: "service: gatsby-plugin-data-protect",
      replacement: "service: " + this.__options.DATA_PROTECT_SERVER_NAME,
      paths: [this.__buildFolder + "/serverless.yml"],
      slient: true
    });

    if (this.__options.DATA_PROTECT_MAIL_TEMPLATE) {
      fse.copySync(path.resolve(this.__options.DATA_PROTECT_MAIL_TEMPLATE), this.__buildFolder + "/email.html");
    }

    var stdout = this.execCommand('npm install');
    this.__init = true;
  };

  _proto.execCommand = function execCommand(command) {
    try {
      return execSync(command, {
        cwd: this.__buildFolder,
        encoding: 'utf8',
        stdio: 'ignore'
      });
    } catch (error) {
      console.log(error);
      return null;
    }
  };

  _proto.fetchApiData = function fetchApiData() {
    var params = ["--region " + this.__options.DATA_PROTECT_SERVER_REGION, "--stage " + this.__stage];
    var stdout = this.execCommand(this.__serverlessCmd + " info " + params.join(' '));

    if (stdout) {
      this.persistDataFromServerless(stdout);
    }
  };

  _proto.fetchVersionsData = function fetchVersionsData() {
    if (this.__urls.version && this.__token) {
      var data = getVersionsData(this.__urls.version, this.__token);

      if (data) {
        this.__versions = data;
      }
    }

    this.__versions[this.__options.version] = this.__sensitiveFilename;
    fs.writeFileSync(this.__buildFolder + "/versions.json", JSON.stringify(this.__versions), 'utf8');
  };

  _proto.publish = function publish() {
    var credentialParams = ["--provider " + this.__options.DATA_PROTECT_SERVER_PROVIDER, "--key " + this.__options.DATA_PROTECT_SERVER_KEY, "--secret " + this.__options.DATA_PROTECT_SERVER_SECRET, "--profile build-" + this.__options.DATA_PROTECT_SERVER_NAME, "--overwrite"];
    var deployParams = ["--stage " + this.__stage, "--aws-profile build-" + this.__options.DATA_PROTECT_SERVER_NAME, "--region " + this.__options.DATA_PROTECT_SERVER_REGION];
    var stdout = this.execCommand(this.__serverlessCmd + " config credentials " + credentialParams.join(' ') + "; " + this.__serverlessCmd + " deploy " + deployParams.join(' '));

    if (stdout) {
      this.persistDataFromServerless(stdout);
    }
  };

  _proto.persistDataFromServerless = function persistDataFromServerless(stdout) {
    var _this2 = this;

    if (!stdout) {
      return;
    }

    var urls = extractUrls(stdout);

    if (urls && urls.length) {
      urls.forEach(function (url) {
        Object.keys(_this2.__urls).forEach(function (urlType) {
          if (url.endsWith(urlType)) {
            _this2.__urls[urlType] = url;
          }
        });
      });
    }

    var token = extractToken(stdout);

    if (token) {
      this.__token = token;
    }
  };

  _proto.getLoginUrl = function getLoginUrl() {
    return this.__urls.login;
  };

  _proto.getSensitiveFilename = function getSensitiveFilename() {
    return this.__sensitiveFilename;
  };

  _proto.getCurrentVersion = function getCurrentVersion() {
    return this.__options.version;
  };

  _proto.getPublicUrl = function getPublicUrl() {
    return this.__options.public_url;
  };

  return ServerlessUtil;
}();

module.exports = ServerlessUtil;