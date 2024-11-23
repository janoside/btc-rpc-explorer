const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const dirs = [
	"public/js/",
	"public/style/",
	"public/leaflet/",
	"public/font/",
];

const filetypeMatch = /^.*\.(js|css)$/;

const hashesByFilename = {};

dirs.forEach(dirPath => {
	console.log("\nDirectory: " + dirPath);

	fs.readdirSync(path.join(process.cwd(), dirPath)).forEach(file => {
		if (file.match(filetypeMatch)) {
			var content = fs.readFileSync(path.join(dirPath, file));

			var hash = crypto.createHash("sha384");

			data = hash.update(content, 'utf-8');

			gen_hash = data.digest('base64');

			console.log("\t" + file + " -> " + gen_hash);

			hashesByFilename[file] = `sha384-${gen_hash}`;
		}
	});
});

let fileContent = "module.exports =\n" + JSON.stringify(hashesByFilename, null, 4) + ";";

fs.writeFileSync(path.join(process.cwd(), "app/resourceIntegrityHashes.js"), fileContent);

console.log("\napp/resourceIntegrityHashes.js written.\n");