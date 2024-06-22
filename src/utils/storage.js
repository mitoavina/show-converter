const fs = require("fs");
const path = require("path");

/**
 * Creates a directory if it does not exist
 * @param {string} directory - The path to the directory
 * @returns {Promise<void>}
 */
async function mkdir(directory) {
	if (!fs.existsSync(directory)) fs.mkdirSync(directory, { recursive: true });
	return;
}

/**
 * Extracts the name and extension of a file
 * @param {string} filePath - The path to the file
 * @returns {Object} - An object containing the name and extension of the file
 */
function metaFile(filePath) {
	const basename = path.basename(filePath);
	let name = basename.slice(0, basename.lastIndexOf(".")) || "";
	let extension = "";
	const gotExt = basename.includes(".");

	if (gotExt) {
		const arr = basename.split(".");
		if (arr[0] === "") name = basename;
		else extension = arr[arr.length - 1];
	}

	return { name, extension };
}

/**
 * Writes content to a file in the specified directory
 * @param {string} dirPath - The path to the directory where the file will be written
 * @param {Object} file - The file object containing the content and name of the file
 * @param {string} extension - The extension of the file to be written
 * @returns {Promise<void>}
 */
async function writeToFile(dirPath, content, name, extension = "txt") {
	// check if content is an object and stringify it with pretty print
	let contentString = "";
	if (typeof content === "object") {
		contentString = JSON.stringify(content, null, "\t");
	} else {
		// if not, check if content is JSON parsable
		// else write content as is
		try {
			contentString = JSON.stringify(JSON.parse(content), null, "\t");
		} catch (error) {
			contentString = content;
		}
	}

	// create directory if it does not exist
	await mkdir(dirPath);

	// write content to file
	fs.writeFileSync(
		`${dirPath}/${name}.${extension.toLowerCase()}`,
		contentString
	);
}

module.exports = { metaFile, mkdir, writeToFile };
