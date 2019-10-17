'use strict';

const unleash = require('unleash-server');
const enableKeycloak = require('./keycloak-auth-hook');

const options = {
    adminAuthentication: 'custom',
    preRouterHook: enableKeycloak,
};

unleash
    .start(options)
    .then(it => console.info(`Unleash has been started on http://localhost:${it.app.get('port')}`));
