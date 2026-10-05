import common from "./common.json";
import home from "./home.json";
import landing from "./landing.json";
import pricing from "./pricing.json";
import search from "./search.json";
import profile from "./profile.json";
import booking from "./booking.json";
import apply from "./apply.json";
import legal from "./legal.json";
import account from "./account.json";
import sitter from "./sitter.json";
import auth from "./auth.json";
import chat from "./chat.json";
import misc from "./misc.json";

// One file per namespace so areas can be translated independently. Keys must match across languages (npm run i18n:check).
const messages = { common, home, landing, pricing, search, profile, booking, apply, legal, account, sitter, auth, chat, misc };

export default messages;
