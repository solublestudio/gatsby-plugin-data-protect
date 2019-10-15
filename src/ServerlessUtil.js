const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const { execSync } = require('child_process');
const replace = require('replace');
const request = require('sync-request');
const uuid = require('uuid');


function extractUrls(output) {
    const expresion = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gm;
    const results = output.match(expresion);
    
    if (results && results.length) {
        return results;
    }

    return [];
}

function extractToken(output, tokenName = 'gatsbyPluginDataProtectApiKey') {
    const regex = new RegExp(`${tokenName}: (.+)`, 'gm');
    const results = regex.exec(output);

    if (results && results.length > 1) {
        return results[1];
    }

    return null;
}

function getVersionsData(url, token) {
    const res = request('GET', url, { headers: { 'x-api-key': token }});
    if (res.statusCode === 200) {
        return JSON.parse(res.getBody().toString());
    }
    
    return null;
}

class ServerlessUtil {
    constructor() {
        this.__init = false;
        this.__serverlessCmd = './node_modules/.bin/serverless';
        this.__baseFolder = path.resolve(__dirname, 'serverless');
        this.__buildFolder = path.resolve(__dirname, `.serverless${uuid().slice(0,6)}`);
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

    configure(options, stage = 'develop') {
        this.__options = {
            ...options,
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
        };

        this.__stage = stage;
    }

    init() {
        if (this.__init) {
            return;
        }

        fse.removeSync(this.__buildFolder);
        fse.copySync(this.__baseFolder, this.__buildFolder);
        
        const keysForEnvironment = [ 
            'DATA_PROTECT_DB_PROVIDER', 
            'DATA_PROTECT_DB_KEY', 
            'DATA_PROTECT_DB_NAME', 
            'DATA_PROTECT_DB_TABLE', 
            'DATA_PROTECT_MAIL_PROVIDER', 
            'DATA_PROTECT_MAIL_DOMAIN', 
            'DATA_PROTECT_MAIL_KEY', 
            'DATA_PROTECT_MAIL_FROM',
            'DATA_PROTECT_MAIL_SUBJECT',
            'public_url',
            'login_path'
        ];

        let environmentData = `  environment:`;
        keysForEnvironment.forEach(key => {
            environmentData += '\n' + `    ${key}: ${this.__options[key] ? this.__options[key] : ''}`;
        });

        replace({
            regex: `#  environment:`,
            replacement: environmentData,
            paths: [ `${this.__buildFolder}/serverless.yml` ],
            slient: true
        });

        replace({
            regex: `service: gatsby-plugin-data-protect`,
            replacement: `service: ${this.__options.DATA_PROTECT_SERVER_NAME}`,
            paths: [ `${this.__buildFolder}/serverless.yml` ],
            slient: true
        });

        replace({
            regex: `gatsbyPluginDataProtectApiKey`,
            replacement: `${this.__options.DATA_PROTECT_SERVER_NAME}-${this.__stage}-apikey`,
            paths: [ `${this.__buildFolder}/serverless.yml` ],
            slient: true
        });

        if (this.__options.DATA_PROTECT_MAIL_TEMPLATE) {
            fse.copySync(
                path.resolve(this.__options.DATA_PROTECT_MAIL_TEMPLATE),
                `${this.__buildFolder}/email.html`,
            );
        }

        const stdout = this.execCommand('npm install');
        this.__init = true;
    }

    execCommand(command) {
        try {
            return execSync(
                command,
                { 
                    cwd: this.__buildFolder,
                    encoding: 'utf8',
                    stdio: 'ignore',
                    env: process.env
                }
            );
        } catch (error) {
            //console.log(error);
            return null;
        }
    }

    fetchApiData() {
        this.configCredentials();

        const params = [
            `--region ${this.__options.DATA_PROTECT_SERVER_REGION}`,
            `--stage ${this.__stage}`
        ];
        
        const stdout = this.execCommand(`${this.__serverlessCmd} info ${params.join(' ')}`);
        
        if (stdout) {
            this.persistDataFromServerless(stdout);
        }
    }

    fetchVersionsData() {
        if (this.__urls.version && this.__token) {
            const data = getVersionsData(this.__urls.version, this.__token);
            if (data) {
                this.__versions = data;
            }
        }

        this.__versions[this.__options.version] = this.__sensitiveFilename;

        fs.writeFileSync(
            `${this.__buildFolder}/versions.json`,
            JSON.stringify(this.__versions),
            'utf8'
        );
    }

    getProfileName() {
        return `build_${this.__options.DATA_PROTECT_SERVER_NAME.replace(/-/g, "")}`;
    }

    configCredentials() {
        const credentialParams = [
            `--provider ${this.__options.DATA_PROTECT_SERVER_PROVIDER}`,
            `--key ${this.__options.DATA_PROTECT_SERVER_KEY}`,
            `--secret ${this.__options.DATA_PROTECT_SERVER_SECRET}`,
            `--profile ${this.getProfileName()}`,
            `--overwrite`
        ];

        this.execCommand(`${this.__serverlessCmd} config credentials ${credentialParams.join(' ')}`);
    }

    publish() {
        this.configCredentials();

        const deployParams = [
            `--stage ${this.__stage}`,
            `--aws-profile ${this.getProfileName()}`,
            `--region ${this.__options.DATA_PROTECT_SERVER_REGION}`
        ];

        const stdout = this.execCommand(`${this.__serverlessCmd} deploy ${deployParams.join(' ')}`);
        if (stdout) {
            this.persistDataFromServerless(stdout);
        }
    }

    persistDataFromServerless(stdout) {
        if (!stdout) {
            return;
        }

        const urls = extractUrls(stdout);

        if (urls && urls.length) {
            urls.forEach(url => {
                Object.keys(this.__urls).forEach(urlType => {
                    if (url.endsWith(urlType)) {
                        this.__urls[urlType] = url;
                    }
                });
            });
        }

        const token = extractToken(stdout, `${this.__options.DATA_PROTECT_SERVER_NAME}-${this.__stage}-apikey`);

        if (token) {
            this.__token = token;
        }
    }

    getLoginUrl() {
        return this.__urls.login;
    }

    getSensitiveFilename() {
        return this.__sensitiveFilename;
    }

    getCurrentVersion() {
        return this.__options.version;
    }

    getPublicUrl() {
        return this.__options.public_url;
    }

    removeBuildFolder() {
        fse.removeSync(this.__buildFolder);
    }
}

module.exports = ServerlessUtil;