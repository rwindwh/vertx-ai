const fs = require('fs');
const path = require('path');
const Sure = require('./ai.sure');
const Log = require('./ai.log');
const E = require('./ai.error');
const Fx = require('./ai.fx');
const Word = require('./ai.word');
const It = require('./ai.collection');
const Arr = require('./ai.array');

const SEPRATOR = path.sep;

const toJObject = (content = "") => {
    Sure.cxJString(content);
    return JSON.parse(content);
};
const valueJObject = (object = {}, keysData) => {
    const values = [];
    const keys = keysData ? keysData : Object.keys(object);
    keys.forEach(key => values.push(undefined !== object[key] ? object[key] : ""));
    return values;
};
const toJArray = (content = "") => {
    Sure.cxJString(content);
    return JSON.parse(content);
};
const _findMaxFields = (array = []) => {
    let keys = {};
    for (let idx = 0; idx < array.length; idx++) {
        const length = Object.keys(array[idx]).length;
        if (length > Object.keys(keys).length) {
            keys = array[idx];
        }
    }
    return Object.keys(keys);
};
const toCsv = (array = [], mapping = {}, seperator) => {
    let lines = [];
    if (0 < array.length) {
        const keys = _findMaxFields(array);
        // 转换字段信息
        const formatted = {};
        keys.forEach(key => formatted[key] = key);
        It.itObject(mapping, (from, to) => {
            if (formatted.hasOwnProperty(from)) {
                Log.info(`字段执行转换：${from.red} -> ${to.blue}`);
                formatted[to] = to;
                delete formatted[from];
            }
        });
        const header = Object.keys(formatted);
        lines.push(Word.joinWith(header, seperator));
        array.forEach(each => {
            It.itObject(mapping, (from, to) => {
                if (each.hasOwnProperty(from)) {
                    each[to] = each[from];
                    delete each[from];
                }
            });
            const line = valueJObject(each, Object.keys(formatted));
            lines.push(Word.joinWith(line, seperator));
        });
        return lines;
    }
    return lines;
};

const isFile = (path) => fs.statSync(path).isFile();
const isDirectory = (path) => fs.statSync(path).isDirectory();
const isExist = (path) => fs.existsSync(path);
const _outFile = (paths, content, sync) => {
    if (sync) {
        fs.writeFileSync(paths, content);
        Log.info(`（Sync）成功将数据写入到文件：${paths}！`.cyan);
    } else {
        fs.writeFile(paths, content, (res) => {
            Log.info(`（Async）成功将数据写入到文件：${paths}！`.cyan);
        });
    }
};
const outJson = (paths, content) => Fx.fxContinue(!!content, () => _outFile(paths, JSON.stringify(content, null, 4)));
const outString = (paths, content, sync = false) => Fx.fxContinue(!!content, () => _outFile(paths, content, sync));
const resolveDirectory = (path = "") => {
    let result = path.trim();
    if (result.endsWith(SEPRATOR)) {
        result = result.substring(0, result.length - 1);
    }
    return result;
};
const cycleParent = (path, includeCurrent = false) => {
    let result = [];
    if (includeCurrent) {
        result.push(path);
    }
    Fx.fxContinue(fs.existsSync(path), () => {
        let parent = resolveDirectory(path);
        parent = parent.substring(0, parent.lastIndexOf(SEPRATOR));
        result.push(parent);
        result = result.concat(cycleParent(parent, false));
    });
    return result;
};

const deleteFolder = (path) => {
    if (fs.existsSync(path)) {
        const etat = fs.statSync(path);
        if (etat.isDirectory()) {
            const children = fs.readdirSync(path);
            if (0 === children.length) {
                fs.rmdirSync(path);
            } else {
                children.forEach(item => {
                    const hitted = path + SEPRATOR + item;
                    deleteFolder(hitted);
                });
            }
        } else {
            Log.info(`删除文件：${path}`);
            fs.unlinkSync(path);
        }
    }
};

const copyPath = (from, to) => {
    Fx.fxContinue(isExist(from) && !isExist(to), () => {
        Fx.fxContinue(isFile(from), () => {
            const content = ioString(from);
            outString(to, content);
        })
    });
};

const deletePath = (path) => {
    Fx.fxTerminal(SEPRATOR === path.trim(), E.fn10024(path));
    deleteFolder(path);
};
const cycleChildren = (path, includeCurrent = true) => {
    let result = [];
    if (includeCurrent) {
        result.push(path);
    }
    Fx.fxContinue(fs.existsSync(path), () => {
        const folders = fs.readdirSync(path);
        const directory = resolveDirectory(path) + SEPRATOR;
        folders.forEach(item => Fx.fxContinue(!item.startsWith('.'), () => {
            const absolute = directory + item;
            if (isDirectory(absolute)) {
                result.push(absolute);
                result = result.concat(cycleChildren(absolute, false));
            }
        }));
    });
    return result;
};
const ioJObject = (path) => isFile(path) ? toJObject(fs.readFileSync(path, "utf-8")) : {};
const ioJArray = (path) => isFile(path) ? toJArray(fs.readFileSync(path, "utf-8")) : [];
const ioString = (path) => isFile(path) ? fs.readFileSync(path, "utf-8") : "";
const ioStream = (path) => isFile(path) ? fs.readFileSync(path) : null;
const ioProp = (path) => {
    if (isFile(path)) {
        const content = ioString(path);
        const lines = content.split('\n');
        const result = {};
        lines.forEach(line => {
            const kv = line.split('=');
            const key = kv[0] ? kv[0].trim() : undefined;
            const value = kv[1] ? kv[1].trim() : undefined;
            if (key && value) {
                result[key] = value;
            }
        });
        return result;
    } else {
        return {};
    }
};
const ioFiles = (folder) => {
    const fileArr = [];
    if (isDirectory(folder)) {
        const files = fs.readdirSync(folder);
        files.forEach(item => {
            const file = item;
            const path = `${folder}${SEPRATOR}${item}`;
            fileArr.push({file, path})
        });
    }
    return fileArr;
};

const _makeTrace = (path = "") => {
    const folderTrace = path.split(SEPRATOR).filter(each => '' !== each);
    const folderInfo = [];
    folderTrace.forEach((trace, index) => {
        const formated = `${SEPRATOR}${trace}`;
        const previous = folderInfo[index - 1];
        let item = null;
        if (previous) {
            item = `${previous}${formated}`;
        } else {
            item = `${formated}`;
        }
        folderInfo.push(item);
    });
    return folderInfo
};

const makeDirs = (path = "") => {
    // TODO: Path专用
    const folderInfo = _makeTrace(path);
    // 查找第一个存在的目录
    const lefts = folderInfo.filter(item => !isExist(item)).sort((left, right) => left.length - right.length);
    lefts.filter(item => '' !== item).forEach(left => {
        Log.info("创建目录：" + left.yellow);
        fs.mkdirSync(left);
    });
    return true;
};
const ioCsv = (file, separator) => {
    const data = ioString(file).split('\n');
    const header = data.shift();
    const lines = [];
    data.forEach(line => {
        if (line && 0 < line.trim().length) {
            const item = Arr.elementZipper(header.split(separator), line.split(separator), true);
            lines.push(item);
        }
    });
    return lines;
};
const ioRoot = () => {
    const folderInfo = _makeTrace(__dirname);
    let root = folderInfo.filter(item => item.endsWith("src"));
    Fx.fxTerminal(1 !== root.length, E.fn10022(__dirname));
    return root[0];
};
const ioName = (path = '.') => {
    const stat = fs.statSync(path);
    if (stat.isDirectory()) {
        return path.substring(path.lastIndexOf(SEPRATOR) + 1);
    }
};
module.exports = {
    ioName,
    ioRoot,

    cycleParent,
    cycleChildren,
    makeDirs,

    resolveDirectory,
    valueJObject,

    toJObject,
    toJArray,
    toCsv,

    copyPath,

    ioJArray,
    ioJObject,
    ioString,
    ioStream,
    ioCsv,
    ioProp,
    ioFiles,

    deletePath,

    outJson,
    outString,

    isFile,
    isDirectory,
    isExist
};