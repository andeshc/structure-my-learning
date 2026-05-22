const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
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

module.exports = passport;
