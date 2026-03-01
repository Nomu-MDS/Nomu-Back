import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import bcrypt from "bcrypt";
import { User, Profile, Wallet } from "../models/index.js";

passport.use(
  new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
    try {
      const user = await User.findOne({ where: { email } });
      if (!user) return done(null, false, { message: "Incorrect email or password" });

      // Si le mot de passe en DB est null (compte créé autrement), refuser
      if (!user.password) return done(null, false, { message: "No local password set" });

      const match = await bcrypt.compare(password, user.password);
      if (!match) return done(null, false, { message: "Incorrect email or password" });

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
);

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, googleProfile, done) => {
      try {
        const email = googleProfile.emails?.[0]?.value;
        if (!email) return done(null, false, { message: "No email from Google" });

        let user = await User.findOne({ where: { google_id: googleProfile.id } });

        let isNew = false;

        if (!user) {
          user = await User.findOne({ where: { email } });
          if (user) {
            await user.update({ google_id: googleProfile.id });
          } else {
            user = await User.create({
              name: googleProfile.displayName || email.split("@")[0],
              email,
              password: null,
              google_id: googleProfile.id,
              role: "user",
              is_active: true,
            });
            await Profile.create({ user_id: user.id, is_searchable: false });
            await Wallet.create({ user_id: user.id, balance: 0 });
            isNew = true;
          }
        }

        user._isNew = isNew;
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

export default passport;
