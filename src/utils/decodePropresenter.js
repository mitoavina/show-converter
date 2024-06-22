let slideNumber = 0;
const uid = () => slideNumber++;
const itemStyle = "left:50px;top:120px;width:1820px;height:840px;";

function convertProToSlides(song) {
	let slides = {};
	let media = {};
	let layouts = [];

	// console.log(song)

	let tempLayouts = {};
	const tempArrangements = getArrangements(song.arrangements);
	const tempGroups = getGroups(song.cueGroups);
	const tempSlides = getSlides(song.cues);
	// console.log(tempArrangements, tempGroups, tempSlides)

	if (!tempArrangements?.length) {
		tempArrangements.push({ groups: Object.keys(tempGroups), name: "" });
	}

	let slidesWithoutGroup = Object.keys(tempSlides).filter(
		(id) => !Object.values(tempGroups).find((a) => a.slides.includes(id))
	);
	if (slidesWithoutGroup.length)
		slidesWithoutGroup.forEach((id) => createSlide(id));

	tempArrangements.forEach(createLayout);
	function createLayout({ name = "", groups }) {
		layouts.push({
			id: uid(),
			name,
			notes: "",
			slides: createSlides(groups),
		});
	}

	function createSlides(groups) {
		let layoutSlides = [];

		groups.forEach((groupId) => {
			let group = tempGroups[groupId];

			let allSlides = group.slides.map((id, i) =>
				createSlide(id, i === 0, {
					color: group.color,
					name: group.name,
				})
			);
			if (allSlides.length > 1) {
				let children = allSlides.slice(1).map(({ id }) => id);
				slides[allSlides[0].id].children = children;
			}

			layoutSlides.push(allSlides[0]);
		});

		return layoutSlides;
	}

	function createSlide(id, isParent = true, { color, name } = {}) {
		if (tempLayouts[id]) return tempLayouts[id];

		let slideId = uid();
		let layoutSlide = { id: slideId };

		let tempSlide = tempSlides[id];

		if (tempSlide.disabled) layoutSlide.disabled = true;

		if (tempSlide.media) {
			let mediaId = uid();
			let path = tempSlide.media;
			media[mediaId] = {
				name: getFileName(path),
				path,
				type: getMediaType(getExtension(path)),
			};
			layoutSlide.background = mediaId;
		}

		let slide = {
			group: null,
			color: null,
			settings: {
				background: tempSlide.backgroundColor,
				resolution: tempSlide.size,
			},
			notes: "",
			items: tempSlide.items.map(convertItem),
		};

		if (isParent) {
			let group = name || tempSlide.name || "";
			// let globalGroup = getGlobalGroup(group);
			slide.color = color || "";
			slide.group = group || "";
			// if (globalGroup) slide.globalGroup = globalGroup;
		}

		slides[slideId] = slide;
		tempLayouts[id] = layoutSlide;
		return layoutSlide;
	}

	return { slides, layouts, media };
}

function convertItem(item) {
	let text = item.text;
	let style = itemStyle;
	if (item.bounds) {
		let pos = item.bounds.origin;
		let size = item.bounds.size;
		if (Object.keys(pos).length === 2 && Object.keys(size).length === 2) {
			style = `left:${pos.x}px;top:${pos.y}px;width:${size.width}px;height:${size.height}px;`;
		}
	}

	let newItem = {
		style,
		lines: text.split("\n").map(getLine),
	};

	return newItem;

	function getLine(text) {
		return { align: "", text: [{ value: text, style: "" }] };
	}
}

function getArrangements(arrangements) {
	if (!arrangements) return [];

	let newArrangements = [];
	arrangements.forEach((a) => {
		newArrangements.push({
			name: a.name,
			groups: a.groupIdentifiers.map((a) => a.string),
		});
	});

	return newArrangements;
}

function getGroups(groups) {
	if (!groups) return {};

	let newGroups = {};
	groups.forEach(({ group, cueIdentifiers }) => {
		newGroups[group.uuid.string] = {
			name: group.name,
			color: getColorValue(group.color),
			slides: cueIdentifiers.map((a) => a.string),
		};
	});

	return newGroups;
}

function getSlides(cues) {
	let slides = {};

	cues.forEach((slide) => {
		let baseSlide =
			slide.actions.find((a) => a.slide?.presentation)?.slide
				?.presentation?.baseSlide || {};
		if (!baseSlide) return;

		slides[slide.uuid.string] = {
			name: slide.name,
			disabled: !slide.isEnabled,
			media: slide.actions.find((a) => a.media?.element)?.media?.element
				?.url?.absoluteString,
			backgroundColor: getColorValue(baseSlide.backgroundColor),
			size: baseSlide.size,
			items: baseSlide.elements?.map(getItem) || [],
		};
	});

	return slides;
}

function getItem(item) {
	let newItem = {};

	newItem.bounds = item.element.bounds;
	newItem.text = decodeRTF(item.element.text.rtfData);

	return newItem;
}

function decodeRTF(text) {
	text = decodeBase64(text);
	// console.log(text)
	text = RTFToText(text);
	// console.log(text)
	return text;
}

function getColorValue(color) {
	if (!color) return "";

	color = {
		red: color.red || 0,
		green: color.green || 0,
		blue: color.blue || 0,
		alpha: color.alpha || 1,
	};

	return (
		"rgb(" +
		[
			color.red.toFixed(2),
			color.green.toFixed(2),
			color.blue.toFixed(2),
		].join(" ") +
		" / " +
		color.alpha.toFixed(1) +
		")"
	);
}

function decodeBase64(text) {
	let b = 0,
		l = 0,
		r = "";
	let m = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

	text.split("").forEach(function (v) {
		b = (b << 6) + m.indexOf(v);
		l += 6;
		if (l >= 8) r += String.fromCharCode((b >>> (l -= 8)) & 0xff);
	});

	// https://www.oreilly.com/library/view/rtf-pocket-guide/9781449302047/ch04.html
	r = r.replaceAll("\\u8217 ?", "'");
	r = r.replaceAll("\\'92", "'");
	r = r.replaceAll("\\'96", "–");
	// convert ‘ & ’ to '
	r = r.replaceAll("‘", "'").replaceAll("’", "'");

	r = r.replaceAll("\\'e6", "æ");
	r = r.replaceAll("\\'f8", "ø");
	r = r.replaceAll("\\'e5", "å");
	r = r.replaceAll("\\'c6", "Æ");
	r = r.replaceAll("\\'d8", "Ø");
	r = r.replaceAll("\\'c5", "Å");

	r = r.replaceAll("\\'f6", "ö");
	r = r.replaceAll("\\'e4", "ä");
	r = r.replaceAll("\\'d6", "Ö");
	r = r.replaceAll("\\'c4", "Ä");

	r = r.replaceAll("\\'89", "ä"); // ‰
	r = r.replaceAll("\\'88", "ö"); // ∘
	r = r.replaceAll("\\'c2", "å"); // Â
	r = r.replaceAll("\\'a5", "ra"); // ¥

	// decode encoded unicode dec letters
	// https://unicodelookup.com/
	let decCode = r.indexOf("\\u");
	while (decCode > -1) {
		let endOfCode = r.indexOf(" ?", decCode) + 2;

		if (endOfCode > 1 && endOfCode - decCode <= 10) {
			let decodedLetter = String.fromCharCode(
				Number(r.slice(decCode, endOfCode).replace(/[^\d-]/g, ""))
			);
			if (!decodedLetter.includes("\\x"))
				r = r.slice(0, decCode) + decodedLetter + r.slice(endOfCode);
		}

		decCode = r.indexOf("\\u", decCode + 1);
	}

	return r;
}

function RTFToText(input) {
	input = input.slice(0, input.lastIndexOf("}"));
	input = input.replaceAll("\\pard", "\\remove");
	input = input.replaceAll("\\part", "\\remove");
	input = input.replaceAll("\\par", "__BREAK__");
	input = input.replaceAll("\\\n", "__BREAK__");
	input = input.replaceAll("\n", "__BREAK__");

	// https://stackoverflow.com/a/188877
	const regex = /\{\*?\\[^{}]+}|[{}]|\\\n?[A-Za-z]+\n?(?:-?\d+)?[ ]?/gm;
	let newInput = input.replace(regex, "").replaceAll("\\*", "");

	// some files have {} wapped around the text, so it gets removed
	if (!newInput.replaceAll("__BREAK__", "").trim().length) {
		input = input.replaceAll("}", "").replaceAll("{", "");
		newInput = input.replace(regex, "").replaceAll("\\*", "");

		let formatting = newInput.lastIndexOf(";;;;");
		if (formatting >= 0) newInput = newInput.slice(formatting + 4);

		newInput = newInput.replaceAll(";;", "");
	}

	let splitted = newInput.split("__BREAK__").filter((a) => a);
	return splitted.join("\n").trim();
}

module.exports = convertProToSlides;
