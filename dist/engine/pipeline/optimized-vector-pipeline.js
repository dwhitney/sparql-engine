/* file : array-pipeline.ts
MIT License

Copyright (c) 2019 Thomas Minier

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
'use strict';
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spread = (this && this.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
var pipeline_engine_1 = require("./pipeline-engine");
var lodash_1 = require("lodash");
/**
 * A PipelineStage which materializes all intermediate results in main memory.
 * @author Thomas Minier
 */
var ArrayStage = /** @class */ (function () {
    function ArrayStage(promise, content) {
        var _this = this;
        this._promise = promise;
        this._content = (promise === undefined) ? [] : undefined;
        if (content !== undefined)
            this._content = content;
        if (this._promise) {
            this._promise.then(function (content) { return _this._content = content; });
        }
    }
    ArrayStage.prototype.getContent = function () {
        return this._content;
    };
    ArrayStage.prototype.getPromise = function () {
        return this._promise;
    };
    ArrayStage.prototype.subscribe = function (onData, onError, onEnd) {
        if (this._content !== undefined) {
            try {
                this._content.forEach(onData);
            }
            catch (e) {
                onError(e);
            }
        }
        else {
            try {
                if (this._promise !== undefined) {
                    this._promise
                        .then(function (c) {
                        c.forEach(onData);
                        onEnd();
                    })
                        .catch(onError);
                }
            }
            catch (e) {
                onError(e);
            }
        }
    };
    ArrayStage.prototype.forEach = function (cb) {
        if (this._content !== undefined) {
            this._content.forEach(cb);
        }
        else {
            if (this._promise !== undefined) {
                this._promise
                    .then(function (c) {
                    c.forEach(cb);
                });
            }
        }
    };
    return ArrayStage;
}());
exports.ArrayStage = ArrayStage;
/**
 * A pipeline implemented using {@link ArrayStage}, *i.e.*, all intermediate results are materialized in main memory. This approach is often called **vectorized approach**.
 * This pipeline is more efficient CPU-wise than {@link RxjsPipeline}, but it also consumes much more memory, as it materializes evey stage of the pipeline before moving to the next.
 * It should only be used when SPARQL queries generate few intermediate results.
 * @see P. A. Boncz, S. Manegold, and M. L. Kersten. "Database architecture evolution: Mammals flourished long before dinosaurs became extinct". PVLDB, (2009)
 * @author Thomas Minier
 */
var ArrayPipeline = /** @class */ (function (_super) {
    __extends(ArrayPipeline, _super);
    function ArrayPipeline() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ArrayPipeline.prototype.empty = function () {
        return new ArrayStage(undefined, []);
    };
    ArrayPipeline.prototype.of = function () {
        var values = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            values[_i] = arguments[_i];
        }
        return new ArrayStage(undefined, values);
    };
    ArrayPipeline.prototype.from = function (x) {
        if (x.getContent !== undefined) {
            return new ArrayStage(x.getPromise(), x.getContent());
        }
        else if (Array.isArray(x)) {
            return new ArrayStage(Promise.resolve(x));
        }
        else if (x.then !== undefined) {
            return new ArrayStage(x.then(function (v) { return [v]; }));
        }
        else if (Symbol.iterator in x) {
            return new ArrayStage(Promise.resolve(Array.from(x)));
        }
        throw new Error('Invalid argument for ArrayPipeline.from: ' + x);
    };
    ArrayPipeline.prototype.clone = function (stage) {
        var content = stage.getContent();
        if (content !== undefined) {
            return new ArrayStage(undefined, content.slice(0));
        }
        var promise = stage.getPromise();
        if (promise !== undefined) {
            return new ArrayStage(promise.then(function (c) { return c.slice(0); }), undefined);
        }
        return new ArrayStage(undefined, []);
    };
    ArrayPipeline.prototype.catch = function (input, handler) {
        try {
            var content = input.getContent();
            if (content !== undefined)
                return new ArrayStage(undefined, content.slice(0));
            var promise = input.getPromise();
            if (promise !== undefined) {
                return new ArrayStage(promise.then(function (c) { return new Promise(function (resolve, reject) {
                    try {
                        resolve(c.slice(0));
                    }
                    catch (e) {
                        if (handler === undefined) {
                            return new ArrayStage(new Promise(function (resolve, reject) { return reject(e); }), undefined);
                        }
                        return handler(e);
                    }
                }); }));
            }
            return new ArrayStage(undefined, []);
        }
        catch (e) {
            if (handler === undefined) {
                return new ArrayStage(new Promise(function (resolve, reject) { return reject(e); }), undefined);
            }
            return handler(e);
        }
    };
    ArrayPipeline.prototype.merge = function () {
        var inputs = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            inputs[_i] = arguments[_i];
        }
        var allContent = true;
        inputs.forEach(function (stage) {
            if (stage.getContent() === undefined)
                allContent = false;
        });
        if (allContent) {
            return new ArrayStage(undefined, lodash_1.flatten(inputs.map(function (stage) { return stage.getContent(); })));
        }
        else {
            var stages_1 = [];
            inputs.forEach(function (stage) {
                var content = stage.getContent();
                var promise = stage.getPromise();
                if (content !== undefined)
                    stages_1.push(Promise.resolve(content));
                else if (promise !== undefined)
                    stages_1.push(promise);
                else
                    stages_1.push(Promise.resolve([]));
            });
            return new ArrayStage(Promise.all(stages_1).then(function (contents) {
                return lodash_1.flatten(contents);
            }));
        }
    };
    ArrayPipeline.prototype.map = function (input, mapper) {
        var content = input.getContent();
        if (content !== undefined)
            return new ArrayStage(undefined, content.map(mapper));
        var promise = input.getPromise();
        if (promise !== undefined)
            return new ArrayStage(promise.then(function (c) { return c.map(mapper); }, undefined));
        return new ArrayStage(undefined, []);
    };
    ArrayPipeline.prototype.flatMap = function (input, mapper) {
        var content = input.getContent();
        if (content !== undefined)
            return new ArrayStage(undefined, lodash_1.flatMap(content, mapper));
        var promise = input.getPromise();
        if (promise !== undefined)
            return new ArrayStage(promise.then(function (c) { return lodash_1.flatMap(c, mapper); }), undefined);
        return new ArrayStage(undefined, []);
    };
    ArrayPipeline.prototype.mergeMap = function (input, mapper) {
        var _this = this;
        var content = input.getContent();
        if (content !== undefined) {
            return this.merge.apply(this, __spread(content.map(mapper)));
        }
        var promise = input.getPromise();
        if (promise !== undefined) {
            var newPromise = promise.then(function (content) {
                var stage = _this.merge.apply(_this, __spread(content.map(mapper)));
                var c = stage.getContent();
                if (c !== undefined)
                    return c;
                var p = stage.getPromise();
                if (p !== undefined)
                    return p;
                return [];
            });
            return new ArrayStage(newPromise, undefined);
        }
        return new ArrayStage(undefined, []);
    };
    ArrayPipeline.prototype.filter = function (input, predicate) {
        var content = input.getContent();
        if (content !== undefined)
            return new ArrayStage(undefined, content.filter(predicate));
        var promise = input.getPromise();
        if (promise !== undefined)
            return new ArrayStage(promise.then(function (c) { return c.filter(predicate); }), undefined);
        return new ArrayStage(undefined, []);
    };
    ArrayPipeline.prototype.reduce = function (input, reducer, initial) {
        var content = input.getContent();
        if (content !== undefined)
            return new ArrayStage(undefined, [content.reduce(reducer, initial)]);
        var promise = input.getPromise();
        if (promise !== undefined)
            return new ArrayStage(promise.then(function (c) { return [c.reduce(reducer, initial)]; }), undefined);
        return new ArrayStage(undefined, []);
    };
    ArrayPipeline.prototype.limit = function (input, stopAfter) {
        var content = input.getContent();
        if (content !== undefined)
            return new ArrayStage(undefined, lodash_1.slice(content, 0, stopAfter));
        var promise = input.getPromise();
        if (promise !== undefined)
            return new ArrayStage(promise.then(function (c) { return lodash_1.slice(c, 0, stopAfter); }, undefined));
        return new ArrayStage(undefined, []);
    };
    ArrayPipeline.prototype.skip = function (input, toSkip) {
        var content = input.getContent();
        if (content !== undefined)
            return new ArrayStage(undefined, lodash_1.slice(content, toSkip));
        var promise = input.getPromise();
        if (promise !== undefined)
            return new ArrayStage(promise.then(function (c) { return lodash_1.slice(c, toSkip); }), undefined);
        return new ArrayStage(undefined, []);
    };
    ArrayPipeline.prototype.distinct = function (input, selector) {
        var fn = (selector === undefined) ? lodash_1.uniq : selector;
        var content = input.getContent();
        //@ts-ignore
        if (content !== undefined)
            return new ArrayStage(undefined, fn(content));
        var promise = input.getPromise();
        //@ts-ignore
        if (promise !== undefined)
            return new ArrayStage(promise.then(function (c) { return fn(content); }), undefined);
        return new ArrayStage(undefined, []);
    };
    ArrayPipeline.prototype.defaultValues = function (input) {
        var values = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            values[_i - 1] = arguments[_i];
        }
        var content = input.getContent();
        if (content !== undefined) {
            content = (content.length > 0) ? content : values;
            return new ArrayStage(undefined, content);
        }
        var promise = input.getPromise();
        if (promise !== undefined) {
            return new ArrayStage(promise.then(function (c) { return (c.length > 0) ? c : values; }), undefined);
        }
        return new ArrayStage(undefined, values);
    };
    ArrayPipeline.prototype.bufferCount = function (input, count) {
        var content = input.getContent();
        if (content !== undefined)
            return new ArrayStage(undefined, lodash_1.chunk(content, count));
        var promise = input.getPromise();
        if (promise !== undefined)
            return new ArrayStage(promise.then(function (c) { return lodash_1.chunk(c, count); }), undefined);
        return new ArrayStage(undefined, []);
    };
    ArrayPipeline.prototype.forEach = function (input, cb) {
        input.forEach(cb);
    };
    ArrayPipeline.prototype.first = function (input) {
        var content = input.getContent();
        if (content !== undefined && content.length > 0)
            return new ArrayStage(undefined, [content[0]]);
        var promise = input.getPromise();
        if (promise !== undefined)
            return new ArrayStage(promise.then(function (c) { return (c.length > 0) ? [c[0]] : []; }), undefined);
        return new ArrayStage(undefined, []);
    };
    ArrayPipeline.prototype.collect = function (input) {
        var content = input.getContent();
        if (content !== undefined && content.length > 0)
            return new ArrayStage(undefined, [content]);
        var promise = input.getPromise();
        if (promise !== undefined)
            return new ArrayStage(promise.then(function (c) { return [c]; }), undefined);
        return new ArrayStage(undefined, []);
    };
    return ArrayPipeline;
}(pipeline_engine_1.PipelineEngine));
exports.default = ArrayPipeline;
