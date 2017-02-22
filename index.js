var Util = require('gulp-util');
var Moment = require('moment');
var Through = require('through2');
var crypto = require('crypto');

var PluginError = Util.PluginError;

var RevImportedFileLink = (function () {
    // 使用严格模式
    'use strict';
    // 构造函数定义
    var RevImportedFileLink = function (options) {
        // 定义默认options
        var defaults = {
            ext: ['html', 'js', 'css', 'less'],  // 待替换的文件扩展名
            fileReg: /\@version\@/,  // 文件url的正则表达式
            version: '',
            hashLength: 8,
            hashMethod: 'md5',
        };

        // 将default options 与 传入的options 合并
        this.options = Object.assign({}, defaults, options);

        // 默认version采用当前时间的md5
        if (!this.options.version || this.options.length <= 0) {
            this.options.version = this.getHash(Moment().format(), this.options.hashLength, this.options.hashMethod);
        }

        // 待替换的文件的正则匹配表达式
        this.fileReg = this.options.fileReg;
    };

    RevImportedFileLink.prototype.revise = function () {
        var self = this;
        var options = self.options
        return Through.obj(function (file, enc, cb) {
            if (file.isStream()) {
                this.emit('error', new PluginError(PLUGIN_NAME, 'Streams are not supported!'));
                return cb();
            }
            if (file.isBuffer()) {
                var fileString = self.getFileString(file.contents);
                var newFileString = self.replaceReg(fileString, options.fileReg, options.version);
                console.log(newFileString);
            }
            // 确保文件进入下一个 gulp 插件
            this.push(file);

            cb();
        });
    };

    RevImportedFileLink.prototype.changeFileLinkVersion = function (fileContent, version) {
        return
    };

    RevImportedFileLink.prototype.getFileString = function (contents) {
        return contents.toString();
    };

    RevImportedFileLink.prototype.replaceReg = function (str, reg, version) {
        console.log(version);
        if (version) {
            return str.replace(reg, version);
        } else {
            return str;
        }
    };

    RevImportedFileLink.prototype.getHash = function (src, len, method) {
        return crypto.createHash(method || 'md5').update(src).digest('hex').slice(0, len);
    };

    return RevImportedFileLink;
})();

module.exports = RevImportedFileLink;
