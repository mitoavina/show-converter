const {
	app,
	BrowserWindow,
	ipcMain,
	dialog,
	Menu,
	nativeImage,
	Notification,
	shell,
} = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const propresenter = require("./src/utils/pro-to-txt");
const videopsalm = require("./src/utils/vpc-to-txt");
const { metaFile, mkdir } = require("./src/utils/storage");
const {
	getSettings,
	setSettings,
	defaultSettings,
} = require("./src/utils/settings");
const { version: appVersion } = require("./package.json");

if (!app.isPackaged) {
	app.setAppUserModelId("ShowConverter");
}

let mainWindow;

if (require("electron-squirrel-startup")) app.quit();

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
	const icon = path.join(__dirname, "public/assets/icon.png");
	mainWindow = new BrowserWindow({
		width: 800,
		height: 600,
		transparent: true,
		frame: false,
		show: false,
		webPreferences: {
			preload: path.join(__dirname, "src/preload/preload.js"),
		},
		icon: icon,
	});

	const splash = new BrowserWindow({
		width: 500,
		height: 300,
		transparent: true,
		show: false,
		frame: false,
		alwaysOnTop: true,
		skipTaskbar: true,
		icon: icon,
		webPreferences: {
			preload: path.join(__dirname, "src/preload/splash.js"),
		},
	});

	splash
		.loadFile("public/splash.html")
		.then(() => {
			splash.webContents.send("appVersion", appVersion);
		})
		.then(() => {
			splash.show();
		});
	splash.center();

	// and load the index.html of the app.
	mainWindow
		.loadFile("public/index.html")
		.then(() => {
			mkdir(defaultSettings.outputFolder).then(() => {
				mainWindow.webContents.send("sendSettings", getSettings());
				mainWindow.webContents.send("appVersion", `v${appVersion}`);
			});
		})
		.then(() => {
			setTimeout(() => {
				splash.close();
				mainWindow.show();
			}, 3000);
		});

	// Do not use window menu
	Menu.setApplicationMenu(null);

	// Define the selected folder
	let selectedFolder;

	// Check if a folder is selected
	const isFolderSelected = (event) => {
		if (!selectedFolder) {
			// Send an error message to the renderer process
			event.sender.send("folderSelectionNullError");
			return false;
		}
		return true;
	};

	// List files in a directory
	const listFiles = async (directory) => {
		const ls = fs.readdirSync(directory);
		const files = ls.filter(
			(el) => !fs.lstatSync(path.join(directory, el)).isDirectory()
		);

		// Check if a file is a ProPresenter or VideoPsalm file
		const isExtension = (file, ext) => {
			const { extension } = metaFile(file);
			return extension === ext;
		};

		const pro = files.filter((el) => isExtension(el, "pro"));
		const vpc = files.filter((el) => isExtension(el, "vpc"));

		// Return the list of files
		return { pro, vpc };
	};

	// Select a directory
	async function selectDirectory(event) {
		try {
			// Show the dialog to select a directory
			const { filePaths, canceled } = await dialog.showOpenDialog(
				mainWindow,
				{
					properties: ["openDirectory"],
				}
			);
			if (canceled) {
				console.log("🚀 ~ selectDirectory: Dialog was canceled");
			} else {
				// Get the selected folder
				const folder = filePaths[0];
				// List the files in the folder
				const ls = await listFiles(folder);
				// Send the selected folder and the list of files to the renderer process
				event.sender.send("folderSelected", folder, ls);
				// Set the selected folder and its file content
				selectedFolder = folder;
			}
		} catch (err) {
			// Log the error
			console.log("FOLDER SELECTION ERROR ---> ", err);
			// Send an error message to the renderer process
			event.sender.send("folderSelectionError");
			// Set the selected folder to null
			selectedFolder = null;
		}
	}

	/* ----------------- IPC EVENTS ----------------- */
	ipcMain.on("open-folder", (event, arg) => {
		selectDirectory(event);
	});

	ipcMain.on("convertPropresenter", async (event, arg) => {
		if (isFolderSelected(event)) {
			const converted = await propresenter.convertFilesInDirectory(
				selectedFolder,
				getSettings().outputFolder
			);

			event.sender.send("conversionCompletePropresenter", converted);

			// display notification
			new Notification({
				title: "🚀 - Conversion complete",
				body: `${
					converted.filter((element) => element.state === "success")
						.length
				} / ${converted.length} file(s) successfully converted.`,
				icon: nativeImage.createFromPath(
					__dirname + "/public/assets/propresenter.png"
				),
			}).show();
		}
	});

	ipcMain.on("convertVideopsalm", async (event, arg) => {
		if (isFolderSelected(event)) {
			const converted = await videopsalm.convertFilesInDirectory(
				selectedFolder,
				getSettings().outputFolder
			);

			event.sender.send("conversionCompleteVideopsalm", converted);

			// display notification
			new Notification({
				title: "🚀 - Conversion complete",
				body: `${
					converted.filter((element) => element.state === "success")
						.length
				} / ${converted.length} file(s) successfully converted.`,
				icon: nativeImage.createFromPath(
					__dirname + "/public/assets/videopsalm.png"
				),
			}).show();
		}
	});

	ipcMain.on("openOutputFolder", () => {
		// 1. Verify that the output folder exists
		if (!fs.existsSync(getSettings().outputFolder)) {
			// 2. If it doesn't exist, show notification
			new Notification({
				title: "🚀 - The output folder does not exist yet",
				body: "Opening the nearest existing parent folder instead. The output folder will be created when the first file is converted.",
				icon: nativeImage.createFromPath(
					__dirname + "/public/assets/icon.png"
				), // TODO: Change icon to a warning icon
			}).show();
			// 3. Get the nearest existing parent folder
			let parentFolder = path.dirname(getSettings().outputFolder);
			while (!fs.existsSync(parentFolder)) {
				parentFolder = path.dirname(parentFolder);
			}
			// 4. Open the nearest existing parent folder
			shell.openPath(parentFolder);
			return;
		}
		// 5. Open the output folders
		shell.openPath(getSettings().outputFolder);
	});

	ipcMain.on("setOutputFolder", async (event, arg) => {
		try {
			const { filePaths, canceled } = await dialog.showOpenDialog(
				mainWindow,
				{
					properties: ["openDirectory"],
				}
			);
			if (canceled) {
				console.log("🚀 ~ setOutputFolder: Dialog was canceled");
			} else {
				const folder = filePaths[0];
				event.sender.send("outputFolderSelected", folder);
			}
		} catch (err) {
			console.log("OUTPUT FOLDER SELECTION ERROR ---> ", err);
		}
	});

	ipcMain.on("applyOutputFolder", async (event, arg) => {
		console.log("🚀 ~ applyOutputFolder: ", arg);
		if (arg) {
			let newSettings = getSettings();
			newSettings.outputFolder = arg;
			setSettings(newSettings);
			mainWindow.webContents.send("sendSettings", newSettings);
		}
	});

	ipcMain.on("refreshSettings", () => {
		mainWindow.webContents.send("sendSettings", getSettings());
	});

	ipcMain.on("closeWindow", () => {
		mainWindow.close();
	});

	ipcMain.on("minimizeWindow", () => {
		mainWindow.minimize();
	});

	ipcMain.on("toggleDevTools", () => {
		if (mainWindow.webContents.isDevToolsOpened())
			return mainWindow.webContents.closeDevTools();
		return mainWindow.webContents.openDevTools({
			mode: "detach",
			title: "Developer tools - ShowConverter",
		});
	});

	/* ----------------- END OF IPC EVENTS ----------------- */

	app.on("activate", function () {
		// On macOS it's common to re-create a window in the app when the
		// dock icon is clicked and there are no other windows open.
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", function () {
	if (process.platform !== "darwin") app.quit();
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
