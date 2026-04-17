const { processBulkUpload } = require("../Services/bulkUploadService");

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

module.exports = { uploadContentBulk };
