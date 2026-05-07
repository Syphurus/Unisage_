/**
 * @fileoverview File service — handles PDF uploads, storage, and retrieval.
 */

const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");
const { supabase } = require("../config/database");
const logger = require("../utils/logger");

// Files storage directory
const FILES_DIR = path.join(__dirname, "../../uploads");

// Ensure uploads directory exists
if (!fs.existsSync(FILES_DIR)) {
  fs.mkdirSync(FILES_DIR, { recursive: true });
}

/**
 * Save an uploaded file to disk and store metadata in database
 * @param {Buffer} fileBuffer - File content
 * @param {string} originalFilename - Original filename
 * @param {string} mimeType - MIME type
 * @param {string} contentId - Associated content ID
 * @returns {Promise<Object>} File metadata {id, originalFilename, filePath}
 */
async function saveFile(fileBuffer, originalFilename, mimeType, contentId) {
  try {
    const fileId = randomUUID();
    const fileExtension = path.extname(originalFilename);
    const storedFilename = `${fileId}${fileExtension}`;
    const filePath = path.join(FILES_DIR, storedFilename);

    // Write file to disk
    fs.writeFileSync(filePath, fileBuffer);
    const fileSize = Buffer.byteLength(fileBuffer);

    // Store metadata in database
    const { data, error } = await supabase
      .from("files")
      .insert({
        id: fileId,
        content_id: contentId,
        original_filename: originalFilename,
        file_type: fileExtension.toLowerCase().replace(".", ""),
        file_size: fileSize,
        file_path: storedFilename,
        mime_type: mimeType,
      })
      .select()
      .single();

    if (error) {
      // Clean up file if DB insert fails
      fs.unlinkSync(filePath);
      throw error;
    }

    logger.info("File saved", {
      fileId,
      originalFilename,
      fileSize,
      contentId,
    });

    return {
      id: data.id,
      originalFilename: data.original_filename,
      filePath: storedFilename,
      fileSize: data.file_size,
    };
  } catch (err) {
    logger.error("Failed to save file", {
      originalFilename,
      error: err.message,
    });
    throw new Error("Failed to save file");
  }
}

/**
 * Get file metadata from database
 * @param {string} fileId - File ID
 * @returns {Promise<Object>} File metadata
 */
async function getFileMetadata(fileId) {
  const { data, error } = await supabase
    .from("files")
    .select("*")
    .eq("id", fileId)
    .single();

  if (error || !data) {
    throw new Error("File not found");
  }

  return data;
}

/**
 * Get file buffer from disk
 * @param {string} storedFilename - Stored filename
 * @returns {Promise<Buffer>} File buffer
 */
async function getFileBuffer(storedFilename) {
  try {
    const filePath = path.join(FILES_DIR, storedFilename);

    // Security check: ensure the resolved path is within FILES_DIR
    const resolvedPath = path.resolve(filePath);
    const resolvedDir = path.resolve(FILES_DIR);
    if (!resolvedPath.startsWith(resolvedDir)) {
      throw new Error("Invalid file path");
    }

    if (!fs.existsSync(filePath)) {
      throw new Error("File not found on disk");
    }

    return fs.readFileSync(filePath);
  } catch (err) {
    logger.error("Failed to read file", {
      storedFilename,
      error: err.message,
    });
    throw new Error("Failed to retrieve file");
  }
}

/**
 * Delete file from disk and database
 * @param {string} fileId - File ID
 * @returns {Promise<void>}
 */
async function deleteFile(fileId) {
  try {
    const metadata = await getFileMetadata(fileId);

    // Delete from disk
    const filePath = path.join(FILES_DIR, metadata.file_path);
    const resolvedPath = path.resolve(filePath);
    const resolvedDir = path.resolve(FILES_DIR);
    if (!resolvedPath.startsWith(resolvedDir)) {
      throw new Error("Invalid file path");
    }

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete from database
    const { error } = await supabase
      .from("files")
      .delete()
      .eq("id", fileId);

    if (error) {
      throw error;
    }

    logger.info("File deleted", { fileId });
  } catch (err) {
    logger.error("Failed to delete file", {
      fileId,
      error: err.message,
    });
    throw new Error("Failed to delete file");
  }
}

/**
 * Get file info by content ID (for PYQs)
 * @param {string} contentId - Content ID
 * @returns {Promise<Object|null>} File metadata or null
 */
async function getFileByContentId(contentId) {
  const { data } = await supabase
    .from("files")
    .select("*")
    .eq("content_id", contentId)
    .single();

  return data || null;
}

module.exports = {
  saveFile,
  getFileMetadata,
  getFileBuffer,
  deleteFile,
  getFileByContentId,
};
