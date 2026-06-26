const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const AppleStrategy = require('passport-apple');
const FacebookStrategy = require('passport-facebook').Strategy;
const OAuth2Strategy = require('passport-oauth2');
const MicrosoftStrategy = require('passport-microsoft').Strategy;
const config = require('./config');
const users = require('./db/users');

function profileEmail(profile) {
  return profile.emails && profile.emails[0] ? profile.emails[0].value : null;
}

function normalizeProfile(provider, profile) {
  const email = profileEmail(profile) || `${provider}-${profile.id}@oauth.local`;
  return {
    provider,
    providerUserId: profile.id,
    email,
    name: profile.displayName || profile.username || email.split('@')[0],
    avatarUrl: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
  };
}

// LinkedIn (and other OpenID Connect providers) return standard userinfo
// claims rather than a Passport-shaped profile, so map them explicitly.
function normalizeOidcProfile(provider, claims) {
  const email = claims.email || `${provider}-${claims.sub}@oauth.local`;
  const name =
    claims.name ||
    [claims.given_name, claims.family_name].filter(Boolean).join(' ') ||
    email.split('@')[0];
  return {
    provider,
    providerUserId: claims.sub,
    email,
    name,
    avatarUrl: claims.picture || null,
  };
}

async function findOrCreateOAuthUser(data, done) {
  try {
    const account = await users.findOAuthAccount(data.provider, data.providerUserId);
    if (account) {
      done(null, await users.findUserById(account.user_id));
      return;
    }

    let user = await users.findUserByEmail(data.email);
    if (!user) {
      user = await users.createOAuthUser({
        provider: data.provider,
        name: data.name,
        email: data.email,
        avatarUrl: data.avatarUrl,
      });
    }

    await users.linkOAuthAccount({
      userId: user.id,
      provider: data.provider,
      providerUserId: data.providerUserId,
      providerEmail: data.email,
    });

    done(null, user);
  } catch (error) {
    done(error);
  }
}

if (config.google.clientId && config.google.clientSecret) {
  passport.use(new GoogleStrategy({
    clientID: config.google.clientId,
    clientSecret: config.google.clientSecret,
    callbackURL: config.google.callbackUrl,
  }, (_accessToken, _refreshToken, profile, done) => {
    findOrCreateOAuthUser(normalizeProfile('google', profile), done);
  }));
}

if (config.github.clientId && config.github.clientSecret) {
  passport.use(new GitHubStrategy({
    clientID: config.github.clientId,
    clientSecret: config.github.clientSecret,
    callbackURL: config.github.callbackUrl,
    scope: ['user:email'],
  }, (_accessToken, _refreshToken, profile, done) => {
    findOrCreateOAuthUser(normalizeProfile('github', profile), done);
  }));
}

if (config.apple.clientId && config.apple.teamId && config.apple.keyId && config.apple.privateKey) {
  passport.use(new AppleStrategy({
    clientID: config.apple.clientId,
    teamID: config.apple.teamId,
    keyID: config.apple.keyId,
    privateKeyString: config.apple.privateKey,
    callbackURL: config.apple.callbackUrl,
    passReqToCallback: true,
  }, (req, _accessToken, _refreshToken, idToken, profile, done) => {
    // Apple only sends name on the very first login — it's in req.body.user
    const appleUser = req.body?.user
      ? (typeof req.body.user === 'string' ? JSON.parse(req.body.user) : req.body.user)
      : {};
    const email = idToken?.email || appleUser.email || `apple-${profile.id}@oauth.local`;
    const firstName = appleUser.name?.firstName || '';
    const lastName = appleUser.name?.lastName || '';
    const name = [firstName, lastName].filter(Boolean).join(' ') || email.split('@')[0];
    findOrCreateOAuthUser({ provider: 'apple', providerUserId: profile.id, email, name, avatarUrl: null }, done);
  }));
}

if (config.facebook.clientId && config.facebook.clientSecret) {
  passport.use(new FacebookStrategy({
    clientID: config.facebook.clientId,
    clientSecret: config.facebook.clientSecret,
    callbackURL: config.facebook.callbackUrl,
    profileFields: ['id', 'displayName', 'emails', 'photos'],
  }, (_accessToken, _refreshToken, profile, done) => {
    findOrCreateOAuthUser(normalizeProfile('facebook', profile), done);
  }));
}

if (config.linkedin.clientId && config.linkedin.clientSecret) {
  // LinkedIn retired the r_liteprofile/r_emailaddress OAuth2 scopes; the current
  // path is "Sign In with LinkedIn using OpenID Connect" (scopes openid/profile/
  // email). Built on passport-oauth2 so it stays stateless like the other
  // strategies (no session-backed state store, unlike passport-openidconnect).
  const linkedinStrategy = new OAuth2Strategy({
    authorizationURL: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenURL: 'https://www.linkedin.com/oauth/v2/accessToken',
    clientID: config.linkedin.clientId,
    clientSecret: config.linkedin.clientSecret,
    callbackURL: config.linkedin.callbackUrl,
    scope: ['openid', 'profile', 'email'],
  }, (_accessToken, _refreshToken, claims, done) => {
    findOrCreateOAuthUser(normalizeOidcProfile('linkedin', claims), done);
  });

  // passport-oauth2 has no built-in profile fetch; pull the OIDC userinfo claims.
  linkedinStrategy.userProfile = function (accessToken, done) {
    fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`LinkedIn userinfo failed: ${res.status}`);
        return res.json();
      })
      .then((claims) => done(null, claims))
      .catch((err) => done(err));
  };

  passport.use('linkedin', linkedinStrategy);
}

if (config.microsoft.clientId && config.microsoft.clientSecret) {
  passport.use(new MicrosoftStrategy({
    clientID: config.microsoft.clientId,
    clientSecret: config.microsoft.clientSecret,
    callbackURL: config.microsoft.callbackUrl,
    scope: ['user.read'],
  }, (_accessToken, _refreshToken, profile, done) => {
    findOrCreateOAuthUser(normalizeProfile('microsoft', profile), done);
  }));
}

module.exports = passport;
