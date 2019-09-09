import { PipelineInput, PipelineStage, PipelineEngine } from './pipeline-engine';
/**
 * A PipelineStage which materializes all intermediate results in main memory.
 * @author Thomas Minier
 */
export declare class ArrayStage<T> implements PipelineStage<T> {
    private readonly _promise?;
    private _content?;
    constructor(promise?: Promise<Array<T>>, content?: Array<T>);
    getContent(): Array<T> | undefined;
    getPromise(): Promise<Array<T>> | undefined;
    subscribe(onData: (value: T) => void, onError: (err: any) => void, onEnd: () => void): void;
    forEach(cb: (value: T) => void): void;
}
/**
 * A pipeline implemented using {@link ArrayStage}, *i.e.*, all intermediate results are materialized in main memory. This approach is often called **vectorized approach**.
 * This pipeline is more efficient CPU-wise than {@link RxjsPipeline}, but it also consumes much more memory, as it materializes evey stage of the pipeline before moving to the next.
 * It should only be used when SPARQL queries generate few intermediate results.
 * @see P. A. Boncz, S. Manegold, and M. L. Kersten. "Database architecture evolution: Mammals flourished long before dinosaurs became extinct". PVLDB, (2009)
 * @author Thomas Minier
 */
export default class ArrayPipeline extends PipelineEngine {
    empty<T>(): ArrayStage<T>;
    of<T>(...values: T[]): ArrayStage<T>;
    from<T>(x: PipelineInput<T>): ArrayStage<T>;
    clone<T>(stage: ArrayStage<T>): ArrayStage<T>;
    catch<T, O>(input: ArrayStage<T>, handler?: (err: Error) => ArrayStage<O>): ArrayStage<T | O>;
    merge<T>(...inputs: Array<ArrayStage<T>>): ArrayStage<T>;
    map<F, T>(input: ArrayStage<F>, mapper: (value: F) => T): ArrayStage<T>;
    flatMap<F, T>(input: ArrayStage<F>, mapper: (value: F) => T[]): ArrayStage<T>;
    mergeMap<F, T>(input: ArrayStage<F>, mapper: (value: F) => ArrayStage<T>): ArrayStage<T>;
    filter<T>(input: ArrayStage<T>, predicate: (value: T) => boolean): ArrayStage<T>;
    reduce<F, T>(input: ArrayStage<F>, reducer: (acc: T, value: F) => T, initial: T): ArrayStage<T>;
    limit<T>(input: ArrayStage<T>, stopAfter: number): ArrayStage<T>;
    skip<T>(input: ArrayStage<T>, toSkip: number): ArrayStage<T>;
    distinct<T, K>(input: ArrayStage<T>, selector?: (value: T) => K): ArrayStage<T>;
    defaultValues<T>(input: ArrayStage<T>, ...values: T[]): ArrayStage<T>;
    bufferCount<T>(input: ArrayStage<T>, count: number): ArrayStage<T[]>;
    forEach<T>(input: ArrayStage<T>, cb: (value: T) => void): void;
    first<T>(input: ArrayStage<T>): ArrayStage<T>;
    collect<T>(input: ArrayStage<T>): ArrayStage<T[]>;
}
