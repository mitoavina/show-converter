const { contextBridge, ipcRenderer } = require("electron/renderer");

contextBridge.exposeInMainWorld("electron", {
	getAppVersion: (message) => {
		ipcRenderer.on("appVersion", message);
	},
	openFolder: () => ipcRenderer.send("open-folder"),
	openOutputFolder: () => ipcRenderer.send("openOutputFolder"),
	getSettings: (message) => {
		ipcRenderer.on("sendSettings", message);
	},
	refreshSettings: () => ipcRenderer.send("refreshSettings"),
	setOutputFolder: () => ipcRenderer.send("setOutputFolder"),
	applyOutputFolder: (message) =>
		ipcRenderer.send("applyOutputFolder", message),

	convertPropresenter: () => ipcRenderer.send("convertPropresenter"),
	convertVideopsalm: () => ipcRenderer.send("convertVideopsalm"),

	minimizeWindow: () => ipcRenderer.send("minimizeWindow"),
	closeWindow: () => ipcRenderer.send("closeWindow"),
	toggleDevTools: () => ipcRenderer.send("toggleDevTools"),
});

ipcRenderer.on("folderSelected", (_, ...args) => setFolderSelected(args));
ipcRenderer.on("folderSelectionError", () =>
	replaceText("folderInfo", "Some errors has occured. Please try again.")
);
ipcRenderer.on("folderSelectionNullError", () =>
	replaceText("folderInfo", "Please select a folder first.<br />Click here.")
);
ipcRenderer.on("conversionCompletePropresenter", (_, ...args) =>
	setCompleteConv("Pro", args)
);
ipcRenderer.on("conversionCompleteVideopsalm", (_, ...args) =>
	setCompleteConv("Vpc", args)
);
ipcRenderer.on("outputFolderSelected", (_, folder) =>
	replaceText("output-folder-path", folder)
);

const getAppVersion = () => {
	// console.log("🚀 ~ getAppVersion ~ version:", version);

	return "miaou";
};
const replaceText = (selector, text) => {
	const element = document.getElementById(selector);
	if (element) {
		if (element.tagName === "INPUT") {
			element.value = text;
		} else {
			element.innerHTML = text;
		}
	}
};

const setFolderSelected = ([folder, fileList]) => {
	replaceText("folderInfo", `📂 ${folder}`);

	const converter = document.getElementById("converter");
	converter.classList.remove("disabled");

	// Display list of files in the folder
	Object.keys(fileList).forEach((type) => {
		const selector = type[0].charAt(0).toUpperCase() + type.slice(1);
		const newlist = document.createElement("ul");
		fileList[type].forEach((f) => {
			const li = document.createElement("li");
			li.innerText = f;
			newlist.appendChild(li);
		});

		const placeholder = document.getElementById(`fileList${selector}`);
		const ul = placeholder.getElementsByTagName("ul");
		ul[0].replaceWith(newlist);
	});
};

const setCompleteConv = (type, [converted, ...args]) => {
	// display list of converted files
	const itemBullet = {
		success: "✅",
		error: "❌",
	};
	const placeholder = document.getElementById(`fileList${type}`);
	const list = placeholder.getElementsByTagName("ul")[0];

	/*  
  List of files initially diplayed and list of converted files may differ.
  This could happen if directory content has been updated between folder selection. and start of conversion
  */

	const diff = (listA, listB) => {
		return listA.filter((element) => !listB.includes(element));
	};

	const listed = list.innerText
		.split("\n")
		.filter(Boolean)
		.map((i) => {
			if (i.includes("👋")) {
				return i.slice(2, i.length - 2);
			}
			if (i.includes("🚮")) {
				return i.slice(2);
			}
			if (i.includes("✅") || i.includes("❌")) {
				return i.slice(0, i.length - 2);
			}
			return i;
		}); // list of initially displayed files

	const newFiles = diff(
		converted.map((element) => element.value), // list of converted files
		listed // list of initially displayed files
	);
	const removedFiles = diff(
		listed, // list of initially displayed files
		converted.map((element) => element.value) // list of converted files
	);

	const listArray = list.getElementsByTagName("li");

	for (let i = 0; i < listArray.length; i++) {
		// Remove 👋 and 🚮 from the file name if present before conversion
		const innerText =
			listArray[i].innerText.includes("👋") ||
			listArray[i].innerText.includes("🚮")
				? listArray[i].innerText.slice(6)
				: listArray[i].innerText;

		const element = converted.filter((c) => c.value === innerText)[0];
		const removed = removedFiles.filter((r) => r === innerText)[0];

		// If files was removed, tag 🚮
		if (removed) {
			listArray[i].innerText = `🚮 ${removed}`;
		} else {
			// Update status of listed files
			if (element && innerText == element.value) {
				listArray[i].innerText = `${element.value} ${
					itemBullet[element.state]
				}`;
			}
		}
	}

	newFiles.forEach((f) => {
		const element = converted.filter((c) => c.value === f)[0];
		const li = document.createElement("li");
		li.innerText = `👋 ${element.value} ${itemBullet[element.state]}`;
		list.appendChild(li);
	});
};
