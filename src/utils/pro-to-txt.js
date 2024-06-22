const fs = require("fs");
const path = require("path");
const protobufjs = require("protobufjs");
const convertProToSlides = require("./decodePropresenter");
const { metaFile, writeToFile } = require("./storage");

/**
 * This function decodes a ProPresenter file to JSON using the presentation.proto file
 * located in the public/proto directory. It reads the file content, decodes it using the protobufjs library,
 * and returns the JSON representation of the file.
 *
 * @param {string} filePath - The path to the ProPresenter file
 * @returns {Promise<string>} - The JSON representation of the ProPresenter file
 * @throws {Error} - If the file is not a ProPresenter file
 *
 *
 * links:
 *
 * https://greyshirtguy.com/blog/propresenter-7-file-format-part-2/
 *
 * https://github.com/greyshirtguy/ProPresenter7-Proto
 *
 * https://www.npmjs.com/package/protobufjs
 */
async function decodeProto(filePath) {
	const dir = path.join(
		__dirname,
		"..",
		"..",
		"public",
		"proto",
		"presentation.proto"
	);
	const root = await protobufjs.load(dir);

	const Presentation = root.lookupType("Presentation");

	// Decode the file content using the Presentation message type
	const fileContent = fs.readFileSync(filePath);
	const buffer = Buffer.from(fileContent);
	const message = Presentation.decode(buffer);

	return JSON.stringify(message);
}

/**
 * This function extracts the data from a ProPresenter file.
 *
 * It reads the file content, decodes it using the decodeProto function, and then converts the decoded
 * JSON to a more readable format using the convertProToSlides function. It then extracts the lyrics
 * from the slides and returns the raw content, name, show data, lyrics, and textLyrics.
 *
 * The raw content is the original content of the file, the name is the name of the file,
 * the show data contains the slides and media information, the lyrics contain the lyrics
 * extracted from the slides, and the textLyrics is the lyrics in text format.
 * @param {string} filePath - The path to the ProPresenter file
 * @returns {Object} - An object containing the raw content, name, show data, lyrics, and textLyrics
 * @throws {Error} - If the file is not a ProPresenter file
 * @see decodeProto
 */
async function extractData(filePath) {
	let content = "";
	const { name, extension } = metaFile(filePath);
	if (extension !== "pro") throw new Error("Not a pro file");

	try {
		content = await decodeProto(filePath);
	} catch (err) {
		console.error("Error reading file:", err.stack);
		return;
	}

	// decode JSON to extract text slides
	let show = {};
	converted = convertProToSlides(JSON.parse(content));
	let { slides, media } = converted;
	show.slides = slides;
	show.media = media;

	// extract lyrics from slides
	let lyrics = [];
	Object.keys(show.slides).forEach((slideKey) => {
		const items = show.slides[slideKey].items;
		let slideLines = [];
		items.forEach((item) => {
			const lines = item.lines;
			lines.forEach((line) => {
				line.text.forEach((text) => {
					slideLines.push(text.value);
				});
			});
		});
		lyrics.push(slideLines.join("\n")); // join lines to form verses
	});

	// remove empty lines
	lyrics = lyrics.filter((verse) => {
		return verse.length > 0;
	});

	// join verses to form lyrics
	const textLyrics = lyrics.join("\n\n");

	return { raw: content, name, show, lyrics, textLyrics };
}

async function convertFile(filePath, outputDirectory) {
	const library = path.basename(path.dirname(filePath));
	const { name: fileName, extension } = metaFile(filePath);
	if (extension !== "pro")
		throw new Error("Not supported file format or extension");
	try {
		const { raw, name, show, textLyrics } = await extractData(filePath);
		await writeToFile(
			`${outputDirectory}/pro/raw/${library}`,
			raw,
			name,
			"json"
		);
		await writeToFile(
			`${outputDirectory}/pro/json/${library}`,
			show,
			name,
			"json"
		);
		await writeToFile(
			`${outputDirectory}/pro/txt/${library}`,
			textLyrics,
			name,
			"txt"
		);
		return {
			value: `${fileName}.${extension}`, // or `${library}/${fileName}.${extension}`
			state: "success",
		};
	} catch (err) {
		console.error(err);
		return {
			value: `${fileName}.${extension}`,
			state: "error",
		};
	}
}

async function convertFilesInDirectory(inputDirectory, outputDirectory) {
	let ls = fs.readdirSync(inputDirectory);

	let converted = [];

	for (const element of ls) {
		const elementPath = path.join(inputDirectory, element);
		// check if element is Directory
		if (fs.lstatSync(elementPath).isDirectory()) {
			// TODO: Recursively process subdirectory
			// const subConverted = await run(elementPath);
			// converted = converted.concat(subConverted);
			continue;
		}
		const { extension } = metaFile(elementPath);
		if (extension === "pro") {
			const conversionResult = await convertFile(
				elementPath,
				outputDirectory
			);
			converted.push(conversionResult);
		}
	}

	return converted;
}

module.exports = { convertFile, convertFilesInDirectory };
