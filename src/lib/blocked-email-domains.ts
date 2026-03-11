// Disposable / temp / own-domain email blocklist
const BLOCKED_DOMAINS = new Set([
  // Own domain
  "ecomagent.in",

  // Mailinator family
  "mailinator.com", "mailinator2.com", "mailinater.com", "notmailinator.com",

  // Guerrilla Mail family
  "guerrillamail.com", "guerrillamail.net", "guerrillamail.org", "guerrillamail.biz",
  "guerrillamail.de", "guerrillamail.info", "guerrillamailblock.com",
  "sharklasers.com", "spam4.me", "grr.la",

  // Yopmail family
  "yopmail.com", "yopmail.fr", "cool.fr.nf", "jetable.fr.nf", "nospam.ze.tc",
  "nomail.xl.cx", "mega.zik.dj", "speed.1s.fr", "courriel.fr.nf",
  "moncourrier.fr.nf", "monemail.fr.nf", "monmail.fr.nf",

  // Temp-mail / throwaway
  "temp-mail.org", "temp-mail.io", "tempmail.com", "tempmail.net", "tempmail.org",
  "tempemail.net", "tempinbox.com", "throwam.com",

  // 10-minute mail family
  "10minutemail.com", "10minutemail.net", "10minutemail.org",
  "20minutemail.com", "20minutemail.it",

  // Trash mail family
  "trashmail.com", "trashmail.me", "trashmail.net", "trashmail.at",
  "trashmail.io", "trashmail.xyz", "trashmail.org",

  // Maildrop / disposable
  "maildrop.cc", "discard.email", "dispostable.com", "mailnesia.com",
  "mailnull.com", "mailexpire.com", "mailscrap.com",

  // Spamgourmet
  "spamgourmet.com", "spamgourmet.net", "spamgourmet.org",

  // Fake inbox / others
  "fakeinbox.com", "crap.la", "put2.net", "wh4f.org",
  "haltospam.com", "despam.it", "spamfree24.org", "spamfree.eu",
  "spamgap.com", "spamspot.com", "spamevader.info",
  "spamherelots.com", "spamhereplease.com",

  // Wegwerfmail
  "wegwerfmail.de", "wegwerfmail.net", "wegwerfmail.org",

  // Fake identity generator domains (fakepersongenerator etc.)
  "armyspy.com", "cuvox.de", "dayrep.com", "einrot.com", "fleckens.hu",
  "gustr.com", "inoutmail.de", "inoutmail.eu", "inoutmail.info", "inoutmail.net",
  "kronenzeitung.info", "objectmail.xyz", "obobbo.com", "rhyta.com",
  "sogetthis.com", "supergreatmail.com", "suremail.info", "teleworm.us",
  "trbvm.com", "trbvn.com", "trbvo.com", "jourrapide.com",

  // Misc common
  "getairmail.com", "filzmail.com", "mailnew.com", "mt2014.com", "mt2015.com",
  "uggsrock.com",
]);

export function isDisposableEmail(email: string): boolean {
  const lower = email.trim().toLowerCase();
  const atIndex = lower.lastIndexOf("@");
  if (atIndex < 0) return false;
  const domain = lower.slice(atIndex + 1);
  return BLOCKED_DOMAINS.has(domain);
}

export const DISPOSABLE_EMAIL_ERROR =
  "Disposable or temporary email addresses are not allowed. Please use a real email.";
