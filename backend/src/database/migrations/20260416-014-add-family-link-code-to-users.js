const crypto = require("crypto");

const FAMILY_LINK_CODE_CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const FAMILY_LINK_CODE_LENGTH = 6;

const generateFamilyLinkCodeCandidate = () => {
  const randomBytes = crypto.randomBytes(FAMILY_LINK_CODE_LENGTH);
  let code = "";

  for (let index = 0; index < FAMILY_LINK_CODE_LENGTH; index += 1) {
    code += FAMILY_LINK_CODE_CHARSET[randomBytes[index] % FAMILY_LINK_CODE_CHARSET.length];
  }

  return code;
};

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Users", "family_link_code", {
      type: Sequelize.STRING(6),
      allowNull: true
    });

    await queryInterface.addIndex("Users", ["family_link_code"], {
      unique: true,
      name: "users_family_link_code_unique"
    });

    const [studentRows] = await queryInterface.sequelize.query(
      "SELECT id FROM Users WHERE role = 'Student' AND (family_link_code IS NULL OR family_link_code = '')"
    );

    const usedCodes = new Set();

    for (const row of studentRows) {
      let code = null;

      for (let attempt = 0; attempt < 100; attempt += 1) {
        const candidate = generateFamilyLinkCodeCandidate();

        if (usedCodes.has(candidate)) {
          continue;
        }

        const [existingRows] = await queryInterface.sequelize.query(
          "SELECT id FROM Users WHERE family_link_code = ? LIMIT 1",
          { replacements: [candidate] }
        );

        if (existingRows.length === 0) {
          code = candidate;
          break;
        }

        usedCodes.add(candidate);
      }

      if (!code) {
        throw new Error("Unable to backfill a unique family link code for an existing student.");
      }

      usedCodes.add(code);

      await queryInterface.sequelize.query(
        "UPDATE Users SET family_link_code = ? WHERE id = ?",
        {
          replacements: [code, row.id]
        }
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("Users", "users_family_link_code_unique");
    await queryInterface.removeColumn("Users", "family_link_code");
  }
};