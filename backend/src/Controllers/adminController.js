const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const PDFDocument = require("pdfkit");
const XLSX = require("xlsx");
const { Op } = require("sequelize");
const { processBulkUpload } = require("../Services/bulkUploadService");
const { generateUniqueFamilyLinkCode } = require("../Services/familyLinkCodeService");
const {
  sequelize,
  Class,
  User,
  ContentModule,
  TeacherClass,
  ClassCourse,
  ParentStudentMapping
} = require("../models");

const ALLOWED_ROLES = ["Student", "Teacher", "Parent", "Admin"];
const MANAGED_USER_ROLES = ["Student", "Teacher", "Parent"];

const normalizeRole = (role) => {
  const roleText = String(role || "Student").trim();
  if (!roleText) return "Student";

  const normalized = roleText.charAt(0).toUpperCase() + roleText.slice(1).toLowerCase();
  return ALLOWED_ROLES.includes(normalized) ? normalized : null;
};

const makeSafeNamePart = (value) =>
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

const buildUsernameBase = (fullName, role) => {
  const compactName = makeSafeNamePart(fullName).replace(/\s+/g, ".");
  const rolePrefix = String(role || "Student").slice(0, 1).toLowerCase() || "u";
  return compactName ? `${rolePrefix}.${compactName}` : `${rolePrefix}.user`;
};

const buildDefaultEmail = (username) => `${username}@school.local`;

const normalizeEmailAddress = (value) => String(value || "").trim().toLowerCase();

const buildDisplayNameFromEmail = (email) => {
  const localPart = normalizeEmailAddress(email).split("@")[0].replace(/[._-]+/g, " ").trim();

  if (!localPart) {
    return "Parent User";
  }

  return localPart.replace(/\b\w/g, (char) => char.toUpperCase());
};

const reserveUniqueUsername = (baseValue, usedUsernames, isBlockedCandidate = () => false) => {
  const safeBase = sanitizeUsernameBase(baseValue) || "u.user";
  let candidate = safeBase;
  let suffix = 2;

  while (usedUsernames.has(candidate) || isBlockedCandidate(candidate)) {
    candidate = `${safeBase}${suffix}`;
    suffix += 1;
  }

  usedUsernames.add(candidate);
  return candidate;
};

const ensureUniqueUsername = async ({ fullName, role, transaction }) => {
  const safeBase = sanitizeUsernameBase(buildUsernameBase(fullName, role)) || "u.user";
  let candidate = safeBase;
  let suffix = 2;

  while (true) {
    const existingUser = await User.findOne({
      where: { username: candidate },
      attributes: ["id"],
      transaction,
      lock: transaction ? transaction.LOCK.UPDATE : undefined
    });

    if (!existingUser) {
      return candidate;
    }

    candidate = `${safeBase}${suffix}`;
    suffix += 1;
  }
};

const formatClassLabel = (classRecord) => {
  if (!classRecord) {
    return null;
  }

  return classRecord.gradeLevel
    ? `${classRecord.name} (${classRecord.gradeLevel})`
    : classRecord.name;
};

const loadCredentialSets = async (transaction) => {
  const existingUsers = await User.findAll({
    attributes: ["username", "email"],
    paranoid: false,
    transaction,
    lock: transaction ? transaction.LOCK.UPDATE : undefined
  });

  return {
    usedUsernames: new Set(
      existingUsers
        .map((user) => String(user.username || "").trim().toLowerCase())
        .filter(Boolean)
    ),
    usedEmails: new Set(
      existingUsers
        .map((user) => String(user.email || "").trim().toLowerCase())
        .filter(Boolean)
    )
  };
};

const applyUserReactivationFields = async ({ userId, transaction, hasIsActiveColumn, hasDeletedAtColumn }) => {
  const assignments = [];
  const replacements = { userId };

  if (hasIsActiveColumn) {
    assignments.push("`isActive` = :isActive");
    replacements.isActive = true;
  }

  if (hasDeletedAtColumn) {
    assignments.push("`deletedAt` = NULL");
  }

  if (assignments.length === 0) {
    return;
  }

  await sequelize.query(
    `UPDATE \`Users\` SET ${assignments.join(", ")} WHERE \`id\` = :userId`,
    {
      replacements,
      transaction
    }
  );
};

const generateSecurePassword = () => {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^*";
  const random = crypto.randomBytes(14);
  let password = "";

  for (let i = 0; i < 12; i += 1) {
    password += charset[random[i] % charset.length];
  }

  return password;
};

const parseUniquePositiveIds = (values) => {
  if (!Array.isArray(values)) {
    return null;
  }

  return [...new Set(values.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0))];
};

const parsePositiveInteger = (rawValue, fallback) => {
  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

const parseUploadedUsers = (file) => {
  const extension = path.extname(file.originalname || "").toLowerCase();

  if (![".csv", ".xlsx", ".xls"].includes(extension)) {
    throw new Error("Unsupported file type. Upload CSV, XLSX, or XLS.");
  }

  const workbook = XLSX.read(file.buffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    return [];
  }

  const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], { defval: "" });
  return rawRows.map((row, index) => ({
    line: index + 2,
    fullName: String(row.fullName || row.FullName || row.name || row.Name || "").trim(),
    username: String(row.username || row.Username || "").trim(),
    email: String(row.email || row.Email || "").trim().toLowerCase(),
    role: String(row.role || row.Role || "Student").trim(),
    className: String(row.className || row.ClassName || row.class || row.Class || "").trim(),
    parentEmail: normalizeEmailAddress(row.parentEmail || row.ParentEmail || row.parent_email || row.Parent_email)
  }));
};

const classInclude = [
  {
    model: User,
    as: "teacher",
    attributes: ["id", "fullName", "username", "email"]
  },
  {
    model: ContentModule,
    as: "assignedModules",
    attributes: ["id", "title", "description", "classId", "createdAt"],
    through: { attributes: [] }
  },
  {
    model: User,
    as: "assignedTeachers",
    attributes: ["id", "fullName", "username", "email"],
    through: { attributes: [] }
  }
];

const createCredentialsPdf = (credentialsRows) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(18).text("Bulk User Import Credentials", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Generated on: ${new Date().toISOString()}`, { align: "center" });
    doc.moveDown();

    doc
      .fontSize(11)
      .text(
        "Distribute credentials securely. Per the credential document policy, users must change the temporary password at first login before accessing the platform."
      );
    doc.moveDown();

    credentialsRows.forEach((entry, idx) => {
      if (doc.y > 740) {
        doc.addPage();
      }

      doc
        .fontSize(12)
        .text(`${idx + 1}. ${entry.fullName} (${entry.role})`, { underline: true })
        .moveDown(0.2)
        .fontSize(10)
        .text(`Username: ${entry.username}`)
        .text(`Email: ${entry.email}`)
        .text(`Temporary Password: ${entry.plainPassword}`)
        .text(`Class: ${entry.className || "N/A"}`)
        .moveDown(0.7);

      if (entry.note) {
        doc.fontSize(10).text(entry.note);
      }

      if (entry.familyLinkCode && entry.role === "Student") {
        doc.fontSize(10).text(`Family Link Code: ${entry.familyLinkCode}`);
      }

      if (entry.linkedStudentNames && entry.linkedStudentNames.length > 0) {
        doc.fontSize(10).text(`Linked Students: ${[...new Set(entry.linkedStudentNames)].join(", ")}`);
      }

      doc.moveDown(0.4);
    });

    doc.end();
  });

const uploadContentBulk = async (req, res) => {
  try {
    const summary = await processBulkUpload(req.file);
    return res.status(201).json({
      message: "Bulk upload completed.",
      summary
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const createClassroom = async (req, res) => {
  try {
    const { name, gradeLevel, teacherId } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: "Class name is required." });
    }

    let teacher = null;
    if (teacherId !== undefined && teacherId !== null && teacherId !== "") {
      teacher = await User.findByPk(Number(teacherId));
      if (!teacher || teacher.role !== "Teacher") {
        return res.status(400).json({ message: "teacherId must belong to an existing Teacher user." });
      }
    }

    const classRecord = await Class.create({
      name: String(name).trim(),
      gradeLevel: gradeLevel ? String(gradeLevel).trim() : null,
      teacherId: teacher ? teacher.id : null
    });

    if (teacher) {
      await TeacherClass.findOrCreate({
        where: {
          classId: classRecord.id,
          teacherId: teacher.id
        },
        defaults: {
          classId: classRecord.id,
          teacherId: teacher.id
        }
      });
    }

    return res.status(201).json({
      message: "Classroom created successfully.",
      data: classRecord
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to create classroom." });
  }
};

const listClassrooms = async (_req, res) => {
  try {
    const classes = await Class.findAll({
      include: classInclude,
      order: [["createdAt", "DESC"]]
    });

    return res.status(200).json({
      count: classes.length,
      data: classes
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to load classrooms." });
  }
};

const updateClassroom = async (req, res) => {
  try {
    const classId = Number(req.params.classId);
    if (!Number.isInteger(classId) || classId <= 0) {
      return res.status(400).json({ message: "Invalid classId." });
    }

    const hasName = Object.prototype.hasOwnProperty.call(req.body || {}, "name");
    const hasGradeLevel = Object.prototype.hasOwnProperty.call(req.body || {}, "gradeLevel");
    const hasTeacherId = Object.prototype.hasOwnProperty.call(req.body || {}, "teacherId");

    if (!hasName && !hasGradeLevel && !hasTeacherId) {
      return res.status(400).json({ message: "Provide at least one field to update." });
    }

    if (hasName && !String(req.body.name || "").trim()) {
      return res.status(400).json({ message: "Class name cannot be empty." });
    }

    const classRecord = await Class.findByPk(classId);
    if (!classRecord) {
      return res.status(404).json({ message: "Class not found." });
    }

    let teacher = null;
    if (hasTeacherId && req.body.teacherId !== null && req.body.teacherId !== "") {
      teacher = await User.findByPk(Number(req.body.teacherId));
      if (!teacher || teacher.role !== "Teacher") {
        return res.status(400).json({ message: "teacherId must belong to an existing Teacher user." });
      }
    }

    await sequelize.transaction(async (transaction) => {
      const updates = {};

      if (hasName) {
        updates.name = String(req.body.name).trim();
      }

      if (hasGradeLevel) {
        updates.gradeLevel = req.body.gradeLevel ? String(req.body.gradeLevel).trim() : null;
      }

      if (hasTeacherId) {
        updates.teacherId = teacher ? teacher.id : null;
      }

      if (Object.keys(updates).length > 0) {
        await classRecord.update(updates, { transaction });
      }

      if (teacher) {
        await TeacherClass.findOrCreate({
          where: { classId: classRecord.id, teacherId: teacher.id },
          defaults: { classId: classRecord.id, teacherId: teacher.id },
          transaction
        });
      }
    });

    const refreshedClass = await Class.findByPk(classId, {
      include: classInclude
    });

    return res.status(200).json({
      message: "Classroom updated successfully.",
      data: refreshedClass
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to update classroom." });
  }
};

const deleteClassroom = async (req, res) => {
  try {
    const classId = Number(req.params.classId);
    if (!Number.isInteger(classId) || classId <= 0) {
      return res.status(400).json({ message: "Invalid classId." });
    }

    const classRecord = await Class.findByPk(classId);
    if (!classRecord) {
      return res.status(404).json({ message: "Class not found." });
    }

    await classRecord.destroy();

    return res.status(200).json({
      message: "Classroom deleted successfully.",
      data: { id: classId }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to delete classroom." });
  }
};

const listManagedUsers = async (req, res) => {
  try {
    const requestedRole = String(req.query?.role || "").trim();
    const roleFilter = requestedRole ? normalizeRole(requestedRole) : null;
    if (requestedRole && !roleFilter) {
      return res.status(400).json({ message: "Invalid role filter. Use Admin, Teacher, Student, or Parent." });
    }

    const classIdRaw = String(req.query?.class_id || "").trim();
    const classIdFilter = classIdRaw ? Number(classIdRaw) : null;
    if (classIdRaw && (!Number.isInteger(classIdFilter) || classIdFilter <= 0)) {
      return res.status(400).json({ message: "class_id must be a positive integer." });
    }

    const searchInput = String(req.query?.search || "").trim();
    const page = parsePositiveInteger(req.query?.page, 1);
    const limit = Math.min(parsePositiveInteger(req.query?.limit, 20), 100);
    const offset = (page - 1) * limit;

    let teacherIdsForClass = [];
    if (classIdFilter) {
      const teacherLinks = await TeacherClass.findAll({
        where: { classId: classIdFilter },
        attributes: ["teacherId"]
      });

      teacherIdsForClass = [...new Set(
        teacherLinks
          .map((row) => Number(row.teacherId))
          .filter((value) => Number.isInteger(value) && value > 0)
      )];
    }

    const userWhere = {};
    if (roleFilter) {
      userWhere.role = roleFilter;
    }

    if (searchInput) {
      const searchLike = `%${searchInput}%`;
      const searchClauses = [
        { fullName: { [Op.like]: searchLike } },
        { username: { [Op.like]: searchLike } },
        { email: { [Op.like]: searchLike } }
      ];

      if (/^\d+$/.test(searchInput)) {
        searchClauses.push({ id: Number(searchInput) });
      }

      userWhere[Op.and] = userWhere[Op.and] || [];
      userWhere[Op.and].push({ [Op.or]: searchClauses });
    }

    if (classIdFilter) {
      if (roleFilter === "Teacher") {
        if (teacherIdsForClass.length === 0) {
          userWhere.id = { [Op.eq]: -1 };
        } else {
          userWhere.id = { [Op.in]: teacherIdsForClass };
        }
      } else if (roleFilter && roleFilter !== "Teacher" && roleFilter !== "Admin") {
        userWhere.classId = classIdFilter;
      } else if (roleFilter === "Admin") {
        userWhere.id = { [Op.eq]: -1 };
      } else if (!roleFilter) {
        userWhere[Op.and] = userWhere[Op.and] || [];
        userWhere[Op.and].push({
          [Op.or]: [
            { classId: classIdFilter },
            teacherIdsForClass.length > 0
              ? { id: { [Op.in]: teacherIdsForClass } }
              : { id: { [Op.eq]: -1 } }
          ]
        });
      }
    }

    const usersResult = await User.findAndCountAll({
      where: userWhere,
      attributes: ["id", "fullName", "username", "email", "role", "classId", "createdAt", "updatedAt"],
      include: [
        {
          model: Class,
          as: "enrolledClass",
          attributes: ["id", "name", "gradeLevel"],
          required: false
        },
        {
          model: Class,
          as: "assignedClasses",
          attributes: ["id", "name", "gradeLevel"],
          through: { attributes: [] },
          required: false
        }
      ],
      distinct: true,
      order: [["role", "ASC"], ["fullName", "ASC"], ["id", "ASC"]]
      ,
      limit,
      offset
    });

    const users = usersResult.rows || [];
    const totalItems = Number(usersResult.count) || 0;
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));

    const data = users.map((user) => {
      const assignedClasses = (user.assignedClasses || []).map((classRecord) => ({
        id: classRecord.id,
        name: classRecord.name,
        gradeLevel: classRecord.gradeLevel,
        label: formatClassLabel(classRecord)
      }));

      let assignedClassLabel = "-";
      if (user.role === "Teacher") {
        assignedClassLabel =
          assignedClasses.length > 0
            ? assignedClasses.map((classRecord) => classRecord.label).join(", ")
            : "-";
      } else if (user.enrolledClass) {
        assignedClassLabel = formatClassLabel(user.enrolledClass);
      }

      return {
        id: user.id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        role: user.role,
        classId: user.classId,
        status: "Active",
        assignedClass: assignedClassLabel,
        enrolledClass: user.enrolledClass
          ? {
            id: user.enrolledClass.id,
            name: user.enrolledClass.name,
            gradeLevel: user.enrolledClass.gradeLevel,
            label: formatClassLabel(user.enrolledClass)
          }
          : null,
        assignedClasses,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };
    });

    return res.status(200).json({
      count: totalItems,
      data,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasPrevious: page > 1,
        hasNext: page < totalPages
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to load users." });
  }
};

const resetUserCredentials = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const temporaryPassword = String(req.body?.temporaryPassword || "").trim();

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ message: "Invalid userId." });
    }

    if (temporaryPassword.length < 6) {
      return res.status(400).json({ message: "Temporary password must be at least 6 characters long." });
    }

    const user = await User.findOne({
      where: {
        id: userId,
        role: {
          [Op.in]: MANAGED_USER_ROLES
        }
      }
    });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    await sequelize.transaction(async (transaction) => {
      let username = user.username;

      if (!username) {
        username = await ensureUniqueUsername({
          fullName: user.fullName,
          role: user.role,
          transaction
        });
      }

      await user.update(
        {
          username,
          passwordHash,
          needsPasswordChange: true
        },
        { transaction }
      );
    });

    return res.status(200).json({
      message: "Credentials reset successfully.",
      data: {
        id: user.id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        role: user.role,
        status: "Active"
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to reset credentials." });
  }
};

const deleteManagedUser = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const requestingAdminId = Number(req.user?.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ message: "Invalid userId." });
    }

    if (!Number.isInteger(requestingAdminId) || requestingAdminId <= 0) {
      return res.status(401).json({ message: "Unauthorized admin session." });
    }

    if (userId === requestingAdminId) {
      return res.status(400).json({ message: "You cannot delete your own admin account." });
    }

    const user = await User.findByPk(userId, {
      attributes: ["id", "fullName", "username", "email", "role"]
    });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (!ALLOWED_ROLES.includes(user.role)) {
      return res.status(400).json({ message: "This account cannot be deleted by admin." });
    }

    if (user.role === "Admin") {
      const remainingAdminCount = await User.count({
        where: {
          role: "Admin",
          id: {
            [Op.ne]: user.id
          }
        }
      });

      if (remainingAdminCount < 1) {
        return res.status(400).json({ message: "Cannot delete the last remaining admin account." });
      }
    }

    await sequelize.transaction(async (transaction) => {
      await user.destroy({ transaction });
    });

    return res.status(200).json({
      message: "User deleted successfully.",
      data: {
        id: user.id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to delete user." });
  }
};

const linkParentToStudent = async (req, res) => {
  try {
    const parentId = Number(req.body?.parentId ?? req.body?.parent_id);
    const studentId = Number(req.body?.studentId ?? req.body?.student_id);

    if (!Number.isInteger(parentId) || parentId <= 0) {
      return res.status(400).json({ message: "parentId must be a positive integer." });
    }

    if (!Number.isInteger(studentId) || studentId <= 0) {
      return res.status(400).json({ message: "studentId must be a positive integer." });
    }

    if (parentId === studentId) {
      return res.status(400).json({ message: "parentId and studentId cannot be the same user." });
    }

    const [parent, student] = await Promise.all([
      User.findByPk(parentId, {
        attributes: ["id", "fullName", "username", "email", "role"]
      }),
      User.findByPk(studentId, {
        attributes: ["id", "fullName", "username", "email", "role", "classId"]
      })
    ]);

    if (!parent) {
      return res.status(404).json({ message: "Parent user not found." });
    }

    if (parent.role !== "Parent") {
      return res.status(400).json({ message: "parentId must belong to a Parent user." });
    }

    if (!student) {
      return res.status(404).json({ message: "Student user not found." });
    }

    if (student.role !== "Student") {
      return res.status(400).json({ message: "studentId must belong to a Student user." });
    }

    const [mapping, created] = await ParentStudentMapping.findOrCreate({
      where: {
        parentId: parent.id,
        studentId: student.id
      },
      defaults: {
        parentId: parent.id,
        studentId: student.id
      }
    });

    return res.status(created ? 201 : 200).json({
      message: created
        ? "Parent linked to student successfully."
        : "Parent and student are already linked.",
      data: {
        mappingId: mapping.id,
        parent: {
          id: parent.id,
          fullName: parent.fullName,
          username: parent.username,
          email: parent.email
        },
        student: {
          id: student.id,
          fullName: student.fullName,
          username: student.username,
          email: student.email,
          classId: student.classId
        },
        created
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to link parent and student." });
  }
};

const listModulesForAssignment = async (_req, res) => {
  try {
    const modules = await ContentModule.findAll({
      include: [
        {
          model: Class,
          as: "class",
          attributes: ["id", "name", "gradeLevel"]
        }
      ],
      attributes: ["id", "title", "description", "classId", "createdAt"],
      order: [["createdAt", "DESC"]]
    });

    return res.status(200).json({
      count: modules.length,
      data: modules
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to load modules." });
  }
};

const listTeachersForAssignment = async (_req, res) => {
  try {
    const teachers = await User.findAll({
      where: { role: "Teacher" },
      attributes: ["id", "fullName", "email", "role"],
      order: [["fullName", "ASC"]]
    });

    return res.status(200).json({
      count: teachers.length,
      data: teachers
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to load teachers." });
  }
};

const assignCoursesToClass = async (req, res) => {
  try {
    const classId = Number(req.params.classId);
    const moduleIds = parseUniquePositiveIds(req.body?.moduleIds);

    if (!Number.isInteger(classId) || classId <= 0) {
      return res.status(400).json({ message: "Invalid classId." });
    }

    if (moduleIds === null) {
      return res.status(400).json({ message: "moduleIds must be an array of IDs." });
    }

    const classRecord = await Class.findByPk(classId);
    if (!classRecord) {
      return res.status(404).json({ message: "Class not found." });
    }

    if (moduleIds.length > 0) {
      const foundModules = await ContentModule.findAll({
        where: { id: { [Op.in]: moduleIds } },
        attributes: ["id"]
      });

      if (foundModules.length !== moduleIds.length) {
        return res.status(400).json({ message: "One or more module IDs are invalid." });
      }
    }

    await sequelize.transaction(async (transaction) => {
      await ClassCourse.destroy({ where: { classId }, transaction });

      if (moduleIds.length > 0) {
        await ClassCourse.bulkCreate(
          moduleIds.map((moduleId) => ({ classId, moduleId })),
          { transaction }
        );
      }
    });

    const assignedModules = await ContentModule.findAll({
      where: { id: { [Op.in]: moduleIds.length > 0 ? moduleIds : [0] } },
      attributes: ["id", "title", "description", "classId"]
    });

    return res.status(200).json({
      message: "Course assignments updated successfully.",
      data: {
        classId,
        moduleIds,
        assignedModules
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to assign courses." });
  }
};

const assignTeachersToClass = async (req, res) => {
  try {
    const classId = Number(req.params.classId);
    const teacherIds = parseUniquePositiveIds(req.body?.teacherIds);

    if (!Number.isInteger(classId) || classId <= 0) {
      return res.status(400).json({ message: "Invalid classId." });
    }

    if (teacherIds === null) {
      return res.status(400).json({ message: "teacherIds must be an array of IDs." });
    }

    const classRecord = await Class.findByPk(classId);
    if (!classRecord) {
      return res.status(404).json({ message: "Class not found." });
    }

    if (teacherIds.length > 0) {
      const foundTeachers = await User.findAll({
        where: {
          id: { [Op.in]: teacherIds },
          role: "Teacher"
        },
        attributes: ["id"]
      });

      if (foundTeachers.length !== teacherIds.length) {
        return res.status(400).json({ message: "One or more teacher IDs are invalid." });
      }
    }

    await sequelize.transaction(async (transaction) => {
      await TeacherClass.destroy({ where: { classId }, transaction });

      if (teacherIds.length > 0) {
        await TeacherClass.bulkCreate(
          teacherIds.map((teacherId) => ({ classId, teacherId })),
          { transaction }
        );
      }

      await classRecord.update(
        { teacherId: teacherIds[0] || null },
        { transaction }
      );
    });

    const assignedTeachers = await User.findAll({
      where: { id: { [Op.in]: teacherIds.length > 0 ? teacherIds : [0] } },
      attributes: ["id", "fullName", "email", "role"]
    });

    return res.status(200).json({
      message: "Teacher assignments updated successfully.",
      data: {
        classId,
        teacherIds,
        assignedTeachers
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to assign teachers." });
  }
};

const bulkImportUsers = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "File is required." });
    }

    const rows = parseUploadedUsers(req.file);
    if (rows.length === 0) {
      return res.status(400).json({ message: "Uploaded file has no rows." });
    }

    const rowErrors = [];
    const preparedRows = [];

    rows.forEach((row) => {
      if (!row.fullName) {
        rowErrors.push(`Row ${row.line}: fullName is required.`);
        return;
      }

      if (row.username && !sanitizeUsernameBase(row.username)) {
        rowErrors.push(`Row ${row.line}: username contains no valid characters.`);
        return;
      }

      const normalizedRole = normalizeRole(row.role);
      if (!normalizedRole) {
        rowErrors.push(`Row ${row.line}: role must be one of ${ALLOWED_ROLES.join(", ")}.`);
        return;
      }

      preparedRows.push({
        ...row,
        role: normalizedRole,
        parentEmail: normalizeEmailAddress(row.parentEmail)
      });
    });

    if (rowErrors.length > 0) {
      return res.status(400).json({
        message: "Validation failed for upload rows.",
        errors: rowErrors
      });
    }

    const createdCredentials = [];

    await sequelize.transaction(async (transaction) => {
      const { usedUsernames, usedEmails } = await loadCredentialSets(transaction);
      const classCache = new Map();
      const parentAccountCache = new Map();
      const userTableColumns = await sequelize.getQueryInterface().describeTable("Users");
      const hasIsActiveColumn = Object.prototype.hasOwnProperty.call(userTableColumns, "isActive");
      const hasDeletedAtColumn = Object.prototype.hasOwnProperty.call(userTableColumns, "deletedAt");

      const resolveParentAccount = async ({ parentEmail, studentName }) => {
        const normalizedParentEmail = normalizeEmailAddress(parentEmail);

        if (!normalizedParentEmail) {
          return null;
        }

        const cachedParent = parentAccountCache.get(normalizedParentEmail);
        if (cachedParent) {
          if (cachedParent.credentialEntry && studentName && !cachedParent.credentialEntry.linkedStudentNames.includes(studentName)) {
            cachedParent.credentialEntry.linkedStudentNames.push(studentName);
          }

          return cachedParent.user;
        }

        const existingParent = await User.findOne({
          where: { email: normalizedParentEmail },
          paranoid: false,
          transaction,
          lock: transaction.LOCK.UPDATE
        });

        if (existingParent) {
          if (existingParent.role !== "Parent") {
            throw new Error(`ParentEmail ${normalizedParentEmail} already belongs to a ${existingParent.role} account.`);
          }

          if (typeof existingParent.restore === "function" && existingParent.deletedAt) {
            await existingParent.restore({ transaction });
          }

          await applyUserReactivationFields({
            userId: existingParent.id,
            transaction,
            hasIsActiveColumn,
            hasDeletedAtColumn
          });

          parentAccountCache.set(normalizedParentEmail, {
            user: existingParent,
            credentialEntry: null
          });

          return existingParent;
        }

        const parentFullName = buildDisplayNameFromEmail(normalizedParentEmail);
        const parentUsername = await ensureUniqueUsername({
          fullName: parentFullName,
          role: "Parent",
          transaction
        });
        const parentPlainPassword = generateSecurePassword();
        const parentPasswordHash = await bcrypt.hash(parentPlainPassword, 10);

        const createdParent = await User.create(
          {
            fullName: parentFullName,
            username: parentUsername,
            email: normalizedParentEmail,
            passwordHash: parentPasswordHash,
            role: "Parent",
            classId: null,
            needsPasswordChange: true
          },
          { transaction }
        );

        usedUsernames.add(parentUsername);
        usedEmails.add(normalizedParentEmail);

        const credentialEntry = {
          id: createdParent.id,
          fullName: createdParent.fullName,
          role: createdParent.role,
          username: parentUsername,
          email: createdParent.email,
          plainPassword: parentPlainPassword,
          className: null,
          note: "Auto-created parent account from ParentEmail during bulk import.",
          linkedStudentNames: studentName ? [studentName] : []
        };

        createdCredentials.push(credentialEntry);
        parentAccountCache.set(normalizedParentEmail, {
          user: createdParent,
          credentialEntry
        });

        return createdParent;
      };

      for (const row of preparedRows) {
        const usernameBase = row.username || buildUsernameBase(row.fullName, row.role);
        const username = reserveUniqueUsername(
          usernameBase,
          usedUsernames,
          row.email
            ? () => false
            : (candidate) => usedEmails.has(buildDefaultEmail(candidate))
        );

        const email = (row.email || buildDefaultEmail(username)).toLowerCase();
        const existingUser = await User.findOne({
          where: { email },
          paranoid: false,
          transaction,
          lock: transaction.LOCK.UPDATE
        });
        let classRecord = null;

        if (row.role === "Student" && row.parentEmail && row.parentEmail === email) {
          throw new Error(`Row ${row.line}: ParentEmail must be different from the student's email.`);
        }

        if (row.className) {
          const classCacheKey = row.className.toLowerCase();
          classRecord = classCache.get(classCacheKey) || null;

          if (!classRecord) {
            classRecord = await Class.findOne({
              where: { name: row.className },
              transaction,
              lock: transaction.LOCK.UPDATE
            });

            if (!classRecord) {
              classRecord = await Class.create(
                {
                  name: row.className,
                  gradeLevel: null
                },
                { transaction }
              );
            }

            classCache.set(classCacheKey, classRecord);
          }
        }

        if (!existingUser && usedEmails.has(email)) {
          if (row.email) {
            throw new Error(`Row ${row.line}: email ${row.email} already exists.`);
          }

          throw new Error(`Row ${row.line}: generated email ${email} already exists.`);
        }

        if (!existingUser) {
          usedEmails.add(email);
        }

        const plainPassword = generateSecurePassword();
        // Explicitly hash freshly generated password for both create and update paths.
        const passwordHash = await bcrypt.hash(plainPassword, 10);
        const familyLinkCode = row.role === "Student"
          ? existingUser?.familyLinkCode || await generateUniqueFamilyLinkCode(transaction)
          : null;

        const userPayload = {
          fullName: row.fullName,
          username: existingUser?.username || username,
          email,
          passwordHash,
          role: row.role,
          classId: row.role === "Student" ? classRecord?.id || null : null,
          familyLinkCode,
          needsPasswordChange: true
        };

        let persistedUser;
        if (existingUser) {
          if (typeof existingUser.restore === "function" && existingUser.deletedAt) {
            await existingUser.restore({ transaction });
          }

          await User.update(userPayload, {
            where: { id: existingUser.id },
            paranoid: false,
            hooks: false,
            transaction
          });

          await applyUserReactivationFields({
            userId: existingUser.id,
            transaction,
            hasIsActiveColumn,
            hasDeletedAtColumn
          });

          persistedUser = await User.findByPk(existingUser.id, {
            paranoid: false,
            transaction
          });
        } else {
          persistedUser = await User.create(userPayload, { transaction });
        }

        if (row.role === "Teacher" && classRecord) {
          await TeacherClass.findOrCreate({
            where: {
              teacherId: persistedUser.id,
              classId: classRecord.id
            },
            defaults: {
              teacherId: persistedUser.id,
              classId: classRecord.id
            },
            transaction
          });

          if (!classRecord.teacherId) {
            await classRecord.update({ teacherId: persistedUser.id }, { transaction });
          }
        }

        if (row.role === "Student" && row.parentEmail) {
          const parentAccount = await resolveParentAccount({
            parentEmail: row.parentEmail,
            studentName: persistedUser.fullName
          });

          if (parentAccount) {
            await ParentStudentMapping.findOrCreate({
              where: {
                parentId: parentAccount.id,
                studentId: persistedUser.id
              },
              defaults: {
                parentId: parentAccount.id,
                studentId: persistedUser.id
              },
              transaction
            });
          }
        }

        createdCredentials.push({
          id: persistedUser.id,
          fullName: persistedUser.fullName,
          role: persistedUser.role,
          username: persistedUser.username,
          email,
          plainPassword,
          familyLinkCode,
          className: classRecord?.name || row.className || null,
          note: existingUser ? "Existing account updated/reactivated during bulk import." : undefined
        });
      }
    });

    const pdfBuffer = await createCredentialsPdf(createdCredentials);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=bulk-user-credentials-${Date.now()}.pdf`
    );
    res.setHeader(
      "X-Import-Summary",
      JSON.stringify({
        usersCreated: createdCredentials.length,
        students: createdCredentials.filter((u) => u.role === "Student").length,
        teachers: createdCredentials.filter((u) => u.role === "Teacher").length,
        parents: createdCredentials.filter((u) => u.role === "Parent").length,
        admins: createdCredentials.filter((u) => u.role === "Admin").length
      })
    );

    return res.status(201).send(pdfBuffer);
  } catch (error) {
    const message = error.message || "Bulk user import failed.";
    return res.status(400).json({ message });
  }
};

module.exports = {
  uploadContentBulk,
  createClassroom,
  updateClassroom,
  deleteClassroom,
  listClassrooms,
  listManagedUsers,
  resetUserCredentials,
  deleteManagedUser,
  linkParentToStudent,
  bulkImportUsers,
  listModulesForAssignment,
  listTeachersForAssignment,
  assignCoursesToClass,
  assignTeachersToClass
};
