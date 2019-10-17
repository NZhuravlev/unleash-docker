'use strict';

/**
 * Keycloak hook for securing an Unleash server
 *
 * This example assumes that all users authenticating via
 * keycloak should have access. You would probably limit access
 * to users you trust.
 *
 * The implementation assumes the following environment variables:
 *
 *  - AUTH_HOST
 *  - AUTH_REALM
 *  - AUTH_CLIENT_ID
 */

const { User, AuthenticationRequired } = require('unleash-server');

const KeycloakStrategy = require('@exlinc/keycloak-passport');
const passport = require('passport');

const host = process.env.AUTH_HOST;
const realm = process.env.AUTH_REALM;
const clientID = process.env.AUTH_CLIENT_ID;
const contextPath = process.env.CONTEXT_PATH === '/' ? '' : process.env.CONTEXT_PATH;
const clientSecret = process.env.CLIENT_SECRET;
const secret = process.env.SECRET;

passport.use(
    'keycloak',
    new KeycloakStrategy(
        {
            host,
            realm,
            clientID,
            clientSecret: clientSecret,
            callbackURL: `${contextPath}/api/auth/callback`,
            authorizationURL: `${host}/auth/realms/${realm}/protocol/openid-connect/auth`,
            tokenURL: `${host}/auth/realms/${realm}/protocol/openid-connect/token`,
            userInfoURL: `${host}/auth/realms/${realm}/protocol/openid-connect/userinfo`,
        },

        (accessToken, refreshToken, profile, done) => {
            done(
                null,
                new User({
                    name: profile.fullName,
                    email: profile.email,
                })
            );
        }
    )
);

function enableKeycloakOauth(app) {
    console.log(`Initializing keycloak auth. Host: ${host}. Realm: ${realm}. ClientID: ${clientID}. Context path: ${contextPath}`);
    app.use(passport.initialize());
    app.use(passport.session());

    passport.serializeUser((user, done) => done(null, user));
    passport.deserializeUser((user, done) => done(null, user));

    app.use('/api/client', (req, res, next) => {
        if (req.header('Authorization') !== secret) {
            res.sendStatus(401);
        } else {
            next();
        }
    });

    app.get('/api/admin/login', passport.authenticate('keycloak'));

    app.get(
        '/api/auth/callback',
        passport.authenticate('keycloak'),
        (req, res) => {
            console.log('Authenticated', res);
            res.redirect(`${contextPath}/`);
        }
    );

    app.use('/api/admin/', (req, res, next) => {
        if (req.user) {
            next();
        } else {
            // Instruct unleash-frontend to pop-up auth dialog
            return res
                .status('401')
                .json(
                    new AuthenticationRequired({
                        path: `${contextPath}/api/admin/login`,
                        type: 'custom',
                        message: `You have to identify yourself in order to use Unleash. 
                        Click the button and follow the instructions.`,
                    })
                )
                .end();
        }
    });
}

module.exports = enableKeycloakOauth;
