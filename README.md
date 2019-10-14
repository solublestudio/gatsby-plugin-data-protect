# gatsby-plugin-data-protect

Gatsby plugin to protect content by email.

At Gatsby, all graphQL query results are present in distribution JS files. By inspecting them, you can reach that information. What if you want to protect some data to specific users targeted by their company email?
Using [Airtable](https://airtable.com/) as database, [Sendgrid](https://sendgrid.com/) as tool for sending emails, [AWS](https://aws.amazon.com/) and the awesome [Serverless](https://serverless.com/), this plugin:

* Persists the data you want to protect in an "unknown" local JSON file.
* Creates a login endpoint using different services from AWS (mainly AWS Lambda, AWS API Gateway) that validates the company email and sends an email to user for login. Once logged in, that endpoint get the name of the local JSON file with the protected data.
* It handles all "auth" flow: redirects to login page if there is protected data and user is not logged in. If user is logged in, it directly shows the data. It uses localStorage to store token and protected data, to avoid having to enter the email each time you enter the page.
* Saves the emails in an Airtable table.

We develop that plugin to protect some content, available only for company employees. You can use it also for external users, in example collecting emails to allow downloading a file. Is easy to add different database or email (SMS?) connectors. 
Feel free to submit a pull request with your integration.


## Install

`yarn add gatsby-plugin-data-protect`

or

`npm install --save gatsby-plugin-data-protect`


## How to use

1. Create a login page with the contents you want and a form with `id="data-protect-form"`. The plugin will automatically hook the form behaviour to handle login, and use that page and all subpages to handle auth.

```javascript
import React, { useRef, useEffect } from "react";

const LoginPage = () => {
  const form = useRef(null);

  useEffect(() => {
    form.current.addEventListener('loading', e => {
        // Event that will be executed when sending the form request
    });

    form.current.addEventListener('success', e => {
        // Event that will be executed on submit sucess
    });

    form.current.addEventListener('error', e => {
        // Event that will be executed on submit error
    });
  }, []);

  return (
    <>
      <h1>Login</h1>
      <form ref={form} id="data-protect-form">
          <input type="email" name="email" placeholder="Enter your email" />
      </form>
    </>
  );
}

export default LoginPage;
```

2. Include the plugin in your `gatsby-config.js` file with their mandatory options:

```javascript
plugins: [
    ...,
    {
        resolve: 'gatsby-plugin-data-protect',
        options: {
            version: '1', // Name of a version for the data.
            public_url: 'http://localhost:8000', // Public URL 
            login_path: 'login', // Path for the login page
            loading_component: require.resolve(`./src/components/Loader`), // Component you want to use for the "loading" state (there is one by default)
            data_protect_keys: [ 'privateData' ], // Keys of data from the pageContext you want to protect
        }
    },
...
]
```

3. Move the private data to `pageContext`: the only way we have to avoid adding graphQL query results into the client, is to remove them on build process. So you have to add all the private data in `createPage` function inside `gatsby-node.js`.

```javascript
exports.createPages = async ({ graphql, actions }) => {
    const { createPage } = actions;
    const component = path.resolve(`src/templates/index.js`);

    createPage({
        path: `/sensitive-page`,
        component,
        context: {
            publicData: 'lorem', // This data will be stored and directly shown in the template.
            privateData: 'ipsum', // This data will be replaced by a placeholder (as is a string, will be replaced by an empty string) if the user is not logged in, and hydrated by the local JSON file if the user is logged in
        }
    });
};
```

4. Create a new view in Airtable with an `Email` field.

5. Create a `.env` file in project root with all the keys we need to setup different services:

```
DATA_PROTECT_SERVER_NAME=project-name # This will be used to name all services in AWS.
DATA_PROTECT_SERVER_PROVIDER=aws # Serverless accepts more provider, but for the moment we only use AWS.
DATA_PROTECT_SERVER_REGION=eu-west-1 # AWS region
DATA_PROTECT_SERVER_SECRET=xxxxx # AWS Secret api key for a user with AdministratorAccess (check Serverless documentation)
DATA_PROTECT_SERVER_KEY=xxxxx # AWS Public api key
DATA_PROTECT_DB_PROVIDER=airtable # For the moment we only support Airtable.
DATA_PROTECT_DB_KEY=xxxx # Airtable private key
DATA_PROTECT_DB_NAME=xxxx # Airtable database id
DATA_PROTECT_DB_TABLE=Table 1 # Airtable database view for storing and getting users
DATA_PROTECT_MAIL_PROVIDER=sendgrid # For the moment we only support Sendgrid
DATA_PROTECT_MAIL_DOMAIN=solublestudio.com,soluble.studio # In case you want to restrict company emails
DATA_PROTECT_MAIL_KEY=xxxxx # Sendgrid key
DATA_PROTECT_MAIL_FROM=data-protect@solublestudio.com # Sendgrid from email
DATA_PROTECT_MAIL_SUBJECT=Access for private content # Email subject
DATA_PROTECT_MAIL_TEMPLATE=login-email.html # Email template you want to use. Check email.html inside serverless folder.
```

## License

Created by [Soluble Studio](https://www.solublestudio.com/). Released under the [MIT License](https://github.com/solublestudio/gatsby-plugin-data-protect/blob/master/LICENSE).