'use strict';

const SendgridConnector = require('./connectors/SendgridConnector');
const AirtableConnector = require('./connectors/AirtableConnector');
const versions = require('./versions.json');


const getReponse = (statusCode = 200, body = {}) => ({
    statusCode,
    body: JSON.stringify(body)
});

const sendForbidden = cb => {
    cb(null, getReponse(403, { msg: 'forbidden' }));
}

const sendError = (error, cb) => {
    cb(error, getReponse(500, { msg: 'internal server error' }));
}

const sendSuccess = (data, cb) => {
    cb(null, getReponse(200, data));
}


module.exports.login = (event, context, cb) => {
    if (!process.env.DATA_PROTECT_DB_KEY || !process.env.DATA_PROTECT_DB_NAME || !process.env.DATA_PROTECT_DB_TABLE || !process.env.DATA_PROTECT_MAIL_KEY) {
        return sendForbidden(cb);
    }

    const body = event.body ? JSON.parse(event.body) : null;
    const airtable = new AirtableConnector();

    if (!body) {
        return sendForbidden(cb);
    }

    if (body.token) {
        if (!body.version || !versions[body.version]) {
            return sendForbidden(cb);
        }

        return airtable.find(
            body.token,
            success => {
                if (success) {
                    sendSuccess({
                        msg: 'Success!',
                        filename: versions[body.version]
                    }, cb);
                } else {
                    sendForbidden(cb);
                }
            }
        );
    }

    if (!body.email) {
        return sendForbidden(cb);
    }

    const email = body.email.trim();

    if (process.env.DATA_PROTECT_MAIL_DOMAIN) {
        let isAllowed = false;
        
        process.env.DATA_PROTECT_MAIL_DOMAIN.split(',').filter(domain => !!domain.trim()).forEach(domain => {
            if (isAllowed) {
                return;
            }

            const regex = new RegExp(`@${domain.trim()}$`);
            if (regex.test(email)) {
                isAllowed = true;
            }
        });

        if (!isAllowed) {
            return sendForbidden(cb);
        }
    }

    airtable.login(
        email, 
        id => {
            const sendgrid = new SendgridConnector();
            sendgrid.sendEmail(email, id, () => {
                sendSuccess({ msg: "Success! Check your inbox, you'll have an email with a link to access." }, cb);
            });
        },
        error => {
            sendError(error, cb);
        }
    );
};

module.exports.version = (event, context, cb) => {
    sendSuccess(versions, cb);
}