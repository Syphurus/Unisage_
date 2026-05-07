/**
 * @fileoverview Content controller — handles single content retrieval and type-based queries.
 */

const contentService = require("../services/content.service");
const filesService = require("../services/files.service");
const logger = require("../utils/logger");

/**
 * GET /api/content/:id
 * Get a single content item by ID.
 */
async function getContentById(req, res, next) {
  try {
    const { id } = req.params;
    const content = await contentService.getContentById(id);

    res.json({
      success: true,
      data: content,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/content?type=quiz&page=1&limit=20
 * Get content filtered by type with pagination.
 */
async function getContentByType(req, res, next) {
  try {
    const { type, page = 1, limit = 20 } = req.query;
    const result = await contentService.getContentByType(type, page, limit);

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/content/:id/download
 * Download file associated with content (e.g., PYQs PDF)
 */
async function downloadFile(req, res, next) {
  try {
    const { id } = req.params;

    const fileInfo = await filesService.getFileByContentId(id);
    if (!fileInfo) {
      return res.status(404).json({
        success: false,
        error: { message: "No file associated with this content" },
      });
    }

    const fileBuffer = await filesService.getFileBuffer(fileInfo.file_path);

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileInfo.original_filename}"`
    );
    res.setHeader("Content-Type", fileInfo.mime_type || "application/octet-stream");
    res.setHeader("Content-Length", fileInfo.file_size);

    logger.info("File downloaded", {
      contentId: id,
      fileId: fileInfo.id,
      filename: fileInfo.original_filename,
      userId: req.user?.id,
    });

    res.send(fileBuffer);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/content/:id/view
 * View file inline in browser (e.g., PYQs PDF preview)
 */
async function viewFile(req, res, next) {
  try {
    const { id } = req.params;

    const fileInfo = await filesService.getFileByContentId(id);
    if (!fileInfo) {
      return res.status(404).json({
        success: false,
        error: { message: "No file associated with this content" },
      });
    }

    const fileBuffer = await filesService.getFileBuffer(fileInfo.file_path);

    res.setHeader(
      "Content-Disposition",
      `inline; filename="${fileInfo.original_filename}"`
    );
    res.setHeader("Content-Type", fileInfo.mime_type || "application/pdf");
    res.setHeader("Content-Length", fileInfo.file_size);

    res.send(fileBuffer);
  } catch (err) {
    next(err);
  }
}

module.exports = { getContentById, getContentByType, downloadFile, viewFile };
