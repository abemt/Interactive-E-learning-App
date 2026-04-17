const crypto = require("crypto");
const { User } = require("../models");

const FAMILY_LINK_CODE_LENGTH = 6;
const FAMILY_LINK_CODE_CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

const normalizeFamilyLinkCode = (value) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

const generateFamilyLinkCodeCandidate = () => {
  const randomBytes = crypto.randomBytes(FAMILY_LINK_CODE_LENGTH);
  let code = "";

  for (let index = 0; index < FAMILY_LINK_CODE_LENGTH; index += 1) {
    code += FAMILY_LINK_CODE_CHARSET[randomBytes[index] % FAMILY_LINK_CODE_CHARSET.length];
  }

  return code;
};

const generateUniqueFamilyLinkCode = async (transaction = null) => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const code = generateFamilyLinkCodeCandidate();
    const existingUser = await User.findOne({
      where: { familyLinkCode: code },
      attributes: ["id"],
      transaction,
      lock: transaction ? transaction.LOCK.UPDATE : undefined
    });

    if (!existingUser) {
      return code;
    }
  }

  throw new Error("Unable to generate a unique family link code.");
};

module.exports = {
  FAMILY_LINK_CODE_LENGTH,
  normalizeFamilyLinkCode,
  generateUniqueFamilyLinkCode
};