const { FusesPlugin } = require("@electron-forge/plugin-fuses");
const { FuseV1Options, FuseVersion } = require("@electron/fuses");
const packageJSON = require("./package.json");
const path = require("path");

module.exports = {
	packagerConfig: {
		asar: true,
		icon: path.resolve(__dirname, "public/assets/icon"),
	},
	rebuildConfig: {},
	// TODO: Add a maker for a portable executable for win32
	makers: [
		{
			name: "@electron-forge/maker-squirrel",
			platforms: ["win32"],
			config: {
				authors: packageJSON.author,
				description: packageJSON.description,
				iconUrl: path.resolve(__dirname, "public/assets/icon.ico"), // The application icon (displayed in Control Panel > Programs and Features).
				setupIcon: path.resolve(__dirname, "public/assets/icon.ico"), // The icon for the generated Setup.exe
			},
		},
		{
			name: "@electron-forge/maker-zip",
			platforms: ["darwin"],
		},
		{
			name: "@electron-forge/maker-deb",
			platforms: ["linux"],
			config: {
				icon: path.resolve(__dirname, "public/assets/icon.png"),
			},
		},
		{
			name: "@electron-forge/maker-dmg",
			config: {
				icon: path.resolve(__dirname, "public/assets/icon.icns"),
			},
		},
		{
			name: "@electron-forge/maker-wix",
			config: {
				language: 1033,
				description: packageJSON.description,
				exe: packageJSON.name,
				name: packageJSON.productName,
				manufacturer: packageJSON.author,
				version: packageJSON.version,
				icon: path.resolve(__dirname, "public/assets/icon.ico"),
				ui: {
					chooseDirectory: true,
					features: {
						autoUpdate: true,
					},
					images: {
						background: path.resolve(
							__dirname,
							"public/assets/installer/background.png"
						),
						banner: path.resolve(
							__dirname,
							"public/assets/installer/banner.png"
						),
					},
				},
			},
		},
	],
	plugins: [
		{
			name: "@electron-forge/plugin-auto-unpack-natives",
			config: {},
		},
		// Fuses are used to enable/disable various Electron functionality
		// at package time, before code signing the application
		new FusesPlugin({
			version: FuseVersion.V1,
			[FuseV1Options.RunAsNode]: false,
			[FuseV1Options.EnableCookieEncryption]: true,
			[FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
			[FuseV1Options.EnableNodeCliInspectArguments]: false,
			[FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
			[FuseV1Options.OnlyLoadAppFromAsar]: true,
		}),
	],
};
