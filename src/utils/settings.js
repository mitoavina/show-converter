const ini = require("ini");
const fs = require("fs");
const path = require("path");
const os = require("os");

const settingfile = "./showconverter.ini";

const getDocumentsFolder = () => {
	const homeDir = os.homedir();
	let documentsDir;

	if (
		process.platform === "win32" ||
		process.platform === "darwin" ||
		process.platform === "linux"
	) {
		documentsDir = path.join(homeDir, "Documents");
	} else {
		// Default to AppData on unrecognized platforms
		documentsDir = process.env.APPDATA || homeDir;
	}
	return documentsDir;
};

const defaultSettings = {
	outputFolder: path.join(getDocumentsFolder(), "ShowConverter", "output"),
};

// Function to initialize settings file if it doesn't exist
const initializeSettingsFile = async () => {
	if (!fs.existsSync(settingfile)) {
		const text = ini.stringify(defaultSettings);
		fs.writeFileSync(settingfile, text);
	}
};

const getSettings = () => {
	// Ensure the settings file exists
	initializeSettingsFile();

	// Read the settings file
	const file = fs.readFileSync(settingfile, { encoding: "utf-8" });

	// If file is empty, return default settings
	if (!file) {
		return setSettings(defaultSettings);
	}

	const config = ini.parse(file);

	// If outputFolder is not set, set it to default
	if (!config.outputFolder) {
		config.outputFolder = defaultSettings.outputFolder;
	}

	return config;
};

const setSettings = (config) => {
	// Ensure the settings file exists
	initializeSettingsFile();

	// Merge with existing settings
	const currentSettings = getSettings();
	const newSettings = { ...currentSettings, ...config };
	const text = ini.stringify(newSettings);
	fs.writeFileSync(settingfile, text);
	return newSettings;
};

module.exports = { defaultSettings, getSettings, setSettings };
