const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const userStorage = require('./userStorage');

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

passport.serializeUser((user, done) => {
  done(null, user.id);
});

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