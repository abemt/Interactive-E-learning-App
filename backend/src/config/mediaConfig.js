const path = require("path");

const trimTrailingSlash = (value) => String(value || "").replace(/\/+$/, "");
const trimLeadingSlash = (value) => String(value || "").replace(/^\/+/, "");
const ensureLeadingSlash = (value) => {
  const normalized = trimTrailingSlash(value);
  if (!normalized) {
    return "";
  }
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
};

const mediaRoot = process.env.MEDIA_STORAGE_ROOT
  ? path.resolve(process.env.MEDIA_STORAGE_ROOT)
  : path.join(__dirname, "../../uploads");

const imageDir = process.env.IMAGE_UPLOAD_DIR
  ? path.resolve(process.env.IMAGE_UPLOAD_DIR)
  : path.join(mediaRoot, "images");

const audioDir = process.env.AUDIO_UPLOAD_DIR
  ? path.resolve(process.env.AUDIO_UPLOAD_DIR)
  : path.join(mediaRoot, "audio");

const publicPath = ensureLeadingSlash(process.env.MEDIA_PUBLIC_PATH || "/uploads");
const publicBaseUrl = trimTrailingSlash(process.env.MEDIA_PUBLIC_BASE_URL || "");
const bucketName = trimLeadingSlash(trimTrailingSlash(process.env.MEDIA_BUCKET_NAME || ""));

const resolveUploadMaxBytes = () => {
  const rawBytes = Number(process.env.UPLOAD_MAX_FILE_SIZE || 0);
  if (Number.isFinite(rawBytes) && rawBytes > 0) {
    return rawBytes;
  }

  const rawMb = Number(process.env.UPLOAD_MAX_FILE_SIZE_MB || 10);
  const safeMb = Number.isFinite(rawMb) && rawMb > 0 ? rawMb : 10;
  return Math.round(safeMb * 1024 * 1024);
};

const uploadMaxBytes = resolveUploadMaxBytes();
const uploadMaxMb = Math.max(1, Math.round(uploadMaxBytes / (1024 * 1024)));

const buildPublicMediaUrl = (subdir, filename) => {
  const pathSegment = `${publicPath}/${subdir}/${filename}`.replace(/\/+/g, "/");

  if (!publicBaseUrl) {
    return pathSegment;
  }

  const bucketSegment = bucketName ? `/${bucketName}` : "";
  return `${publicBaseUrl}${bucketSegment}${pathSegment}`;
};

module.exports = {
  mediaRoot,
  imageDir,
  audioDir,
  publicPath,
  publicBaseUrl,
  bucketName,
  uploadMaxBytes,
  uploadMaxMb,
  buildPublicMediaUrl
};
