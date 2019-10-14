const Airtable = require('airtable');

class AirtableConnector {
    constructor() {
        this.__init = false;
        this.__base = null;
    }

    init() {
        if (this.__init) {
            return;
        }

        Airtable.configure({
            endpointUrl: 'https://api.airtable.com',
            apiKey: process.env.DATA_PROTECT_DB_KEY
        });

        this.__base = Airtable.base(process.env.DATA_PROTECT_DB_NAME);
        this.__init = true;
    }

    login(email, successCallback, errorCallback) {
        if (!this.__init) {
            this.init();
        }

        this.__base(process.env.DATA_PROTECT_DB_TABLE).select({
            maxRecords: 1,
            filterByFormula: `Email="${email}"`
        }).eachPage((records, fetchNextPage) => {
            if (!records.length) {
                this.__base(process.env.DATA_PROTECT_DB_TABLE).create([
                        {
                        "fields": {
                            "Email": email
                        }
                    }
                ], function(err, records) {
                    if (err || !records.length) {
                        errorCallback(err);
                    } else {
                        successCallback(records[0].getId());
                    }
                });
            } else {
                successCallback(records[0].getId());
            }
        }, errorCallback);
    }

    find(token, callback) {
        if (!this.__init) {
            this.init();
        }
        
        this.__base(process.env.DATA_PROTECT_DB_TABLE).find(token, function(err, record) {
            callback(!err && record && record.id ? true : false);
        });
    }
}

module.exports = AirtableConnector;