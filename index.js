let path = require('path');
let util = require('gulp-util');
let Promise = require('promise');
let through = require('through2');
let crypto = require('crypto');
let jsdom = require('jsdom');
let Url = require('url');
let request = require('request');
let File = require('vinyl-file');
let QS = require('querystring');

let PluginError = util.PluginError;

const PLUGIN_NAME = 'gulp-rev-imported-file-link';

let RevImportedFileLink = function (options) {
    // 定义默认options
    let defaults = {
        hashLength: 8,
        hashMethod: 'md5',
        isUrlVersion: true,
    };

    // 将default options 与 传入的options 合并
    this.options = Object.assign({}, defaults, options);

    // 定义所有引用的url/path集合
    this.links = [];

    // url正则
    this.urlReg = "^(http(s)?:)?//[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,3}(\/\w*)?((/[0-9a-zA-Z_!~*'().;?:@&=+,%#-//]*)*/?)$";
};

RevImportedFileLink.prototype.revise = function () {
    let self = this;
    return through.obj(function (file, enc, cb) {
        let that = this;
        let base = file.base;
        if (file.isStream()) {
            throw new PluginError(PLUGIN_NAME, 'Streams are not supported!');
        }
        if (file.isBuffer()) {
            // 将file的内容由Buffer转为string类型
            let fileString = self.getFileString(file.contents);
            that.push(file);

            // 通过jsdom获取script link标签中引用的链接
            jsdom.env({
                html: fileString,
                done: function (err, window) {
                    if (!err) {
                        // 查找script标签中的src参数
                        let scriptTags = window.document.getElementsByTagName('script');
                        for (let i = 0; i < scriptTags.length; i++) {
                            self.links.push(scriptTags[i].src);
                        }
                        // 查找link标签中的href参数
                        let linkTags = window.document.getElementsByTagName('link');
                        for (let j = 0; j < linkTags.length; j++) {
                            self.links.push(linkTags[j].href);
                        }

                        // 对找到的link进行处理
                        self.processLinks(self.links, base).then(function () {
                            // 替换原有link
                            fileString = self.linkMap.reduce(function (str, link) {
                                return str.replace(link.old, link.new);
                            }, fileString);

                            // 更新文件内容
                            file.contents = new Buffer(fileString);

                            // 返回
                            that.push(file);
                            cb();
                        }, function () {
                            throw new PluginError(PLUGIN_NAME, 'Process Error')
                        })
                    } else {
                        throw new PluginError(PLUGIN_NAME, 'Read Source File Error')
                    }
                }
            })
        }
    });
};

RevImportedFileLink.prototype.getFileString = function (contents) {
    return contents.toString();
};

RevImportedFileLink.prototype.getHash = function (src, len, method) {
    return crypto.createHash(method || 'md5').update(src).digest('hex').slice(0, len);
};

RevImportedFileLink.prototype.processLinks = function (links, base) {
    let urlReg = new RegExp(this.urlReg);
    let self = this;

    let acts = links.map(function (link) {
        return new Promise(function(resolve, reject) {
            // 利用url库解析相对路径文件
            let url = Url.parse(link);
            let pathname = url.pathname;
            let qs = QS.parse(url.query);

            // 如果link是url则使用jsdom读文件
            if (urlReg.test(link)) {
                // 如果需要改变url中的版本
                if (self.options.isUrlVersion) {
                    // 将以//开头的url补充http协议
                    let doubleSlashStartPattern = /^\/\//;
                    let doubleSlashStartReg = new RegExp(doubleSlashStartPattern);
                    let fullLink = doubleSlashStartReg.test(link) ? link.replace(doubleSlashStartPattern, 'http://') : link;
                    request.get(fullLink, function (err, res, body) {
                        if(!err) {
                            qs.v = self.getHash(body, 8);
                            resolve({
                                link,
                                qs: QS.stringify(qs)
                            })
                        } else {
                            reject(err);
                        }
                    })
                }
                // 否则尝试读本地文件
            } else {
                let qs = QS.parse(url.query);
                console.log(base, path.resolve(base, pathname));
                File.read(path.resolve(base, pathname)).then(function (file) {
                    qs.v = self.getHash(file.contents, 8);
                    resolve(resolve({
                        link,
                        qs: QS.stringify(qs)
                    }))
                });
            }
        });
    });

    return Promise.all(acts).then(function (values) {
        self.linkMap = values.map(function (value) {
            let path = value.link.substr(0, value.link.indexOf('?')) || value.link;
            let result = {
                old: value.link,
                new: path + '?' + value.qs
            };
            return result;
        })
    });
};

// 对options的支持，之后加上
module.exports = new RevImportedFileLink();
