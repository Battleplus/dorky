const { existsSync, readFileSync } = require("fs");

const toPosix = (p) => p ? p.replace(/\\/g, '/') : p;

const normalizeKeys = (obj) => {
    if (!obj) return {};
    const out = {};
    for (const k of Object.keys(obj)) out[toPosix(k)] = obj[k];
    return out;
};

const readJson = (p) => existsSync(p) ? JSON.parse(readFileSync(p)) : {};

const readMetadata = (metadataPath) => {
    const meta = readJson(metadataPath);
    meta["stage-1-files"] = normalizeKeys(meta["stage-1-files"]);
    meta["uploaded-files"] = normalizeKeys(meta["uploaded-files"]);
    return meta;
};

const readHistory = (historyPath) => {
    const history = existsSync(historyPath) ? JSON.parse(readFileSync(historyPath)) : [];
    return history.map(e => ({ ...e, files: normalizeKeys(e.files) }));
};

module.exports = { toPosix, normalizeKeys, readJson, readMetadata, readHistory };
