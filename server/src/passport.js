import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { config } from './config.js';
import { upsertOAuthUser } from './db/users.js';
import { createId } from './utils/ids.js';

if (config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET && config.GOOGLE_CALLBACK_URL) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.GOOGLE_CLIENT_ID,
        clientSecret: config.GOOGLE_CLIENT_SECRET,
        callbackURL: config.GOOGLE_CALLBACK_URL
      },
      (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          const user = upsertOAuthUser({
            id: createId('usr'),
            provider: 'google',
            providerUserId: profile.id,
            email,
            name: profile.displayName || email || 'Google user',
            avatarUrl: profile.photos?.[0]?.value || null
          });
          done(null, user);
        } catch (error) {
          done(error);
        }
      }
    )
  );
}

if (config.GITHUB_CLIENT_ID && config.GITHUB_CLIENT_SECRET && config.GITHUB_CALLBACK_URL) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: config.GITHUB_CLIENT_ID,
        clientSecret: config.GITHUB_CLIENT_SECRET,
        callbackURL: config.GITHUB_CALLBACK_URL,
        scope: ['user:email']
      },
      (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.find((entry) => entry.primary)?.value || profile.emails?.[0]?.value;
          const user = upsertOAuthUser({
            id: createId('usr'),
            provider: 'github',
            providerUserId: profile.id,
            email,
            name: profile.displayName || profile.username || email || 'GitHub user',
            avatarUrl: profile.photos?.[0]?.value || null
          });
          done(null, user);
        } catch (error) {
          done(error);
        }
      }
    )
  );
}

export { passport };
