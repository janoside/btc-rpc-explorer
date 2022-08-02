const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const dirs = [
	path.join(process.cwd(), "public/js/"),
	path.join(process.cwd(), "public/style/"),
];

const filetypeMatch = /^.*\.(js|css)$/;

dirs.forEach(dirPath => {
	console.log("\nDirectory: " + dirPath);

	fs.readdirSync(dirPath).forEach(file => {
		if (file.match(filetypeMatch)) {
			var content = fs.readFileSync(path.join(dirPath, file));

			var hash = crypto.createHash("sha384");

			data = hash.update(content, 'utf-8');

			gen_hash= data.digest('base64');

			console.log("File: " + file + " -> " + gen_hash);
		}
	});
});
