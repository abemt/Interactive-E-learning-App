const normalizeNamePart = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim();

const sanitizeUsernameBase = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, "")
    .replace(/\.+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .trim();

const buildUsernameBase = (fullName, role, email) => {
  const rolePrefix = String(role || "Student").slice(0, 1).toLowerCase() || "u";
  const namePart = normalizeNamePart(fullName).replace(/\s+/g, ".");

  if (namePart) {
    return sanitizeUsernameBase(`${rolePrefix}.${namePart}`) || `${rolePrefix}.user`;
  }

  const emailLocalPart = String(email || "")
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, "")
    .replace(/\.+/g, ".")
    .replace(/^\.+|\.+$/g, "");

  if (emailLocalPart) {
    return sanitizeUsernameBase(`${rolePrefix}.${emailLocalPart}`) || `${rolePrefix}.user`;
  }

  return `${rolePrefix}.user`;
};

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Users", "username", {
      type: Sequelize.STRING(160),
      allowNull: true
    });

    const [users] = await queryInterface.sequelize.query(
      "SELECT id, fullName, email, role FROM Users ORDER BY id ASC"
    );

    const usedUsernames = new Set();

    for (const user of users) {
      const base = buildUsernameBase(user.fullName, user.role, user.email);
      let candidate = base;
      let suffix = 2;

      while (usedUsernames.has(candidate)) {
        candidate = `${base}${suffix}`;
        suffix += 1;
      }

      usedUsernames.add(candidate);

      await queryInterface.sequelize.query(
        "UPDATE Users SET username = :username WHERE id = :id",
        {
          replacements: {
            username: candidate,
            id: user.id
          }
        }
      );
    }

    await queryInterface.changeColumn("Users", "username", {
      type: Sequelize.STRING(160),
      allowNull: false
    });

    await queryInterface.addIndex("Users", ["username"], {
      unique: true,
      name: "users_username_unique"
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("Users", "users_username_unique");
    await queryInterface.removeColumn("Users", "username");
  }
};
