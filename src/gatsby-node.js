const uuid = require('uuid');
const fs = require('fs');
const path = require('path');
const ServerlessUtil = require('./ServerlessUtil');
const express = require('express');
const dotenv = require('dotenv');
dotenv.config();

const IS_BUILD = process.env.NODE_ENV === 'production';

let sensitiveData = {};
const slsUtil = new ServerlessUtil();

const getEmptyVariable = (variable)  => {
    const type = typeof variable;

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
}

exports.onPreInit = (data, pluginOptions, cb) => {
    slsUtil.configure(pluginOptions, IS_BUILD ? 'build' : 'develop');

    if (IS_BUILD) {
        slsUtil.init(pluginOptions);
        slsUtil.fetchApiData();
        slsUtil.fetchVersionsData();
        slsUtil.publish();
    }

    cb();
}

exports.onCreatePage = ({ page, actions }, { data_protect_keys = [], login_path = 'login', loading_component = require.resolve(`${__dirname}/Loader`) }, cb) => {
    const { createPage, deletePage } = actions;

    let recreatePage = false;
    let newPageContext = { ...page.context };
    let sensitiveKeys = {};

    const pagePath = page.path.replace(/^\//gm, '').replace(/\/$/gm, '');
    const loginPath = login_path.replace(/^\//gm, '').replace(/\/$/gm, '');
    const isLoginPage = pagePath === loginPath;

    Object.keys(page.context).forEach(dataKey => {
        if (data_protect_keys.includes(dataKey)) {
            const dataUuid = uuid();

            sensitiveData[dataUuid] = JSON.parse(JSON.stringify(page.context[dataKey]));
            newPageContext[dataKey] = getEmptyVariable(page.context[dataKey]);
            sensitiveKeys[dataKey] = dataUuid;

            recreatePage = true;
        }
    });

    if (recreatePage || isLoginPage) {
        newPageContext.dataProtectValues = {
            sensitiveData: true,
            isLoginPage,
            isLoadingPage: false,
            loginPath: `/${loginPath}/`,
            loadingPath: `/${loginPath}/loading`,
            loginUrl: slsUtil.getLoginUrl(),
            publicUrl: slsUtil.getPublicUrl(),
            version: slsUtil.getCurrentVersion(),
            sensitiveKeys
        }
        
        deletePage(page);
        createPage({
            ...page,
            matchPath: isLoginPage ? `/${loginPath}/` : page.matchPath,
            context: newPageContext,
        });
    }

    if (isLoginPage) {
        createPage({
            ...page,
            path: `/${loginPath}/loading`,
            matchPath: `/${loginPath}/:token`,
            component: loading_component,
            context: {
                ...newPageContext,
                dataProtectValues: {
                    ...newPageContext.dataProtectValues,
                    isLoginPage: false,
                    isLoadingPage: true
                }
            }
        });
    }

    cb();
}

exports.sourceNodes = ({ actions, createNodeId, createContentDigest, pathPrefix }) => {
    const { createNode } = actions;

    const nodeData = { 
        loginUrl: slsUtil.getLoginUrl(),
        publicUrl: slsUtil.getPublicUrl(),
        version: slsUtil.getCurrentVersion()
    };
    const nodeContent = JSON.stringify(nodeData);
  
    const nodeMeta = {
      id: createNodeId(`data-protect-values`),
      parent: null,
      children: [],
      internal: {
        type: `DataProtectValues`,
        mediaType: `text/html`,
        content: nodeContent,
        contentDigest: createContentDigest(nodeData)
      }
    }
  
    const node = Object.assign({}, nodeData, nodeMeta);
    createNode(node);
}

exports.onPostBootstrap = (data, pluginOptions, cb) => {
    fs.writeFileSync(
        path.resolve(process.env.PWD, `public/${slsUtil.getSensitiveFilename()}.json`),
        JSON.stringify(sensitiveData),
        'utf8'
    );

    cb();
}

exports.onCreateDevServer = ({ app }) => {
    if (!IS_BUILD) {
        app.use(express.json());

        app.post(slsUtil.getLoginUrl(), function (req, res) {
            const sendForbidden = () => {
                res.status(403);
                res.send({ msg: 'forbidden' });
            }

            const sendSuccess = data => {
                res.status(200);
                res.send(data);
            }

            if (!req.body) {
                return sendForbidden();
            }

            if (req.body.token) {
                if (!req.body.version || req.body.version !== slsUtil.getCurrentVersion()) {
                    return sendForbidden();
                }

                if (req.body.token === 'super_secret_token') {
                    // req.body.version
                    return sendSuccess({ msg: 'Success!', filename: slsUtil.getSensitiveFilename() });
                }

                if (!req.body.email) {
                    return sendForbidden();
                }
            }

            if (req.body.email === 'demo@demo.demo') {
                return sendSuccess({ msg: 'Success! Check your inbox' });
            }

            return sendForbidden();
        });
    }
}

exports.onPostBuild = () => {
    if (IS_BUILD) {
        slsUtil.removeBuildFolder();
    }
}