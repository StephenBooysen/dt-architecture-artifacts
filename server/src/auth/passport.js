/**
 * @fileoverview Authorisation for Architecture Artifacts application.
 * 
 * This server provides the current auth capability for the Architecture Artifacts application.
 * Currently we use a passport local auth strategy. Google and Azure auth will be added
 * 
 * @author Architecture Artifacts Team
 * @version 1.0.0
 * @since 2025-08-02
 */
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const userStorage = require('./userStorage');

/**
 * Implement the passport local strategy 
 */
passport.use(new LocalStrategy(
  async (username, password, done) => {
    try {
      const user = await userStorage.authenticate(username, password);
      if (!user) {
        return done(null, false, { message: 'Invalid username or password' });
      }
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
));

/**
 * Serialize a user
 * @param {} user
 * @param {} done
 */
passport.serializeUser((user, done) => {
  done(null, user.id);
});

/**
 * Deserialize a user
 * @param {} user
 * @param {} done
 */
passport.deserializeUser(async (id, done) => {
  try {
    const user = userStorage.findUserById(id);
    if (!user) {
      return done(null, false);
    }
    done(null, { id: user.id, username: user.username, createdAt: user.createdAt, roles: user.roles || [], spaces: user.spaces });
  } catch (error) {
    done(error);
  }
});

module.exports = passport;