const fs = require('fs');
const Mock = require("mockjs");
const {v4} = require("uuid");
const Field = require("../generator/model/field");
const log = require('./log');
const Random = Mock.Random;
const execFileExist = (configFile, callback) => {
    if (fs.existsSync(configFile)) {
        log.info(`从配置文件初始化，配置文件路径: ${configFile}.`);
        callback(configFile);
    } else {
        log.error(`配置文件路径不存在: ${configFile}`);
    }
};
const eachField = (module = {}, callback) => {
    if (module['fields']) {
        module['fields'].forEach((field, index) => {
            try {
                const obj = new Field(field);
                if (callback) callback(obj, index === module['fields'].length - 1);
            } catch (error) {
                log.error(`${module.code} -> 字段表达式无法解析！`);
                console.error(error);
                process.exit();
            }
        });
    } else {
        log.error(`${module.code} -> 配置数据有问题，没有\`fields\`节点！`);
        process.exit();
    }
};
const dataGenerator = {
    "Code": () => Random.string('ABCDEFGHIJKLMNOPQRSTUVWXYZ.', 6),
    "CnCompany": () => Random.ctitle() + "企业",
    "CnDept": () => Random.ctitle(2, 4) + "部",
    "EnCompany": () => Random.title(1, 3) + " Company",
    "CnUser": () => Random.cname(),
    "HeadCount": () => Random.natural(10, 1000),
    "Web": () => Random.url('http'),
    "Scope": () => "范围" + Random.ctitle(4),
    "Email": () => Random.email(),
    "CnAddress": () => Random.region() + Random.county(true) + Random.ctitle(),
    "EnAddress": () => Random.first() + ', State ' + Random.title(1) + ", Street " + Random.last(),
    "Mobile": () => "1" + Random.string("123456789", 10),
    "Phone": () => "(0" + Random.string("0123456789", 2) + ") " + Random.string("0123456789", 4) + " " + Random.string("0123456789", 4),
    "CnText": () => Random.cparagraph(),
    "EnText": () => Random.paragraph(),
    "Bool": () => Random.bool(),
    "StringGender": () => Random.string("男女", 1),
    "IpV4": () => Random.natural(0, 255) + "." + Random.natural(0, 255) + "." + Random.natural(0, 255) + "." + Random.natural(0, 255),
    "Date": () => Random.date(),
    "DateTime": () => Random.datetime(),
    "Version": () => Random.natural(1, 20) + "." + Random.natural(1, 999),
    "PercentFloat": () => Random.float(0, 0, 1, 99).toFixed(2),
    "CnTitle": () => Random.ctitle(3, 8),
};
for (let idx = 0; idx < 20; idx++) {
    dataGenerator[`Number${idx + 1}`] = () => Random.string("0123456789", idx + 1);
    dataGenerator[`String${idx + 1}`] = () => Random.string(idx + 1);
    dataGenerator[`CnString${idx + 1}`] = () => Random.ctitle(idx + 1);
}
const execData = (module) => {
    const record = {};
    record.key = v4();
    if (module.data) {
        for (const key in module.data) {
            if (module.data.hasOwnProperty(key)) {
                const generator = module.data[key];
                if (dataGenerator[generator]) {
                    record[key] = dataGenerator[generator]()
                } else {
                    if (Array.prototype.isPrototypeOf(generator)) {
                        const index = generator.length - 1;
                        const hit = Random.natural(0, index);
                        record[key] = generator[hit];
                    } else {
                        if (generator.startsWith("Fixed:")) {
                            record[key] = generator.substring(6);
                        } else {
                            record[key] = generator + Random.string(2);
                        }
                    }
                }
            }
        }
    }
    // 特殊内容处理
    if (!record.createDate) record.createDate = new Date().toISOString().split('.')[0];
    if (!record.lastModifiedDate) record.lastModifiedDate = new Date().toISOString().split('.')[0];
    record.active = true;
    return record;
};
module.exports = {
    execFileExist,
    execData,
    eachField
};