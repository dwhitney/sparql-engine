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

'use strict'

import { PipelineInput, PipelineStage, PipelineEngine } from './pipeline-engine'
import { chunk, flatMap, flatten, slice, uniq, uniqBy } from 'lodash'

/**
 * A PipelineStage which materializes all intermediate results in main memory.
 * @author Thomas Minier
 */
export class ArrayStage<T> implements PipelineStage<T> {
  // We need to use Promise to store the stage content,
  // as some computations can require asynchronous computations.
  // For example, the RDF graph can send HTTP requests to evaluate triple patterns.
  private readonly _promise?: Promise<Array<T>>
  private _content?: Array<T>

  constructor(promise?: Promise<Array<T>>, content?: Array<T>) {
    this._promise = promise
    this._content = (promise === undefined) ? [] : undefined
    if(content !== undefined) this._content = content;
    if(this._promise){
      this._promise.then(content => this._content = content)
    }
  }

  getContent(): Array<T> | undefined {
    return this._content
  }

  getPromise(): Promise<Array<T>> | undefined {
    return this._promise
  }

  subscribe(onData: (value: T) => void, onError: (err: any) => void, onEnd: () => void): void {
    if(this._content !== undefined){
      try{
        this._content.forEach(onData)
      } catch (e) {
        onError(e)
      }
    } else {
      try {
        if(this._promise !== undefined){
          this._promise
            .then(c => {
              c.forEach(onData)
              onEnd()
            })
            .catch(onError)
        }
      } catch (e) {
        onError(e)
      }
    }
  }

  forEach(cb: (value: T) => void): void {
    if(this._content !== undefined){
        this._content.forEach(cb)
    } else {
      if(this._promise !== undefined){
        this._promise
          .then(c => {
            c.forEach(cb)
          })
      }
    }
  }
}

/**
 * A pipeline implemented using {@link ArrayStage}, *i.e.*, all intermediate results are materialized in main memory. This approach is often called **vectorized approach**.
 * This pipeline is more efficient CPU-wise than {@link RxjsPipeline}, but it also consumes much more memory, as it materializes evey stage of the pipeline before moving to the next.
 * It should only be used when SPARQL queries generate few intermediate results.
 * @see P. A. Boncz, S. Manegold, and M. L. Kersten. "Database architecture evolution: Mammals flourished long before dinosaurs became extinct". PVLDB, (2009)
 * @author Thomas Minier
 */
export default class ArrayPipeline extends PipelineEngine {

  empty<T>(): ArrayStage<T> {
    return new ArrayStage<T>(undefined, [])
  }

  of<T>(...values: T[]): ArrayStage<T> {
    return new ArrayStage<T>(undefined, values)
  }

  from<T>(x: PipelineInput<T>): ArrayStage<T> {
    if ((x as ArrayStage<T>).getContent !== undefined) {
      return new ArrayStage<T>((x as ArrayStage<T>).getPromise(), (x as ArrayStage<T>).getContent())
    } else if (Array.isArray(x)) {
      return new ArrayStage<T>(Promise.resolve(x))
    } else if ((x as Promise<T>).then !== undefined) {
      return new ArrayStage<T>((x as Promise<T>).then(v => [v]))
    } else if (Symbol.iterator in x) {
      return new ArrayStage<T>(Promise.resolve(Array.from(x as Iterable<T>)))
    }
    throw new Error('Invalid argument for ArrayPipeline.from: ' + x)
  }

  clone<T>(stage: ArrayStage<T>): ArrayStage<T> {
    const content = stage.getContent()
    if(content !== undefined){
      return new ArrayStage<T>(undefined, content.slice(0))
    } 
    const promise = stage.getPromise()
    if(promise !== undefined){
      return new ArrayStage<T>(promise.then(c => c.slice(0)), undefined)
    }
    return new ArrayStage<T>(undefined, [])
  }

  catch<T,O>(input: ArrayStage<T>, handler?: (err: Error) => ArrayStage<O>): ArrayStage<T | O> {
    try{
      const content = input.getContent()
      if(content !== undefined) return new ArrayStage<T | O>(undefined, content.slice(0))
      const promise = input.getPromise()
      if(promise !== undefined){
        return new ArrayStage<T | O>(promise.then(c => new Promise((resolve, reject) => {
          try {
            resolve(c.slice(0))
          } catch(e) {
            if(handler === undefined){
              return new ArrayStage(new Promise((resolve, reject) => reject(e)), undefined)
            }
              return handler(e)
          }
        })))
      }
      return new ArrayStage<T | O>(undefined, [])
    } catch (e) {
      if(handler === undefined){
        return new ArrayStage(new Promise((resolve, reject) => reject(e)), undefined)
      }
      return handler(e)
    }
  }

  merge<T>(...inputs: Array<ArrayStage<T>>): ArrayStage<T> {
    let allContent = true 
    inputs.forEach(stage => {
      if(stage.getContent() === undefined) allContent = false
    })

    if(allContent){
      return new ArrayStage<T>(undefined, flatten(inputs.map(stage => stage.getContent()) as T[][]))
    } else {
      const stages: Array<Promise<T[]>> = []
      inputs.forEach(stage => {
        const content = stage.getContent()
        const promise = stage.getPromise()
        if(content !== undefined) stages.push(Promise.resolve(content))
        else if(promise !== undefined) stages.push(promise)
        else stages.push(Promise.resolve([]))
      })

      return new ArrayStage<T>(Promise.all(stages).then((contents: T[][]) => {
        return flatten(contents)
      }))
    }


  }

  map<F,T>(input: ArrayStage<F>, mapper: (value: F) => T): ArrayStage<T> {
    const content = input.getContent()
    if(content !== undefined) return new ArrayStage<T>(undefined, content.map(mapper))

    const promise = input.getPromise()
    if(promise !== undefined) return new ArrayStage<T>(promise.then(c => c.map(mapper), undefined))
    
    return new ArrayStage<T>(undefined, [])
  }

  flatMap<F,T>(input: ArrayStage<F>, mapper: (value: F) => T[]): ArrayStage<T> {
    const content = input.getContent()
    if(content !== undefined) return new ArrayStage<T>(undefined, flatMap(content, mapper))

    const promise = input.getPromise()
    if(promise !== undefined) return new ArrayStage<T>(promise.then(c => flatMap(c, mapper)), undefined)

    return new ArrayStage<T>(undefined, [])
  }

  mergeMap<F,T>(input: ArrayStage<F>, mapper: (value: F) => ArrayStage<T>): ArrayStage<T> {
    const content = input.getContent()
    if(content !== undefined){
      return this.merge(...content.map(mapper))
    }

    const promise = input.getPromise()
    if(promise !== undefined){
      const newPromise = promise.then(content => {
        const stage = this.merge(...content.map(mapper))
        const c = stage.getContent()
        if(c !== undefined) return c
        const p = stage.getPromise()
        if(p !== undefined) return p
        return []
      })
      return new ArrayStage<T>(newPromise, undefined)
    }
    return new ArrayStage<T>(undefined, [])
  }

  filter<T>(input: ArrayStage<T>, predicate: (value: T) => boolean): ArrayStage<T> {
    const content = input.getContent()
    if(content !== undefined) return new ArrayStage<T>(undefined, content.filter(predicate))
    const promise = input.getPromise()
    if(promise !== undefined) return new ArrayStage<T>(promise.then(c => c.filter(predicate)), undefined)
    return new ArrayStage<T>(undefined, [])
  }

  reduce<F,T>(input: ArrayStage<F>, reducer: (acc: T, value: F) => T, initial: T): ArrayStage<T> {
    const content = input.getContent()
    if(content !== undefined) return new ArrayStage<T>(undefined, [content.reduce(reducer, initial)])
    const promise = input.getPromise()
    if(promise !== undefined) return new ArrayStage<T>(promise.then(c => [c.reduce(reducer, initial)]), undefined)
    return new ArrayStage<T>(undefined, [])
  }

  limit<T>(input: ArrayStage<T>, stopAfter: number): ArrayStage<T> {
    const content = input.getContent()
    if(content !== undefined) return new ArrayStage<T>(undefined, slice(content, 0, stopAfter))
    const promise = input.getPromise()
    if(promise !== undefined) return new ArrayStage<T>(promise.then(c => slice(c, 0, stopAfter), undefined))
    return new ArrayStage<T>(undefined, [])
  }

  skip<T>(input: ArrayStage<T>, toSkip: number): ArrayStage<T> {
    const content = input.getContent()
    if(content !== undefined) return new ArrayStage<T>(undefined, slice(content, toSkip))
    const promise = input.getPromise()
    if(promise !== undefined) return new ArrayStage<T>(promise.then(c => slice(c, toSkip)), undefined)
    return new ArrayStage<T>(undefined, [])
  }

  distinct<T, K>(input: ArrayStage<T>, selector?: (value: T) => K): ArrayStage<T> {
    const fn = (selector === undefined) ? uniq : selector
    const content = input.getContent()
    //@ts-ignore
    if(content !== undefined) return new ArrayStage<T>(undefined, fn(content))
    const promise = input.getPromise()
    //@ts-ignore
    if(promise !== undefined) return new ArrayStage<T>(promise.then(c => fn(content)), undefined)
    return new ArrayStage<T>(undefined, [])
  }

  defaultValues<T>(input: ArrayStage<T>, ...values: T[]): ArrayStage<T> {
    let content = input.getContent()
    if(content !== undefined){
      content = (content.length > 0) ? content : values 
      return new ArrayStage<T>(undefined, content)
    }
    const promise = input.getPromise()
    if(promise !== undefined){
      return new ArrayStage<T>(promise.then(c => (c.length > 0) ? c : values ), undefined)
    }
    return new ArrayStage<T>(undefined, values)
  }

  bufferCount<T>(input: ArrayStage<T>, count: number): ArrayStage<T[]> {
    const content = input.getContent()
    if(content !== undefined) return new ArrayStage<T[]>(undefined, chunk(content, count))
    const promise = input.getPromise()
    if(promise !== undefined) return new ArrayStage<T[]>(promise.then(c => chunk(c, count)), undefined)
    return new ArrayStage<T[]>(undefined, [])
  }

  forEach<T>(input: ArrayStage<T>, cb: (value: T) => void): void {
    input.forEach(cb)
  }

  first<T>(input: ArrayStage<T>): ArrayStage<T> {
    const content = input.getContent()
    if(content !== undefined && content.length > 0) return new ArrayStage<T>(undefined, [content[0]])
    const promise = input.getPromise()
    if(promise !== undefined) return new ArrayStage<T>(promise.then(c => (c.length > 0) ? [c[0]] : []), undefined)
    return new ArrayStage<T>(undefined, [])
  }

  collect<T>(input: ArrayStage<T>): ArrayStage<T[]> {
    const content = input.getContent()
    if(content !== undefined && content.length > 0) return new ArrayStage<T[]>(undefined, [content])
    const promise = input.getPromise()
    if(promise !== undefined) return new ArrayStage<T[]>(promise.then(c => [c]), undefined)
    return new ArrayStage<T[]>(undefined, [])
  }
}
