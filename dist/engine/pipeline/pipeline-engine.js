/* file : pipeline-engine.ts
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
/**
 * Abstract representation used to apply transformations on a pipeline of iterators.
 * Concrete subclasses are used by the framework to build the query execution pipeline.
 * @abstract
 * @author Thomas Minier
 */
var PipelineEngine = /** @class */ (function () {
    function PipelineEngine() {
    }
    /**
     * Maps each source value to an array of values which is merged in the output PipelineStage.
     * @param  input  - Input PipelineStage
     * @param  mapper - Transformation function
     * @return Output PipelineStage
     */
    PipelineEngine.prototype.flatMap = function (input, mapper) {
        var _this = this;
        return this.mergeMap(input, function (value) { return _this.of.apply(_this, __spread(mapper(value))); });
    };
    /**
     * Emits only the first value (or the first value that meets some condition) emitted by the source PipelineStage.
     * @param  input - Input PipelineStage
     * @return A PipelineStage of the first item that matches the condition.
     */
    PipelineEngine.prototype.first = function (input) {
        return this.limit(input, 1);
    };
    /**
     * Returns a PipelineStage that emits the items you specify as arguments after it finishes emitting items emitted by the source PipelineStage.
     * @param  input  - Input PipelineStage
     * @param  values - Values to append
     * @return A PipelineStage that emits the items emitted by the source PipelineStage and then emits the additional values.
     */
    PipelineEngine.prototype.endWith = function (input, values) {
        return this.merge(input, this.from(values));
    };
    /**
     * Perform a side effect for every emission on the source PipelineStage, but return a PipelineStage that is identical to the source.
     * @param  input - Input PipelineStage
     * @param  cb    - Callback invoked on each item
     * @return A PipelineStage identical to the source, but runs the specified PipelineStage or callback(s) for each item.
     */
    PipelineEngine.prototype.tap = function (input, cb) {
        return this.map(input, function (value) {
            cb(value);
            return value;
        });
    };
    return PipelineEngine;
}());
exports.PipelineEngine = PipelineEngine;
