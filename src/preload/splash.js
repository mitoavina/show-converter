const { contextBridge, ipcRenderer } = require("electron/renderer");

contextBridge.exposeInMainWorld("electron", {
	getAppVersion: (message) => {
		ipcRenderer.on("appVersion", message);
	},
});
