export function getType<S, T>(object: IStateTreeNode): IType<S, T> {
    return getStateTreeNode(object).type
}

export function getChildType(object: IStateTreeNode, child: string): IType<any, any> {
    return getStateTreeNode(object).getChildType(child)
}

export function addMiddleware(
    target: IStateTreeNode,
    middleware: (action: IRawActionCall, next: (call: IRawActionCall) => any) => any
): IDisposer {
    const node = getStateTreeNode(target)
    if (!node.isProtectionEnabled)
        console.warn(
            "It is recommended to protect the state tree before attaching action middleware, as otherwise it cannot be guaranteed that all changes are passed through middleware. See `protect`"
        )
    return node.addMiddleWare(middleware)
}

/**
 * Registers a function that will be invoked for each that as made to the provided model instance, or any of it's children.
 * See 'patches' for more details. onPatch events are emitted immediately and will not await the end of a transaction.
 * Patches can be used to deep observe a model tree.
 *
 * @export
 * @param {Object} target the model instance from which to receive patches
 * @param {(patch: IJsonPatch) => void} callback the callback that is invoked for each patch
 * @returns {IDisposer} function to remove the listener
 */
export function onPatch(target: IStateTreeNode, callback: (patch: IJsonPatch) => void): IDisposer {
    return getStateTreeNode(target).onPatch(callback)
}

/**
 * Registeres a function that is invoked whenever a new snapshot for the given model instance is available.
 * The listener will only be fire at the and a MobX (trans)action
 *
 * @export
 * @param {Object} target
 * @param {(snapshot: any) => void} callback
 * @returns {IDisposer}
 */
export function onSnapshot<S>(
    target: ObservableMap<S>,
    callback: (snapshot: { [key: string]: S }) => void
): IDisposer
export function onSnapshot<S>(
    target: IObservableArray<S>,
    callback: (snapshot: S[]) => void
): IDisposer
export function onSnapshot<S>(target: ISnapshottable<S>, callback: (snapshot: S) => void): IDisposer
export function onSnapshot<S>(
    target: ISnapshottable<S>,
    callback: (snapshot: S) => void
): IDisposer {
    return getStateTreeNode(target).onSnapshot(callback)
}

/**
 * Applies a JSON-patch to the given model instance or bails out if the patch couldn't be applied
 *
 * @export
 * @param {Object} target
 * @param {IJsonPatch} patch
 * @returns
 */
export function applyPatch(target: IStateTreeNode, patch: IJsonPatch | IJsonPatch[]) {
    const node = getStateTreeNode(target)
    runInAction(() => {
        asArray(patch).forEach(p => node.applyPatch(p))
    })
}

export interface IPatchRecorder {
    patches: IJsonPatch[]
    stop(): any
    replay(target: IStateTreeNode): any
}

export function recordPatches(subject: IStateTreeNode): IPatchRecorder {
    let recorder = {
        patches: [] as IJsonPatch[],
        stop: () => disposer(),
        replay: (target: IStateTreeNode) => {
            applyPatch(target, recorder.patches)
        }
    }
    let disposer = onPatch(subject, patch => {
        recorder.patches.push(patch)
    })
    return recorder
}

/**
 * Applies a series of actions in a single MobX transaction.
 * Does not return any value
 *
 * @export
 * @param {Object} target
 * @param {IActionCall[]} actions
 * @param {IActionCallOptions} [options]
 */
export function applyAction(
    target: IStateTreeNode,
    actions: ISerializedActionCall | ISerializedActionCall[]
): void {
    runInAction(() => {
        asArray(actions).forEach(action => baseApplyAction(target, action))
    })
}

export interface IActionRecorder {
    actions: ISerializedActionCall[]
    stop(): any
    replay(target: IStateTreeNode): any
}

export function recordActions(subject: IStateTreeNode): IActionRecorder {
    let recorder = {
        actions: [] as ISerializedActionCall[],
        stop: () => disposer(),
        replay: (target: IStateTreeNode) => {
            applyAction(target, recorder.actions)
        }
    }
    let disposer = onAction(subject, recorder.actions.push.bind(recorder.actions))
    return recorder
}

/**
 * By default it is allowed to both directly modify a model or through an action.
 * However, in some cases you want to guarantee that the state tree is only modified through actions.
 * So that replaying action will reflect everything that can possible have happened to your objects, or that every mutation passes through your action middleware etc.
 * To disable modifying data in the tree without action, simple call `protect(model)`. Protect protects the passed model an all it's children
 *
 * @example
 * const Todo = types.model({
 *     done: false,
 *     toggle() {
 *         this.done = !this.done
 *     }
 * })
 *
 * const todo = new Todo()
 * todo.done = true // OK
 * protect(todo)
 * todo.done = false // throws!
 * todo.toggle() // OK
 */
export function protect(target: IStateTreeNode) {
    const node = getStateTreeNode(target)
    if (!node.isRoot) fail("`protect` can only be invoked on root nodes")
    node.isProtectionEnabled = true
}

export function unprotect(target: IStateTreeNode) {
    const node = getStateTreeNode(target)
    if (!node.isRoot) fail("`unprotect` can only be invoked on root nodes")
    node.isProtectionEnabled = false
}

/**
 * Returns true if the object is in protected mode, @see protect
 */
export function isProtected(target: IStateTreeNode): boolean {
    return getStateTreeNode(target).isProtected
}

/**
 * Applies a snapshot to a given model instances. Patch and snapshot listeners will be invoked as usual.
 *
 * @export
 * @param {Object} target
 * @param {Object} snapshot
 * @returns
 */
export function applySnapshot<S, T>(target: IStateTreeNode, snapshot: S) {
    return getStateTreeNode(target).applySnapshot(snapshot)
}

/**
 * Calculates a snapshot from the given model instance. The snapshot will always reflect the latest state but use
 * structural sharing where possible. Doesn't require MobX transactions to be completed.
 *
 * @export
 * @param {Object} target
 * @returns {*}
 */
export function getSnapshot<S>(target: ObservableMap<S>): { [key: string]: S }
export function getSnapshot<S>(target: IObservableArray<S>): S[]
export function getSnapshot<S>(target: ISnapshottable<S>): S
export function getSnapshot<S>(target: ISnapshottable<S>): S {
    return getStateTreeNode(target).snapshot
}

/**
 * Given a model instance, returns `true` if the object has a parent, that is, is part of another object, map or array
 *
 * @export
 * @param {Object} target
 * @param {number} depth = 1, how far should we look upward?
 * @returns {boolean}
 */
export function hasParent(target: IStateTreeNode, depth: number = 1): boolean {
    if (depth < 0) fail(`Invalid depth: ${depth}, should be >= 1`)
    let parent: Node | null = getStateTreeNode(target).parent
    while (parent) {
        if (--depth === 0) return true
        parent = parent.parent
    }
    return false
}

/**
 * Returns the immediate parent of this object, or null.
 *
 * Note that the immediate parent can be either an object, map or array, and
 * doesn't necessarily refer to the parent model
 *
 * @export
 * @param {Object} target
 * @param {number} depth = 1, how far should we look upward?
 * @returns {*}
 */
export function getParent(target: IStateTreeNode, depth?: number): (any & IStateTreeNode)
export function getParent<T>(target: IStateTreeNode, depth?: number): (T & IStateTreeNode)
export function getParent<T>(target: IStateTreeNode, depth = 1): (T & IStateTreeNode) {
    if (depth < 0) fail(`Invalid depth: ${depth}, should be >= 1`)
    let d = depth
    let parent: Node | null = getStateTreeNode(target).parent
    while (parent) {
        if (--d === 0) return parent.storedValue
        parent = parent.parent
    }
    return fail(`Failed to find the parent of ${getStateTreeNode(target)} at depth ${depth}`)
}

/**
 * Given an object in a model tree, returns the root object of that tree
 *
 * @export
 * @param {Object} target
 * @returns {*}
 */
export function getRoot(target: IStateTreeNode): any & IStateTreeNode
export function getRoot<T>(target: IStateTreeNode): T & IStateTreeNode
export function getRoot(target: IStateTreeNode): IStateTreeNode {
    return getStateTreeNode(target).root.storedValue
}

/**
 * Returns the path of the given object in the model tree
 *
 * @export
 * @param {Object} target
 * @returns {string}
 */
export function getPath(target: IStateTreeNode): string {
    return getStateTreeNode(target).path
}

/**
 * Returns the path of the given object as unescaped string array
 *
 * @export
 * @param {Object} target
 * @returns {string[]}
 */
export function getPathParts(target: IStateTreeNode): string[] {
    return splitJsonPath(getStateTreeNode(target).path)
}

/**
 * Returns true if the given object is the root of a model tree
 *
 * @export
 * @param {Object} target
 * @returns {boolean}
 */
export function isRoot(target: IStateTreeNode): boolean {
    return getStateTreeNode(target).isRoot
}

/**
 * Resolves a path relatively to a given object.
 *
 * @export
 * @param {Object} target
 * @param {string} path - escaped json path
 * @returns {*}
 */
export function resolvePath(target: IStateTreeNode, path: string): IStateTreeNode | any {
    const node = getStateTreeNode(target).resolve(path)
    return node ? node.value : undefined
}

export function resolveIdentifier(
    type: IType<any, any>,
    target: IStateTreeNode,
    identifier: string | number
): any {
    if (!isType(type)) fail("Expected a type as first argument")
    const node = getStateTreeNode(target).root.identifierCache!.resolve(type, "" + identifier)
    return node ? node.value : undefined
}

/**
 *
 *
 * @export
 * @param {Object} target
 * @param {string} path
 * @returns {*}
 */
export function tryResolve(target: IStateTreeNode, path: string): IStateTreeNode | any {
    const node = getStateTreeNode(target).resolve(path, false)
    if (node === undefined) return undefined
    return node ? node.value : undefined
}

export function getRelativePath(base: IStateTreeNode, target: IStateTreeNode): string {
    return getStateTreeNode(base).getRelativePathTo(getStateTreeNode(target))
}

/**
 *
 *
 * @export
 * @template T
 * @param {T} source
 * @returns {T}
 */
export function clone<T extends IStateTreeNode>(
    source: T,
    keepEnvironment: boolean | any = true
): T {
    const node = getStateTreeNode(source)
    return node.type.create(
        node.snapshot,
        keepEnvironment === true
            ? node.root._environment
            : keepEnvironment === false ? undefined : keepEnvironment // it's an object or something else
    ) as T
}

/**
 * Removes a model element from the state tree, and let it live on as a new state tree
 */
export function detach<T extends IStateTreeNode>(thing: T): T {
    getStateTreeNode(thing).detach()
    return thing
}

/**
 * Removes a model element from the state tree, and mark it as end-of-life; the element should not be used anymore
 */
export function destroy(thing: IStateTreeNode) {
    const node = getStateTreeNode(thing)
    if (node.isRoot) node.die()
    else node.parent!.removeChild(node.subpath)
}

export function isAlive(thing: IStateTreeNode): boolean {
    return getStateTreeNode(thing).isAlive
}

export function addDisposer(thing: IStateTreeNode, disposer: () => void) {
    getStateTreeNode(thing).addDisposer(disposer)
}

export function getEnv(thing: IStateTreeNode): any {
    const node = getStateTreeNode(thing)
    const env = node.root._environment
    if (!!!env)
        fail(
            `Node '${node}' is not part of state tree that was initialized with an environment. Environment can be passed as second argumentt to .create()`
        )
    return env
}

/**
 * Performs a depth first walk through a tree
 */
export function walk(thing: IStateTreeNode, processor: (item: IStateTreeNode) => void) {
    const node = getStateTreeNode(thing)
    // tslint:disable-next-line:no_unused-variable
    node.getChildren().forEach(child => {
        if (isStateTreeNode(child.storedValue)) walk(child.storedValue, processor)
    })
    processor(node.storedValue)
}

import {
    IRawActionCall,
    ISerializedActionCall,
    applyAction as baseApplyAction,
    onAction
} from "./action"
import { runInAction, IObservableArray, ObservableMap } from "mobx"
import { Node, getStateTreeNode, IStateTreeNode, isStateTreeNode } from "./node"
import { IJsonPatch, splitJsonPath } from "./json-patch"
import { IDisposer, fail, asArray } from "../utils"
import { ISnapshottable, IType } from "../types/type"
import { isType } from "../types/type-flags"
