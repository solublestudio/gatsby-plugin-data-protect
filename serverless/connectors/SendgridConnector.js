const sgMail = require('@sendgrid/mail');
const fs = require('fs');

class SendgridConnector {
    constructor() {
        this.__init = false;
        this.__init = null;
    }
    
    init() {
        if (this.__init) {
            return;
        }

        sgMail.setApiKey(process.env.DATA_PROTECT_MAIL_KEY);
        this.__init = true;
    }

    getEmailContent(id) {
        let contents = fs.readFileSync('email.html', 'utf8');
        return contents.replace(/\{\{\s?login_url\s?\}\}/gm, `${process.env.public_url}/${process.env.login_path}/${id}`);
    }

    sendEmail(to, id, cb) {
        this.init();

        const msg = {
            to,
            from: process.env.DATA_PROTECT_MAIL_FROM ? process.env.DATA_PROTECT_MAIL_FROM : 'data-protect@gatsbyjs.org',
            subject: process.env.DATA_PROTECT_MAIL_SUBJECT ? process.env.DATA_PROTECT_MAIL_SUBJECT : `Access for private content`,
            //text: ``,
            html: this.getEmailContent(id)
        };

        sgMail.send(msg, false, (error, success) => {
            //console.log(error);
            //console.log(success);
            cb();
        });
    }
}

module.exports = SendgridConnector;