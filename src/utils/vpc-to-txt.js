const fs = require("fs").promises; // uses the promise-based version of fs for cleaner await syntax
const path = require("path");
const glob = require("glob");
const AdmZip = require("adm-zip");
const { jsonrepair } = require("jsonrepair");
const { writeToFile, mkdir, metaFile } = require("./storage");

// Keys to keep in the JSON file
const keys = [
	"Abbreviation",
	"IsCompressed",
	"IsSearchable",
	"Guid",
	"Songs",
	"Text",
	"Verses",
	"Style",
	"Tag",
	"ID",
	"Key",
	"Alias",
	"Color",
	"Reference",
	"Sequence",
	"VersionDate",
	"VideoDuration",
	"VerseOrderIndex",
	"Composer",
	"Author",
	"Copyright",
	"CCLI",
	"Theme",
	"AudioFile",
	"Memo1",
	"Memo2",
	"Memo3",
	"Capo",
	"PrintCapo",
	"IsDisplayed",
	"KeyLine",
	"Note",
	"Description",
	"Publisher",
	"TimeSignature",
	"Culture",
	"Tonality",
	"Language",
];

// Keys to remove from the JSON file
const removeKeys = ["Body", "Background", "Footer", "Header", "Version"];

async function convertFile(filePath, outputDirectory) {
	const { name: file, extension } = metaFile(filePath);
	if (extension !== "vpc")
		throw new Error("Not supported file format or extension");
	const inputDirectory = path.dirname(filePath);
	// Create a folder for the library
	const library = path.basename(filePath, ".vpc");
	const folder = path.join(inputDirectory, library);
	await mkdir(folder);

	// Rename the file to .zip
	const fileZip = path.join(inputDirectory, file + ".zip");
	await fs.rename(path.join(inputDirectory, `${file}.${extension}`), fileZip);

	// Extract the zip file
	const zip = new AdmZip(fileZip);
	zip.extractAllTo(folder, true);

	// Rename the file back to .vpc
	await fs.rename(fileZip, path.join(inputDirectory, `${file}.${extension}`));

	// Change working inputDirectory to the folder
	const folderFiles = glob.sync(`${library}.json`, { cwd: folder });

	for (const fileJson of folderFiles) {
		// Read the json file
		const filePath = path.join(folder, fileJson);
		const content = await fs.readFile(filePath, "utf-8");

		try {
			const data = JSON.parse(jsonrepair(content));
			for (const song of data.Songs) {
				const lyrics = [];
				for (const key of Object.keys(song)) {
					if (!keys.includes(key) || removeKeys.includes(key)) {
						delete song[key];
					}
				}

				for (const verse of song.Verses) {
					lyrics.push(verse.Text);
				}

				await writeToFile(
					`${outputDirectory}/vpc/json`,
					JSON.stringify(data),
					library,
					"json"
				);
				await writeToFile(
					`${outputDirectory}/vpc/txt/${library}`,
					lyrics.join("\n\n"),
					song.Text,
					"txt"
				);
				return {
					value: `${library}.vpc`,
					state: "success",
				};
			}
		} catch (error) {
			// Handle error (optional)
			console.error("Error processing JSON:", error);
			return { value: `${library}.vpc`, state: "error" };
		}

		// Delete the file
		await fs.unlink(filePath);
	}

	// Delete the folder
	await fs.rm(folder, { recursive: true });
}

async function convertFilesInDirectory(inputDirectory, outputDirectory) {
	const files = glob.sync("*.vpc", { cwd: inputDirectory });

	let converted = [];

	for (const file of files) {
		const conversionResult = await convertFile(
			path.join(inputDirectory, file),
			outputDirectory
		);
		converted.push(conversionResult);
	}

	return converted;
}

module.exports = { convertFile, convertFilesInDirectory };
