const path = require("path");
const { parse } = require("csv-parse/sync");
const XLSX = require("xlsx");
const { sequelize, Class, ContentModule, ContentItem } = require("../models");

const REQUIRED_FIELDS = ["className", "moduleTitle", "itemTitle", "itemType"];

const parseCsvBuffer = (buffer) =>
  parse(buffer.toString("utf8"), {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });

const parseExcelBuffer = (buffer) => {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) {
    return [];
  }
  return XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: "" });
};

const normalizeRows = (rows) =>
  rows.map((row) => ({
    className: String(row.className || row.ClassName || row.class || "").trim(),
    gradeLevel: String(row.gradeLevel || row.GradeLevel || "").trim() || null,
    moduleTitle: String(row.moduleTitle || row.ModuleTitle || "").trim(),
    moduleDescription:
      String(row.moduleDescription || row.ModuleDescription || "").trim() || null,
    itemTitle: String(row.itemTitle || row.ItemTitle || "").trim(),
    itemType: String(row.itemType || row.ItemType || "Article").trim(),
    contentBody: String(row.contentBody || row.ContentBody || "").trim() || null,
    contentUrl: String(row.contentUrl || row.ContentUrl || "").trim() || null,
    sequenceOrder: Number(row.sequenceOrder || row.SequenceOrder || 1)
  }));

const validateRows = (rows) => {
  const invalidIndexes = [];

  rows.forEach((row, index) => {
    const hasMissingField = REQUIRED_FIELDS.some((field) => !row[field]);
    if (hasMissingField) {
      invalidIndexes.push(index + 2);
    }
  });

  if (invalidIndexes.length > 0) {
    throw new Error(
      `Invalid upload format. Missing required fields on rows: ${invalidIndexes.join(", ")}.`
    );
  }
};

const parseUploadRows = (file) => {
  const extension = path.extname(file.originalname).toLowerCase();

  if (extension === ".csv") {
    return normalizeRows(parseCsvBuffer(file.buffer));
  }

  if (extension === ".xlsx" || extension === ".xls") {
    return normalizeRows(parseExcelBuffer(file.buffer));
  }

  throw new Error("Unsupported file type. Upload CSV, XLSX, or XLS.");
};

const saveContentItemsBulk = async (rows) => {
  const summary = {
    classesCreated: 0,
    modulesCreated: 0,
    contentItemsCreated: 0
  };

  await sequelize.transaction(async (transaction) => {
    for (const row of rows) {
      const [classRecord, classCreated] = await Class.findOrCreate({
        where: { name: row.className },
        defaults: { gradeLevel: row.gradeLevel },
        transaction
      });

      if (classCreated) {
        summary.classesCreated += 1;
      }

      const [moduleRecord, moduleCreated] = await ContentModule.findOrCreate({
        where: { classId: classRecord.id, title: row.moduleTitle },
        defaults: {
          description: row.moduleDescription
        },
        transaction
      });

      if (moduleCreated) {
        summary.modulesCreated += 1;
      }

      await ContentItem.create(
        {
          moduleId: moduleRecord.id,
          title: row.itemTitle,
          itemType: ["Video", "Article", "Quiz", "Assignment"].includes(row.itemType)
            ? row.itemType
            : "Article",
          contentBody: row.contentBody,
          contentUrl: row.contentUrl,
          sequenceOrder: Number.isFinite(row.sequenceOrder) ? row.sequenceOrder : 1
        },
        { transaction }
      );

      summary.contentItemsCreated += 1;
    }
  });

  return summary;
};

const processBulkUpload = async (file) => {
  if (!file) {
    throw new Error("File is required.");
  }

  const rows = parseUploadRows(file);
  validateRows(rows);
  return saveContentItemsBulk(rows);
};

module.exports = { processBulkUpload };
