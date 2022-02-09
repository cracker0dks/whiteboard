const path = require("path");

const getArgs = function () {
    const args = {};
    process.argv.slice(2, process.argv.length).forEach((arg) => {
        // long arg
        if (arg.slice(0, 2) === "--") {
            const longArg = arg.split("=");
            args[longArg[0].slice(2, longArg[0].length)] = longArg[1];
        }
        // flags
        else if (arg[0] === "-") {
            const flags = arg.slice(1, arg.length).split("");
            flags.forEach((flag) => {
                args[flag] = true;
            });
        }
    });
    return args;
};

/**
 * Creates a safe filepath given a trusted rootPath and untrusted singleFileSegment.
 * Prevents directory traversal attacks.
 *
 * @param {string} rootPath Root path - can be relative or absolute
 * @param {string} singleFileSegment A single file or folder segment - it should not have any path information
 * @return {string} A safe to use path combined of rootPath and singleFileSegment
 * @throws {Error} If singleFileSegment contains potentially unsafe directory characters or path information
 */
const getSafeFilePath = function (rootPath, singleFileSegment) {
    var filePath = path.join(rootPath, singleFileSegment);
    if (
        (path.dirname(filePath) !== rootPath &&
            path.dirname(filePath) !== rootPath.replace("/", "\\")) ||
        path.basename(filePath) !== singleFileSegment ||
        path.normalize(singleFileSegment) !== singleFileSegment
    ) {
        var errorMessage = "Attempted path traversal attack: ";
        console.log(errorMessage, {
            rootPath: rootPath,
            singleFileSegment: singleFileSegment,
        });
        throw new Error(errorMessage + singleFileSegment);
    }
    return filePath;
};

module.exports = {
    getArgs,
    getSafeFilePath,
};
