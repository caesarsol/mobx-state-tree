import { action, computed, extendObservable, extendShallowObservable, extras, intercept, isObservable, observable, observe, reaction, runInAction } from 'mobx';

/*! *****************************************************************************
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */
/* global Reflect, Promise */

var extendStatics = Object.setPrototypeOf ||
    ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
    function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };

function __extends(d, b) {
    extendStatics(d, b);
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}

var __assign = Object.assign || function __assign(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
    }
    return t;
};



function __decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}

// https://tools.ietf.org/html/rfc6902
// http://jsonpatch.com/
/**
 * escape slashes and backslashes
 * http://tools.ietf.org/html/rfc6901
 */
function escapeJsonPath(str) {
    return str.replace(/~/g, "~1").replace(/\//g, "~0");
}
/**
 * unescape slashes and backslashes
 */
function unescapeJsonPath(str) {
    return str.replace(/~0/g, "\\").replace(/~1/g, "~");
}
function joinJsonPath(path) {
    // `/` refers to property with an empty name, while `` refers to root itself!
    if (path.length === 0)
        return "";
    return "/" + path.map(escapeJsonPath).join("/");
}
function splitJsonPath(path) {
    // `/` refers to property with an empty name, while `` refers to root itself!
    var parts = path.split("/").map(unescapeJsonPath);
    // path '/a/b/c' -> a b c
    // path '../../b/c -> .. .. b c
    return parts[0] === "" ? parts.slice(1) : parts;
}

var EMPTY_ARRAY = Object.freeze([]);
function fail(message) {
    if (message === void 0) { message = "Illegal state"; }
    throw new Error("[mobx-state-tree] " + message);
}
function identity(_) {
    return _;
}

function noop() { }
function asArray(val) {
    if (!val)
        return EMPTY_ARRAY;
    if (Array.isArray(val))
        return val;
    return [val];
}
function extend(a) {
    var b = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        b[_i - 1] = arguments[_i];
    }
    for (var i = 0; i < b.length; i++) {
        var current = b[i];
        for (var key in current)
            a[key] = current[key];
    }
    return a;
}
function extendKeepGetter(a) {
    var b = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        b[_i - 1] = arguments[_i];
    }
    for (var i = 0; i < b.length; i++) {
        var current = b[i];
        for (var key in current) {
            var descriptor = Object.getOwnPropertyDescriptor(current, key);
            if ("get" in descriptor) {
                Object.defineProperty(a, key, __assign({}, descriptor, { configurable: true }));
                continue;
            }
            a[key] = current[key];
        }
    }
    return a;
}
function isPlainObject(value) {
    if (value === null || typeof value !== "object")
        return false;
    var proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
}
function isMutable(value) {
    return (value !== null &&
        typeof value === "object" &&
        !(value instanceof Date) &&
        !(value instanceof RegExp));
}
function isPrimitive(value) {
    if (value === null || value === undefined)
        return true;
    if (typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean" ||
        value instanceof Date)
        return true;
    return false;
}
function freeze(value) {
    return isPrimitive(value) ? value : Object.freeze(value);
}
function deepFreeze(value) {
    freeze(value);
    if (isPlainObject(value)) {
        Object.keys(value).forEach(function (propKey) {
            if (!Object.isFrozen(value[propKey])) {
                deepFreeze(value[propKey]);
            }
        });
    }
    return value;
}
function isSerializable(value) {
    return typeof value !== "function";
}
function addHiddenFinalProp(object, propName, value) {
    Object.defineProperty(object, propName, {
        enumerable: false,
        writable: false,
        configurable: true,
        value: value
    });
}

function addReadOnlyProp(object, propName, value) {
    Object.defineProperty(object, propName, {
        enumerable: true,
        writable: false,
        configurable: true,
        value: value
    });
}
function registerEventHandler(handlers, handler) {
    handlers.push(handler);
    return function () {
        var idx = handlers.indexOf(handler);
        if (idx !== -1)
            handlers.splice(idx, 1);
    };
}
var prototypeHasOwnProperty = Object.prototype.hasOwnProperty;
function hasOwnProperty(object, propName) {
    return prototypeHasOwnProperty.call(object, propName);
}
function argsToArray(args) {
    var res = new Array(args.length);
    for (var i = 0; i < args.length; i++)
        res[i] = args[i];
    return res;
}

function runRawAction(actioncall) {
    return actioncall.object[actioncall.name].apply(actioncall.object, actioncall.args);
}
function collectMiddlewareHandlers(node) {
    var handlers = node.middlewares.slice();
    var n = node;
    // Find all middlewares. Optimization: cache this?
    while (n.parent) {
        n = n.parent;
        handlers = handlers.concat(n.middlewares);
    }
    return handlers;
}
function runMiddleWares(node, baseCall) {
    var handlers = collectMiddlewareHandlers(node);
    // Short circuit
    if (!handlers.length)
        return runRawAction(baseCall);
    function runNextMiddleware(call) {
        var handler = handlers.shift(); // Optimization: counter instead of shift is probably faster
        if (handler)
            return handler(call, runNextMiddleware);
        else
            return runRawAction(call);
    }
    return runNextMiddleware(baseCall);
}
function createActionInvoker(name, fn) {
    var action$$1 = action(name, fn);
    return function () {
        var adm = getStateTreeNode(this);
        adm.assertAlive();
        if (adm.isRunningAction()) {
            // an action is already running in this tree, invoking this action does not emit a new action
            return action$$1.apply(this, arguments);
        }
        else {
            // outer action, run middlewares and start the action!
            var call = {
                name: name,
                object: adm.storedValue,
                args: argsToArray(arguments)
            };
            var root = adm.root;
            root._isRunningAction = true;
            try {
                return runMiddleWares(adm, call);
            }
            finally {
                root._isRunningAction = false;
            }
        }
    };
}
function serializeArgument(node, actionName, index, arg) {
    if (isPrimitive(arg))
        return arg;
    if (isStateTreeNode(arg)) {
        var targetNode = getStateTreeNode(arg);
        if (node.root !== targetNode.root)
            throw new Error("Argument " + index + " that was passed to action '" + actionName + "' is a model that is not part of the same state tree. Consider passing a snapshot or some representative ID instead");
        return {
            $ref: node.getRelativePathTo(getStateTreeNode(arg))
        };
    }
    if (typeof arg === "function")
        throw new Error("Argument " + index + " that was passed to action '" + actionName + "' should be a primitive, model object or plain object, received a function");
    if (typeof arg === "object" && !isPlainObject(arg) && !Array.isArray(arg))
        throw new Error("Argument " + index + " that was passed to action '" + actionName + "' should be a primitive, model object or plain object, received a " + (arg &&
            arg.constructor
            ? arg.constructor.name
            : "Complex Object"));
    if (isObservable(arg))
        throw new Error("Argument " + index + " that was passed to action '" + actionName + "' should be a primitive, model object or plain object, received an mobx observable.");
    try {
        // Check if serializable, cycle free etc...
        // MWE: there must be a better way....
        JSON.stringify(arg); // or throws
        return arg;
    }
    catch (e) {
        throw new Error("Argument " + index + " that was passed to action '" + actionName + "' is not serializable.");
    }
}
function deserializeArgument(adm, value) {
    if (typeof value === "object") {
        var keys = Object.keys(value);
        if (keys.length === 1 && keys[0] === "$ref")
            return resolvePath(adm.storedValue, value.$ref);
    }
    return value;
}
/**
 * Dispatches an Action on a model instance. All middlewares will be triggered.
 * Returns the value of the last actoin
 *
 * @export
 * @param {Object} target
 * @param {IActionCall} action
 * @param {IActionCallOptions} [options]
 * @returns
 */
function applyAction$1(target, action$$1) {
    var resolvedTarget = tryResolve(target, action$$1.path || "");
    if (!resolvedTarget)
        return fail("Invalid action path: " + (action$$1.path || ""));
    var node = getStateTreeNode(resolvedTarget);
    if (!(typeof resolvedTarget[action$$1.name] === "function"))
        fail("Action '" + action$$1.name + "' does not exist in '" + node.path + "'");
    return resolvedTarget[action$$1.name].apply(resolvedTarget, action$$1.args ? action$$1.args.map(function (v) { return deserializeArgument(node, v); }) : []);
}
function onAction(target, listener) {
    return addMiddleware(target, function (rawCall, next) {
        var sourceNode = getStateTreeNode(rawCall.object);
        listener({
            name: rawCall.name,
            path: getStateTreeNode(target).getRelativePathTo(sourceNode),
            args: rawCall.args.map(function (arg, index) {
                return serializeArgument(sourceNode, rawCall.name, index, arg);
            })
        });
        return next(rawCall);
    });
}

var TypeFlags;
(function (TypeFlags) {
    TypeFlags[TypeFlags["String"] = 1] = "String";
    TypeFlags[TypeFlags["Number"] = 2] = "Number";
    TypeFlags[TypeFlags["Boolean"] = 4] = "Boolean";
    TypeFlags[TypeFlags["Date"] = 8] = "Date";
    TypeFlags[TypeFlags["Literal"] = 16] = "Literal";
    TypeFlags[TypeFlags["Array"] = 32] = "Array";
    TypeFlags[TypeFlags["Map"] = 64] = "Map";
    TypeFlags[TypeFlags["Object"] = 128] = "Object";
    TypeFlags[TypeFlags["Frozen"] = 256] = "Frozen";
    TypeFlags[TypeFlags["Optional"] = 512] = "Optional";
    TypeFlags[TypeFlags["Reference"] = 1024] = "Reference";
    TypeFlags[TypeFlags["Identifier"] = 2048] = "Identifier";
    TypeFlags[TypeFlags["Late"] = 4096] = "Late";
    TypeFlags[TypeFlags["Refinement"] = 8192] = "Refinement";
    TypeFlags[TypeFlags["Union"] = 16384] = "Union";
})(TypeFlags || (TypeFlags = {}));
function isType(value) {
    return typeof value === "object" && value && value.isType === true;
}
function isPrimitiveType(type) {
    return isType(type) && (type.flags & (TypeFlags.String | TypeFlags.Number | TypeFlags.Boolean | TypeFlags.Date)) > 0;
}


function isObjectType(type) {
    return isType(type) && (type.flags & TypeFlags.Object) > 0;
}





function isReferenceType(type) {
    return (type.flags & TypeFlags.Reference) > 0;
}

function getType(object) {
    return getStateTreeNode(object).type;
}
function getChildType(object, child) {
    return getStateTreeNode(object).getChildType(child);
}
function addMiddleware(target, middleware) {
    var node = getStateTreeNode(target);
    if (!node.isProtectionEnabled)
        console.warn("It is recommended to protect the state tree before attaching action middleware, as otherwise it cannot be guaranteed that all changes are passed through middleware. See `protect`");
    return node.addMiddleWare(middleware);
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
function onPatch(target, callback) {
    return getStateTreeNode(target).onPatch(callback);
}
function onSnapshot(target, callback) {
    return getStateTreeNode(target).onSnapshot(callback);
}
/**
 * Applies a JSON-patch to the given model instance or bails out if the patch couldn't be applied
 *
 * @export
 * @param {Object} target
 * @param {IJsonPatch} patch
 * @returns
 */
function applyPatch(target, patch) {
    var node = getStateTreeNode(target);
    runInAction(function () {
        asArray(patch).forEach(function (p) { return node.applyPatch(p); });
    });
}
function recordPatches(subject) {
    var recorder = {
        patches: [],
        stop: function () { return disposer(); },
        replay: function (target) {
            applyPatch(target, recorder.patches);
        }
    };
    var disposer = onPatch(subject, function (patch) {
        recorder.patches.push(patch);
    });
    return recorder;
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
function applyAction(target, actions) {
    runInAction(function () {
        asArray(actions).forEach(function (action$$1) { return applyAction$1(target, action$$1); });
    });
}
function recordActions(subject) {
    var recorder = {
        actions: [],
        stop: function () { return disposer(); },
        replay: function (target) {
            applyAction(target, recorder.actions);
        }
    };
    var disposer = onAction(subject, recorder.actions.push.bind(recorder.actions));
    return recorder;
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
function protect(target) {
    var node = getStateTreeNode(target);
    if (!node.isRoot)
        fail("`protect` can only be invoked on root nodes");
    node.isProtectionEnabled = true;
}
function unprotect(target) {
    var node = getStateTreeNode(target);
    if (!node.isRoot)
        fail("`unprotect` can only be invoked on root nodes");
    node.isProtectionEnabled = false;
}
/**
 * Returns true if the object is in protected mode, @see protect
 */
function isProtected(target) {
    return getStateTreeNode(target).isProtected;
}
/**
 * Applies a snapshot to a given model instances. Patch and snapshot listeners will be invoked as usual.
 *
 * @export
 * @param {Object} target
 * @param {Object} snapshot
 * @returns
 */
function applySnapshot(target, snapshot) {
    return getStateTreeNode(target).applySnapshot(snapshot);
}
function getSnapshot(target) {
    return getStateTreeNode(target).snapshot;
}
/**
 * Given a model instance, returns `true` if the object has a parent, that is, is part of another object, map or array
 *
 * @export
 * @param {Object} target
 * @param {number} depth = 1, how far should we look upward?
 * @returns {boolean}
 */
function hasParent(target, depth) {
    if (depth === void 0) { depth = 1; }
    if (depth < 0)
        fail("Invalid depth: " + depth + ", should be >= 1");
    var parent = getStateTreeNode(target).parent;
    while (parent) {
        if (--depth === 0)
            return true;
        parent = parent.parent;
    }
    return false;
}
function getParent(target, depth) {
    if (depth === void 0) { depth = 1; }
    if (depth < 0)
        fail("Invalid depth: " + depth + ", should be >= 1");
    var d = depth;
    var parent = getStateTreeNode(target).parent;
    while (parent) {
        if (--d === 0)
            return parent.storedValue;
        parent = parent.parent;
    }
    return fail("Failed to find the parent of " + getStateTreeNode(target) + " at depth " + depth);
}
function getRoot(target) {
    return getStateTreeNode(target).root.storedValue;
}
/**
 * Returns the path of the given object in the model tree
 *
 * @export
 * @param {Object} target
 * @returns {string}
 */
function getPath(target) {
    return getStateTreeNode(target).path;
}
/**
 * Returns the path of the given object as unescaped string array
 *
 * @export
 * @param {Object} target
 * @returns {string[]}
 */
function getPathParts(target) {
    return splitJsonPath(getStateTreeNode(target).path);
}
/**
 * Returns true if the given object is the root of a model tree
 *
 * @export
 * @param {Object} target
 * @returns {boolean}
 */
function isRoot(target) {
    return getStateTreeNode(target).isRoot;
}
/**
 * Resolves a path relatively to a given object.
 *
 * @export
 * @param {Object} target
 * @param {string} path - escaped json path
 * @returns {*}
 */
function resolvePath(target, path) {
    var node = getStateTreeNode(target).resolve(path);
    return node ? node.value : undefined;
}
function resolveIdentifier(type, target, identifier) {
    if (!isType(type))
        fail("Expected a type as first argument");
    var node = getStateTreeNode(target).root.identifierCache.resolve(type, "" + identifier);
    return node ? node.value : undefined;
}
/**
 *
 *
 * @export
 * @param {Object} target
 * @param {string} path
 * @returns {*}
 */
function tryResolve(target, path) {
    var node = getStateTreeNode(target).resolve(path, false);
    if (node === undefined)
        return undefined;
    return node ? node.value : undefined;
}
function getRelativePath(base, target) {
    return getStateTreeNode(base).getRelativePathTo(getStateTreeNode(target));
}
/**
 *
 *
 * @export
 * @template T
 * @param {T} source
 * @returns {T}
 */
function clone(source, keepEnvironment) {
    if (keepEnvironment === void 0) { keepEnvironment = true; }
    var node = getStateTreeNode(source);
    return node.type.create(node.snapshot, keepEnvironment === true
        ? node.root._environment
        : keepEnvironment === false ? undefined : keepEnvironment // it's an object or something else
    );
}
/**
 * Removes a model element from the state tree, and let it live on as a new state tree
 */
function detach(thing) {
    getStateTreeNode(thing).detach();
    return thing;
}
/**
 * Removes a model element from the state tree, and mark it as end-of-life; the element should not be used anymore
 */
function destroy(thing) {
    var node = getStateTreeNode(thing);
    if (node.isRoot)
        node.die();
    else
        node.parent.removeChild(node.subpath);
}
function isAlive(thing) {
    return getStateTreeNode(thing).isAlive;
}
function addDisposer(thing, disposer) {
    getStateTreeNode(thing).addDisposer(disposer);
}
function getEnv(thing) {
    var node = getStateTreeNode(thing);
    var env = node.root._environment;
    if (!!!env)
        fail("Node '" + node + "' is not part of state tree that was initialized with an environment. Environment can be passed as second argumentt to .create()");
    return env;
}
/**
 * Performs a depth first walk through a tree
 */
function walk(thing, processor) {
    var node = getStateTreeNode(thing);
    // tslint:disable-next-line:no_unused-variable
    node.getChildren().forEach(function (child) {
        if (isStateTreeNode(child.storedValue))
            walk(child.storedValue, processor);
    });
    processor(node.storedValue);
}

var IdentifierCache = (function () {
    function IdentifierCache() {
        this.cache = observable.map();
    }
    IdentifierCache.prototype.addNodeToCache = function (node) {
        if (node.identifierAttribute) {
            var identifier = node.identifier;
            if (!this.cache.has(identifier)) {
                this.cache.set(identifier, observable.shallowArray());
            }
            var set = this.cache.get(identifier);
            if (set.indexOf(node) !== -1)
                fail("Already registered");
            set.push(node);
        }
        return this;
    };
    IdentifierCache.prototype.mergeCache = function (node) {
        var _this = this;
        node.identifierCache.cache.values().forEach(function (nodes) {
            return nodes.forEach(function (child) {
                _this.addNodeToCache(child);
            });
        });
    };
    IdentifierCache.prototype.notifyDied = function (node) {
        if (node.identifierAttribute) {
            var set = this.cache.get(node.identifier);
            if (set)
                set.remove(node);
        }
    };
    IdentifierCache.prototype.splitCache = function (node) {
        var res = new IdentifierCache();
        var basePath = node.path;
        this.cache.values().forEach(function (nodes) {
            for (var i = nodes.length - 1; i >= 0; i--) {
                if (nodes[i].path.indexOf(basePath) === 0) {
                    res.addNodeToCache(nodes[i]);
                    nodes.splice(i, 1);
                }
            }
        });
        return res;
    };
    IdentifierCache.prototype.resolve = function (type, identifier) {
        var set = this.cache.get(identifier);
        if (!set)
            return null;
        var matches = set.filter(function (candidate) { return type.isAssignableFrom(candidate.type); });
        switch (matches.length) {
            case 0:
                return null;
            case 1:
                return matches[0];
            default:
                return fail("Cannot resolve a reference to type '" + type.name + "' with id: '" + identifier + "' unambigously, there are multiple candidates: " + matches
                    .map(function (n) { return n.path; })
                    .join(", "));
        }
    };
    return IdentifierCache;
}());

var nextNodeId = 1;
var Node = (function () {
    function Node(type, parent, subpath, environment, storedValue) {
        var _this = this;
        // optimization: these fields make MST memory expensive for primitives. Most can be initialized lazily, or with EMPTY_ARRAY on prototype
        this.nodeId = ++nextNodeId;
        this._parent = null;
        this.subpath = "";
        this.isProtectionEnabled = true;
        this.identifierAttribute = undefined; // not to be modified directly, only through model initialization
        this._environment = undefined;
        this._isRunningAction = false; // only relevant for root
        this._autoUnbox = true; // unboxing is disabled when reading child nodes
        this._isAlive = true; // optimization: use binary flags for all these switches
        this._isDetaching = false;
        this.middlewares = [];
        this.snapshotSubscribers = [];
        this.patchSubscribers = [];
        this.disposers = [];
        this.type = type;
        this._parent = parent;
        this.subpath = subpath;
        this.storedValue = storedValue;
        this._environment = environment;
        this.unbox = this.unbox.bind(this);
        // optimization: don't keep the snapshot by default alive with a reaction by default
        // in prod mode. This saves lot of GC overhead (important for e.g. React Native)
        // if the feature is not actively used
        // downside; no structural sharing if getSnapshot is called incidently
        var snapshotDisposer = reaction(function () { return _this.snapshot; }, function (snapshot) {
            _this.emitSnapshot(snapshot);
        });
        snapshotDisposer.onError(function (e) {
            throw e;
        });
        this.addDisposer(snapshotDisposer);
    }
    Object.defineProperty(Node.prototype, "identifier", {
        get: function () {
            return this.identifierAttribute ? this.storedValue[this.identifierAttribute] : null;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Node.prototype, "path", {
        /**
         * Returnes (escaped) path representation as string
         */
        get: function () {
            if (!this.parent)
                return "";
            return this.parent.path + "/" + escapeJsonPath(this.subpath);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Node.prototype, "isRoot", {
        get: function () {
            return this.parent === null;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Node.prototype, "parent", {
        get: function () {
            return this._parent;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Node.prototype, "root", {
        get: function () {
            // future optimization: store root ref in the node and maintain it
            var p, r = this;
            while ((p = r.parent))
                r = p;
            return r;
        },
        enumerable: true,
        configurable: true
    });
    Node.prototype.getRelativePathTo = function (target) {
        // PRE condition target is (a child of) base!
        if (this.root !== target.root)
            fail("Cannot calculate relative path: objects '" + this + "' and '" + target + "' are not part of the same object tree");
        var baseParts = splitJsonPath(this.path);
        var targetParts = splitJsonPath(target.path);
        var common = 0;
        for (; common < baseParts.length; common++) {
            if (baseParts[common] !== targetParts[common])
                break;
        }
        // TODO: assert that no targetParts paths are "..", "." or ""!
        return (baseParts.slice(common).map(function (_) { return ".."; }).join("/") +
            joinJsonPath(targetParts.slice(common)));
    };
    Node.prototype.resolve = function (path, failIfResolveFails) {
        if (failIfResolveFails === void 0) { failIfResolveFails = true; }
        return this.resolvePath(splitJsonPath(path), failIfResolveFails);
    };
    Node.prototype.resolvePath = function (pathParts, failIfResolveFails) {
        if (failIfResolveFails === void 0) { failIfResolveFails = true; }
        // counter part of getRelativePath
        // note that `../` is not part of the JSON pointer spec, which is actually a prefix format
        // in json pointer: "" = current, "/a", attribute a, "/" is attribute "" etc...
        // so we treat leading ../ apart...
        var current = this;
        for (var i = 0; i < pathParts.length; i++) {
            if (pathParts[i] === "" // '/bla' or 'a//b' splits to empty strings
            )
                current = current.root;
            else if (pathParts[i] === "..")
                current = current.parent;
            else if (pathParts[i] === "." || pathParts[i] === "")
                continue;
            else if (current) {
                current = current.getChildNode(pathParts[i]);
                continue;
            }
            if (!current) {
                if (failIfResolveFails)
                    return fail("Could not resolve '" + pathParts[i] + "' in '" + joinJsonPath(pathParts.slice(0, i - 1)) + "', path of the patch does not resolve");
                else
                    return undefined;
            }
        }
        return current;
    };
    Object.defineProperty(Node.prototype, "value", {
        get: function () {
            if (!this._isAlive)
                return undefined;
            return this.type.getValue(this);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Node.prototype, "isAlive", {
        get: function () {
            return this._isAlive;
        },
        enumerable: true,
        configurable: true
    });
    Node.prototype.die = function () {
        if (this._isDetaching)
            return;
        if (isStateTreeNode(this.storedValue)) {
            walk(this.storedValue, function (child) { return getStateTreeNode(child).aboutToDie(); });
            walk(this.storedValue, function (child) { return getStateTreeNode(child).finalizeDeath(); });
        }
    };
    Node.prototype.aboutToDie = function () {
        this.disposers.splice(0).forEach(function (f) { return f(); });
        this.fireHook("beforeDestroy");
    };
    Node.prototype.finalizeDeath = function () {
        // invariant: not called directly but from "die"
        this.root.identifierCache.notifyDied(this);
        var self = this;
        var oldPath = this.path;
        addReadOnlyProp(this, "snapshot", this.snapshot); // kill the computed prop and just store the last snapshot
        this.patchSubscribers.splice(0);
        this.snapshotSubscribers.splice(0);
        this.patchSubscribers.splice(0);
        this._isAlive = false;
        this._parent = null;
        this.subpath = "";
        // This is quite a hack, once interceptable objects / arrays / maps are extracted from mobx,
        // we could express this in a much nicer way
        Object.defineProperty(this.storedValue, "$mobx", {
            get: function () {
                fail("This object has died and is no longer part of a state tree. It cannot be used anymore. The object (of type '" + self
                    .type
                    .name + "') used to live at '" + oldPath + "'. It is possible to access the last snapshot of this object using 'getSnapshot', or to create a fresh copy using 'clone'. If you want to remove an object from the tree without killing it, use 'detach' instead.");
            }
        });
    };
    Node.prototype.assertAlive = function () {
        if (!this._isAlive)
            fail(this + " cannot be used anymore as it has died; it has been removed from a state tree. If you want to remove an element from a tree and let it live on, use 'detach' or 'clone' the value");
    };
    Object.defineProperty(Node.prototype, "snapshot", {
        get: function () {
            if (!this._isAlive)
                return undefined;
            // advantage of using computed for a snapshot is that nicely respects transactions etc.
            // Optimization: only freeze on dev builds
            return freeze(this.type.getSnapshot(this));
        },
        enumerable: true,
        configurable: true
    });
    Node.prototype.onSnapshot = function (onChange) {
        return registerEventHandler(this.snapshotSubscribers, onChange);
    };
    Node.prototype.applySnapshot = function (snapshot) {
        return this.type.applySnapshot(this, snapshot);
    };
    Node.prototype.emitSnapshot = function (snapshot) {
        this.snapshotSubscribers.forEach(function (f) { return f(snapshot); });
    };
    Node.prototype.applyPatch = function (patch) {
        var parts = splitJsonPath(patch.path);
        var node = this.resolvePath(parts.slice(0, -1));
        node.pseudoAction(function () {
            node.applyPatchLocally(parts[parts.length - 1], patch);
        });
    };
    Node.prototype.applyPatchLocally = function (subpath, patch) {
        this.assertWritable();
        this.type.applyPatchLocally(this, subpath, patch);
    };
    Node.prototype.onPatch = function (onPatch$$1) {
        return registerEventHandler(this.patchSubscribers, onPatch$$1);
    };
    Node.prototype.emitPatch = function (patch, source) {
        if (this.patchSubscribers.length) {
            var localizedPatch_1 = extend({}, patch, {
                path: source.path.substr(this.path.length) + "/" + patch.path // calculate the relative path of the patch
            });
            this.patchSubscribers.forEach(function (f) { return f(localizedPatch_1); });
        }
        if (this.parent)
            this.parent.emitPatch(patch, source);
    };
    Node.prototype.setParent = function (newParent, subpath) {
        if (subpath === void 0) { subpath = null; }
        if (this.parent === newParent && this.subpath === subpath)
            return;
        if (this._parent && newParent && newParent !== this._parent) {
            fail("A node cannot exists twice in the state tree. Failed to add " + this + " to path '" + newParent.path + "/" + subpath + "'.");
        }
        if (!this._parent && newParent && newParent.root === this) {
            fail("A state tree is not allowed to contain itself. Cannot assign " + this + " to path '" + newParent.path + "/" + subpath + "'");
        }
        if (!this._parent && !!this._environment) {
            fail("A state tree that has been initialized with an environment cannot be made part of another state tree.");
        }
        if (this.parent && !newParent) {
            this.die();
        }
        else {
            this.subpath = subpath || "";
            if (newParent && newParent !== this._parent) {
                newParent.root.identifierCache.mergeCache(this);
                this._parent = newParent;
                this.fireHook("afterAttach");
            }
        }
    };
    Node.prototype.addDisposer = function (disposer) {
        this.disposers.unshift(disposer);
    };
    Node.prototype.isRunningAction = function () {
        if (this._isRunningAction)
            return true;
        if (this.isRoot)
            return false;
        return this.parent.isRunningAction();
    };
    Node.prototype.addMiddleWare = function (handler) {
        // TODO: check / warn if not protected?
        return registerEventHandler(this.middlewares, handler);
    };
    Node.prototype.getChildNode = function (subpath) {
        this.assertAlive();
        this._autoUnbox = false;
        var res = this.type.getChildNode(this, subpath);
        this._autoUnbox = true;
        return res;
    };
    Node.prototype.getChildren = function () {
        this.assertAlive();
        this._autoUnbox = false;
        var res = this.type.getChildren(this);
        this._autoUnbox = true;
        return res;
    };
    Node.prototype.getChildType = function (key) {
        return this.type.getChildType(key);
    };
    Object.defineProperty(Node.prototype, "isProtected", {
        get: function () {
            return this.root.isProtectionEnabled;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Pseudo action is an action that is not named, does not trigger middleware but does unlock the tree.
     * Used for applying (initial) snapshots and patches
     */
    Node.prototype.pseudoAction = function (fn) {
        var inAction = this._isRunningAction;
        this._isRunningAction = true;
        fn();
        this._isRunningAction = inAction;
    };
    Node.prototype.assertWritable = function () {
        this.assertAlive();
        if (!this.isRunningAction() && this.isProtected) {
            fail("Cannot modify '" + this + "', the object is protected and can only be modified by using an action.");
        }
    };
    Node.prototype.removeChild = function (subpath) {
        this.type.removeChild(this, subpath);
    };
    Node.prototype.detach = function () {
        if (!this._isAlive)
            fail("Error while detaching, node is not alive.");
        if (this.isRoot)
            return;
        else {
            this.fireHook("beforeDetach");
            this._environment = this.root._environment; // make backup of environment
            this._isDetaching = true;
            this.identifierCache = this.root.identifierCache.splitCache(this);
            this.parent.removeChild(this.subpath);
            this._parent = null;
            this.subpath = "";
            this._isDetaching = false;
        }
    };
    Node.prototype.unbox = function (childNode) {
        if (childNode && this._autoUnbox === true)
            return childNode.value;
        return childNode;
    };
    Node.prototype.fireHook = function (name) {
        var fn = this.storedValue && typeof this.storedValue === "object" && this.storedValue[name];
        if (typeof fn === "function")
            fn.apply(this.storedValue);
    };
    Node.prototype.toString = function () {
        var identifier = this.identifier ? "(id: " + this.identifier + ")" : "";
        return this.type.name + "@" + (this.path || "<root>") + identifier + (this.isAlive
            ? ""
            : "[dead]");
    };
    __decorate([
        observable
    ], Node.prototype, "_parent", void 0);
    __decorate([
        observable
    ], Node.prototype, "subpath", void 0);
    __decorate([
        computed
    ], Node.prototype, "path", null);
    __decorate([
        computed
    ], Node.prototype, "value", null);
    __decorate([
        computed
    ], Node.prototype, "snapshot", null);
    __decorate([
        action
    ], Node.prototype, "applyPatch", null);
    return Node;
}());
function isStateTreeNode(value) {
    return !!(value && value.$treenode);
}
function getStateTreeNode(value) {
    if (isStateTreeNode(value))
        return value.$treenode;
    else
        return fail("element has no Node");
}
function canAttachNode(value) {
    return value && typeof value === "object" && !isStateTreeNode(value) && !Object.isFrozen(value);
}
function toJSON() {
    return getStateTreeNode(this).snapshot;
}
function createNode(type, parent, subpath, environment, initialValue, createNewInstance, finalizeNewInstance) {
    if (createNewInstance === void 0) { createNewInstance = identity; }
    if (finalizeNewInstance === void 0) { finalizeNewInstance = noop; }
    if (isStateTreeNode(initialValue)) {
        var targetNode = getStateTreeNode(initialValue);
        if (!targetNode.isRoot)
            fail("Cannot add an object to a state tree if it is already part of the same or another state tree. Tried to assign an object to '" + (parent
                ? parent.path
                : "") + "/" + subpath + "', but it lives already at '" + targetNode.path + "'");
        targetNode.setParent(parent, subpath);
        return targetNode;
    }
    var instance = createNewInstance(initialValue);
    var canAttachTreeNode = canAttachNode(instance);
    // tslint:disable-next-line:no_unused-variable
    var node = new Node(type, parent, subpath, environment, instance);
    if (!parent)
        node.identifierCache = new IdentifierCache();
    if (canAttachTreeNode)
        addHiddenFinalProp(instance, "$treenode", node);
    var sawException = true;
    try {
        if (canAttachTreeNode)
            addReadOnlyProp(instance, "toJSON", toJSON);
        node.pseudoAction(function () {
            finalizeNewInstance(node, initialValue);
        });
        if (parent)
            parent.root.identifierCache.addNodeToCache(node);
        else
            node.identifierCache.addNodeToCache(node);
        node.fireHook("afterCreate");
        if (parent)
            node.fireHook("afterAttach");
        sawException = false;
        return node;
    }
    finally {
        if (sawException) {
            // short-cut to die the instance, to avoid the snapshot computed starting to throw...

            node._isAlive = false;
        }
    }
}

function indent(str, ind = '  ') {
  return ind + str.split('\n').join('\n' + ind)
}

function JSStringify(json, short = false) {
  if (Array.isArray(json)) return '[' + json.map(v => JSStringify(v)).join(', ') + ']'
  if (typeof json === 'undefined') return 'undefined'
  if (!json || typeof json !== 'object') return JSON.stringify(json)
  if (Object.keys(json).length === 0) return '{}'
  const JSStr = (j, mapV, s = false) =>
    '{' +
    Object.entries(j).sort(([a], [b]) => a > b ? 1 : -1).map(([k, v]) =>
      `${(s?'\n  ':'')}${k}: ${mapV(v)}`
    ).join(', ') +
    (s?'\n':'') +
    '}'
  if (short) return JSStr(json, (v =>
    Array.isArray(v) ? 'array['+v.length+']' :
    v === null ? 'null' :
    typeof v === 'string' ? (v.length > 13 ? '"' + v.substr(0, 10) + '"' + '...' : '"'+v+'"') :
    typeof v === 'number' ? v :
    typeof v === 'boolean' ? v :
    typeof v
  ))
  return JSStr(json, (v => JSStringify(v, true)), true)
}

function prettyPrintValue(value) {
    return typeof value === "function"
        ? "<function" + (value.name ? " " + value.name : "") + ">"
        : isStateTreeNode(value) ? "<" + value + ">" : JSStringify(value);
}
function toErrorString(error) {
    var value = error.value;
    var type = error.context[error.context.length - 1].type;
    var fullPath = error.context.map(function (_a) {
        var path = _a.path;
        return path;
    }).filter(function (path) { return path.length > 0; }).join("/");
    var pathPrefix = fullPath.length > 0 ? "at path \"/" + fullPath + "\" " : "";
    var currentTypename = isStateTreeNode(value)
        ? "value of type " + getStateTreeNode(value).type.name + ":"
        : isPrimitive(value) ? "value:" : "snapshot:";
    var isSnapshotCompatible = type && isStateTreeNode(value) && type.is(getStateTreeNode(value).snapshot);
    return ("" + pathPrefix + currentTypename + "\n" + indent(
      indent(prettyPrintValue(value)) +
      "\nis not assignable " +
      (type
        ? "to type: \n" + indent(type.describe()) + "\n" + indent(type.name) + "\n"
        : "\n") +
        (error.message ? "" + error.message + "\n" : "") +
        (type
            ? isPrimitiveType(type)
                ? "."
                : (isSnapshotCompatible
                    ? "(Note that a snapshot of the provided value is compatible with the targeted type)\n"
                    : "")
            : ".")));
}

function getContextForPath(context, path, type) {
    return context.concat([{ path: path, type: type }]);
}
function typeCheckSuccess() {
    return EMPTY_ARRAY;
}
function typeCheckFailure(context, value, message) {
    return [{ context: context, value: value, message: message }];
}
function flattenTypeErrors(errors) {
    return errors.reduce(function (a, i) { return a.concat(i); }, []);
}
// TODO; doublecheck: typecheck should only needed to be invoked from: type.create and array / map / value.property will change
function typecheck(type, value) {
    var errors = type.validate(value, [{ path: "", type: type }]);
    if (errors.length > 0) {
        fail("Error while converting\n" + prettyPrintValue(value) + "\nto\n  " + type.name + "\n\n" +
            "• " + errors.map(toErrorString).join("\n• "));
    }
}

/**
 * A complex type produces a MST node (Node in the state tree)
 */
var ComplexType = (function () {
    function ComplexType(name) {
        this.isType = true;
        this.name = name;
    }
    ComplexType.prototype.create = function (snapshot, environment) {
        if (snapshot === void 0) { snapshot = this.getDefaultSnapshot(); }
        typecheck(this, snapshot);
        return this.instantiate(null, "", environment, snapshot).value;
    };
    ComplexType.prototype.isAssignableFrom = function (type) {
        return type === this;
    };
    ComplexType.prototype.validate = function (value, context) {
        if (isStateTreeNode(value)) {
            return getType(value) === this || this.isAssignableFrom(getType(value))
                ? typeCheckSuccess()
                : typeCheckFailure(context, value, "Value type is not compatible");
            // it is tempting to compare snapshots, but in that case we should always clone on assignments...
        }
        return this.isValidSnapshot(value, context);
    };
    ComplexType.prototype.is = function (value) {
        return this.validate(value, [{ path: "", type: this }]).length === 0;
    };
    ComplexType.prototype.reconcile = function (current, newValue) {
        var parent = current.parent, subpath = current.subpath;
        if (isStateTreeNode(newValue) && getStateTreeNode(newValue) === current)
            // the current node is the same as the new one
            return current;
        if (current.type === this &&
            isMutable(newValue) &&
            !isStateTreeNode(newValue) &&
            (!current.identifierAttribute ||
                current.identifier === newValue[current.identifierAttribute])) {
            // the newValue has no node, so can be treated like a snapshot
            // we can reconcile
            current.applySnapshot(newValue);
            return current;
        }
        // current node cannot be recycled in any way
        current.die();
        // attempt to reuse the new one
        if (isStateTreeNode(newValue) && this.isAssignableFrom(getType(newValue))) {
            // newValue is a Node as well, move it here..
            var newNode = getStateTreeNode(newValue);
            newNode.setParent(parent, subpath);
            return newNode;
        }
        // nothing to do, we have to create a new node
        return this.instantiate(parent, subpath, current._environment, newValue);
    };
    Object.defineProperty(ComplexType.prototype, "Type", {
        get: function () {
            return fail("Factory.Type should not be actually called. It is just a Type signature that can be used at compile time with Typescript, by using `typeof type.Type`");
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ComplexType.prototype, "SnapshotType", {
        get: function () {
            return fail("Factory.SnapshotType should not be actually called. It is just a Type signature that can be used at compile time with Typescript, by using `typeof type.SnapshotType`");
        },
        enumerable: true,
        configurable: true
    });
    __decorate([
        action
    ], ComplexType.prototype, "create", null);
    return ComplexType;
}());
var Type = (function (_super) {
    __extends(Type, _super);
    function Type(name) {
        return _super.call(this, name) || this;
    }
    Type.prototype.getValue = function (node) {
        return node.storedValue;
    };
    Type.prototype.getSnapshot = function (node) {
        return node.storedValue;
    };
    Type.prototype.getDefaultSnapshot = function () {
        return undefined;
    };
    Type.prototype.applySnapshot = function (node, snapshot) {
        fail("Immutable types do not support applying snapshots");
    };
    Type.prototype.applyPatchLocally = function (node, subpath, patch) {
        fail("Immutable types do not support applying patches");
    };
    Type.prototype.getChildren = function (node) {
        return EMPTY_ARRAY;
    };
    Type.prototype.getChildNode = function (node, key) {
        return fail("No child '" + key + "' available in type: " + this.name);
    };
    Type.prototype.getChildType = function (key) {
        return fail("No child '" + key + "' available in type: " + this.name);
    };
    Type.prototype.reconcile = function (current, newValue) {
        // reconcile only if type and value are still the same
        if (current.type === this && current.storedValue === newValue)
            return current;
        var res = this.instantiate(current.parent, current.subpath, current._environment, newValue);
        current.die();
        return res;
    };
    Type.prototype.removeChild = function (node, subpath) {
        return fail("No child '" + subpath + "' available in type: " + this.name);
    };
    return Type;
}(ComplexType));

function mapToString() {
    return getStateTreeNode(this) + "(" + this.size + " items)";
}
function put(value) {
    if (!!!value)
        fail("Map.put cannot be used to set empty values");
    var node;
    if (isStateTreeNode(value)) {
        node = getStateTreeNode(value);
    }
    else if (isMutable(value)) {
        var targetType = getStateTreeNode(this).type
            .subType;
        node = getStateTreeNode(targetType.create(value));
    }
    else {
        return fail("Map.put can only be used to store complex values");
    }
    if (!node.identifierAttribute)
        fail("Map.put can only be used to store complex values that have an identifier type attribute");
    this.set(node.identifier, node.value);
    return this;
}
var MapType = (function (_super) {
    __extends(MapType, _super);
    function MapType(name, subType) {
        var _this = _super.call(this, name) || this;
        _this.shouldAttachNode = true;
        _this.flags = TypeFlags.Map;
        _this.createNewInstance = function () {
            // const identifierAttr = getIdentifierAttribute(this.subType)
            var map = observable.shallowMap();
            addHiddenFinalProp(map, 'put', put);
            addHiddenFinalProp(map, 'toString', mapToString);
            return map;
        };
        _this.finalizeNewInstance = function (node, snapshot) {
            var instance = node.storedValue;
            extras.interceptReads(instance, node.unbox);
            intercept(instance, function (c) { return _this.willChange(c); });
            node.applySnapshot(snapshot);
            observe(instance, _this.didChange);
        };
        _this.subType = subType;
        return _this;
    }
    MapType.prototype.instantiate = function (parent, subpath, environment, snapshot) {
        return createNode(this, parent, subpath, environment, snapshot, this.createNewInstance, this.finalizeNewInstance);
    };
    MapType.prototype.describe = function () {
        return 'Map<string, ' + this.subType.describe() + '>';
    };
    MapType.prototype.getChildren = function (node) {
        return node.storedValue.values();
    };
    MapType.prototype.getChildNode = function (node, key) {
        var childNode = node.storedValue.get(key);
        if (!childNode)
            fail('Not a child ' + key);
        return childNode;
    };
    MapType.prototype.willChange = function (change) {
        var node = getStateTreeNode(change.object);
        node.assertWritable();
        switch (change.type) {
            case 'update':
                {
                    var newValue = change.newValue;
                    var oldValue = change.object.get(change.name);
                    if (newValue === oldValue)
                        return null;
                    typecheck(this.subType, newValue);
                    change.newValue = this.subType.reconcile(node.getChildNode(change.name), change.newValue);
                    this.verifyIdentifier(change.name, change.newValue);
                }
                break;
            case 'add':
                {
                    typecheck(this.subType, change.newValue);
                    change.newValue = this.subType.instantiate(node, change.name, undefined, change.newValue);
                    this.verifyIdentifier(change.name, change.newValue);
                }
                break;
            case 'delete':
                {
                    node.getChildNode(change.name).die();
                }
                break;
        }
        return change;
    };
    MapType.prototype.verifyIdentifier = function (expected, node) {
        var identifier = node.identifier;
        if (identifier !== null && '' + identifier !== '' + expected)
            fail("A map of objects containing an identifier should always store the object under their own identifier. Trying to store key '" + identifier + "', but expected: '" + expected + "'");
    };
    MapType.prototype.getValue = function (node) {
        return node.storedValue;
    };
    MapType.prototype.getSnapshot = function (node) {
        var res = {};
        node.getChildren().forEach(function (childNode) {
            res[childNode.subpath] = childNode.snapshot;
        });
        return res;
    };
    MapType.prototype.didChange = function (change) {
        var node = getStateTreeNode(change.object);
        switch (change.type) {
            case 'update':
            case 'add':
                return void node.emitPatch({
                    op: change.type === 'add' ? 'add' : 'replace',
                    path: escapeJsonPath(change.name),
                    value: node.getChildNode(change.name).snapshot
                }, node);
            case 'delete':
                return void node.emitPatch({
                    op: 'remove',
                    path: escapeJsonPath(change.name)
                }, node);
        }
    };
    MapType.prototype.applyPatchLocally = function (node, subpath, patch) {
        var target = node.storedValue;
        switch (patch.op) {
            case 'add':
            case 'replace':
                target.set(subpath, patch.value);
                break;
            case 'remove':
                target.delete(subpath);
                break;
        }
    };
    MapType.prototype.applySnapshot = function (node, snapshot) {
        typecheck(this, snapshot);
        node.pseudoAction(function () {
            var target = node.storedValue;
            var currentKeys = {};
            target.keys().forEach(function (key) {
                currentKeys[key] = false;
            });
            // Don't use target.replace, as it will throw all existing items first
            Object.keys(snapshot).forEach(function (key) {
                target.set(key, snapshot[key]);
                currentKeys[key] = true;
            });
            Object.keys(currentKeys).forEach(function (key) {
                if (currentKeys[key] === false)
                    target.delete(key);
            });
        });
    };
    MapType.prototype.getChildType = function (key) {
        return this.subType;
    };
    MapType.prototype.isValidSnapshot = function (value, context) {
        var _this = this;
        if (!isPlainObject(value)) {
            return typeCheckFailure(context, value, "Value is not a plain object, hence cannot be casted to a map");
        }
        return flattenTypeErrors(Object.keys(value).map(function (path) {
            return _this.subType.validate(value[path], getContextForPath(context, path, _this.subType));
        }));
    };
    MapType.prototype.getDefaultSnapshot = function () {
        return {};
    };
    MapType.prototype.removeChild = function (node, subpath) {

        node.storedValue.delete(subpath);
    };
    __decorate([
        action
    ], MapType.prototype, "applySnapshot", null);
    return MapType;
}(ComplexType));
function map(subtype) {
    return new MapType("map<string, " + subtype.name + ">", subtype);
}

function arrayToString() {
    return getStateTreeNode(this) + "(" + this.length + " items)";
}
var ArrayType = (function (_super) {
    __extends(ArrayType, _super);
    function ArrayType(name, subType) {
        var _this = _super.call(this, name) || this;
        _this.shouldAttachNode = true;
        _this.flags = TypeFlags.Array;
        _this.createNewInstance = function () {
            var array = observable.shallowArray();
            addHiddenFinalProp(array, 'toString', arrayToString);
            return array;
        };
        _this.finalizeNewInstance = function (node, snapshot) {
            var instance = node.storedValue;
            extras.getAdministration(instance).dehancer = node.unbox;
            intercept(instance, function (change) { return _this.willChange(change); });
            node.applySnapshot(snapshot);
            observe(instance, _this.didChange);
        };
        _this.subType = subType;
        return _this;
    }
    ArrayType.prototype.describe = function () {
        return 'Array[' + this.subType.describe() + ']';
    };
    ArrayType.prototype.instantiate = function (parent, subpath, environment, snapshot) {
        return createNode(this, parent, subpath, environment, snapshot, this.createNewInstance, this.finalizeNewInstance);
    };
    ArrayType.prototype.getChildren = function (node) {
        return node.storedValue.peek();
    };
    ArrayType.prototype.getChildNode = function (node, key) {
        var index = parseInt(key, 10);
        if (index < node.storedValue.length)
            return node.storedValue[index];
        return fail('Not a child: ' + key);
    };
    ArrayType.prototype.willChange = function (change) {
        var node = getStateTreeNode(change.object);
        node.assertWritable();
        var childNodes = node.getChildren();
        switch (change.type) {
            case 'update':
                if (change.newValue === change.object[change.index])
                    return null;
                change.newValue = reconcileArrayChildren(node, this.subType, [childNodes[change.index]], [change.newValue], [change.index])[0];
                break;
            case 'splice':
                var index_1 = change.index, removedCount = change.removedCount, added = change.added;
                change.added = reconcileArrayChildren(node, this.subType, childNodes.slice(index_1, index_1 + removedCount), added, added.map(function (_, i) { return index_1 + i; }));
                // update paths of remaining items
                for (var i = index_1 + removedCount; i < childNodes.length; i++) {
                    childNodes[i].setParent(node, '' + (i + added.length - removedCount));
                }
                break;
        }
        return change;
    };
    ArrayType.prototype.getValue = function (node) {
        return node.storedValue;
    };
    ArrayType.prototype.getSnapshot = function (node) {
        return node.getChildren().map(function (childNode) { return childNode.snapshot; });
    };
    ArrayType.prototype.didChange = function (change) {
        var node = getStateTreeNode(change.object);
        switch (change.type) {
            case 'update':
                return void node.emitPatch({
                    op: 'replace',
                    path: '' + change.index,
                    value: node.getChildNode('' + change.index).snapshot
                }, node);
            case 'splice':
                for (var i = change.index + change.removedCount - 1; i >= change.index; i--)
                    node.emitPatch({
                        op: 'remove',
                        path: '' + i
                    }, node);
                for (var i = 0; i < change.addedCount; i++)
                    node.emitPatch({
                        op: 'add',
                        path: '' + (change.index + i),
                        value: node.getChildNode('' + (change.index + i)).snapshot
                    }, node);
                return;
        }
    };
    ArrayType.prototype.applyPatchLocally = function (node, subpath, patch) {
        var target = node.storedValue;
        var index = subpath === '-' ? target.length : parseInt(subpath);
        switch (patch.op) {
            case 'replace':
                target[index] = patch.value;
                break;
            case 'add':
                target.splice(index, 0, patch.value);
                break;
            case 'remove':
                target.splice(index, 1);
                break;
        }
    };
    ArrayType.prototype.applySnapshot = function (node, snapshot) {
        typecheck(this, snapshot);
        node.pseudoAction(function () {
            var target = node.storedValue;
            target.replace(snapshot);
        });
    };
    ArrayType.prototype.getChildType = function (key) {
        return this.subType;
    };
    ArrayType.prototype.isValidSnapshot = function (value, context) {
        var _this = this;
        if (!Array.isArray(value)) {
            return typeCheckFailure(context, value, "Value is not an array");
        }
        var x = flattenTypeErrors(value.map(function (item, index) {
            var x = _this.subType.validate(item, getContextForPath(context, '' + index, _this.subType));
            return x
        }));
        return x
    };
    ArrayType.prototype.getDefaultSnapshot = function () {
        return [];
    };
    ArrayType.prototype.removeChild = function (node, subpath) {
        node.storedValue.splice(parseInt(subpath, 10), 1);
    };
    __decorate([
        action
    ], ArrayType.prototype, "applySnapshot", null);
    return ArrayType;
}(ComplexType));
function array(subtype) {
    return new ArrayType(subtype.name + '[]', subtype);
}
function reconcileArrayChildren(parent, childType, oldNodes, newValues, newPaths) {
    var res = new Array(newValues.length);
    var nodesToBeKilled = {};
    var oldNodesByIdentifier = {};
    function findReconcilationCandidates(snapshot) {
        for (var attr in oldNodesByIdentifier) {
            var id = snapshot[attr];
            if ((typeof id === 'string' || typeof id === 'number') &&
                oldNodesByIdentifier[attr][id])
                return oldNodesByIdentifier[attr][id];
        }
        return null;
    }
    // Investigate which values we could reconcile, and mark them all as potentially dead
    oldNodes.forEach(function (oldNode) {
        if (oldNode.identifierAttribute)
            (oldNodesByIdentifier[oldNode.identifierAttribute] ||
                (oldNodesByIdentifier[oldNode.identifierAttribute] = {}))[oldNode.identifier] = oldNode;
        nodesToBeKilled[oldNode.nodeId] = oldNode;
    });
    // Prepare new values, try to reconcile
    newValues.forEach(function (newValue, index) {
        var subPath = '' + newPaths[index];
        if (isStateTreeNode(newValue)) {
            // A tree node...
            var childNode = getStateTreeNode(newValue);
            childNode.assertAlive();
            if (childNode.parent === parent) {
                // Came from this array already
                if (!nodesToBeKilled[childNode.nodeId]) {
                    // this node is owned by this parent, but not in the reconcilable set, so it must be double
                    fail("Cannot add an object to a state tree if it is already part of the same or another state tree. Tried to assign an object to '" + parent.path + "/" + subPath + "', but it lives already at '" + childNode.path + "'");
                }
                nodesToBeKilled[childNode.nodeId] = undefined;
                childNode.setParent(parent, subPath);
                res[index] = childNode; // reuse node
            }
            else {
                // Lives somewhere else (note that instantiate might still reconcile for complex types!)
                res[index] = childType.instantiate(parent, subPath, undefined, newValue);
            }
        }
        else if (isMutable(newValue)) {
            // The snapshot of a tree node, try to reconcile based on id
            var reconcilationCandidate = findReconcilationCandidates(newValue);
            if (reconcilationCandidate) {
                var childNode = childType.reconcile(reconcilationCandidate, newValue);
                nodesToBeKilled[reconcilationCandidate.nodeId] = undefined;
                childNode.setParent(parent, subPath);
                res[index] = childNode;
            }
            else {
                res[index] = childType.instantiate(parent, subPath, undefined, newValue);
            }
        }
        else {
            // create a fresh MST node
            res[index] = childType.instantiate(parent, subPath, undefined, newValue);
        }
    });
    // Kill non reconciled values
    for (var key in nodesToBeKilled)
        if (nodesToBeKilled[key] !== undefined)
            nodesToBeKilled[key].die();
    return res;
}

var CoreType = (function (_super) {
    __extends(CoreType, _super);
    function CoreType(name, flags, checker) {
        var _this = _super.call(this, name) || this;
        _this.flags = flags;
        _this.checker = checker;
        return _this;
    }
    CoreType.prototype.describe = function () {
        return this.name;
    };
    CoreType.prototype.instantiate = function (parent, subpath, environment, snapshot) {
        return createNode(this, parent, subpath, environment, snapshot);
    };
    CoreType.prototype.isValidSnapshot = function (value, context) {
        if (isPrimitive(value) && this.checker(value)) {
            return typeCheckSuccess();
        }
        return typeCheckFailure(context, value, "Value is not of the specified primitive type");
    };
    return CoreType;
}(Type));
// tslint:disable-next-line:variable-name
var string = new CoreType("string", TypeFlags.String, function (v) { return typeof v === "string"; });
// tslint:disable-next-line:variable-name
var number = new CoreType("number", TypeFlags.Number, function (v) { return typeof v === "number"; });
// tslint:disable-next-line:variable-name
var boolean = new CoreType("boolean", TypeFlags.Boolean, function (v) { return typeof v === "boolean"; });
// tslint:disable-next-line:variable-name
var DatePrimitive = new CoreType("Date", TypeFlags.Date, function (v) { return v instanceof Date; });
DatePrimitive.getSnapshot = function (node) {
    return node.storedValue.getTime();
};
// TODO: move null and undefined primitive to here (from maybe)
function getPrimitiveFactoryFromValue(value) {
    switch (typeof value) {
        case "string":
            return string;
        case "number":
            return number;
        case "boolean":
            return boolean;
        case "object":
            if (value instanceof Date)
                return DatePrimitive;
    }
    return fail("Cannot determine primtive type from value " + value);
}

var IdentifierType = (function (_super) {
    __extends(IdentifierType, _super);
    function IdentifierType(identifierType) {
        var _this = _super.call(this, "identifier(" + identifierType.name + ")") || this;
        _this.identifierType = identifierType;
        _this.flags = TypeFlags.Identifier;
        return _this;
    }
    IdentifierType.prototype.instantiate = function (parent, subpath, environment, snapshot) {
        if (!parent || !isStateTreeNode(parent.storedValue))
            return fail("Identifier types can only be instantiated as direct child of a model type");
        if (parent.identifierAttribute)
            fail("Cannot define property '" + subpath + "' as object identifier, property '" + parent.identifierAttribute + "' is already defined as identifier property");
        parent.identifierAttribute = subpath;
        return createNode(this, parent, subpath, environment, snapshot);
    };
    IdentifierType.prototype.reconcile = function (current, newValue) {
        if (current.storedValue !== newValue)
            return fail("Tried to change identifier from '" + current.storedValue + "' to '" + newValue + "'. Changing identifiers is not allowed.");
        return current;
    };
    IdentifierType.prototype.describe = function () {
        return "identifier(" + this.identifierType.describe() + ")";
    };
    IdentifierType.prototype.isValidSnapshot = function (value, context) {
        if (value === undefined || value === null || typeof value === "string" || typeof value === "number")
            return this.identifierType.validate(value, context);
        return typeCheckFailure(context, value, "References should be a primitive value");
    };
    return IdentifierType;
}(Type));
function identifier(baseType) {
    if (baseType === void 0) { baseType = string; }
    return new IdentifierType(baseType);
}

var OptionalValue = (function (_super) {
    __extends(OptionalValue, _super);
    function OptionalValue(type, defaultValue) {
        var _this = _super.call(this, type.name) || this;
        _this.type = type;
        _this.defaultValue = defaultValue;
        return _this;
    }
    Object.defineProperty(OptionalValue.prototype, "flags", {
        get: function () {
            return this.type.flags | TypeFlags.Optional;
        },
        enumerable: true,
        configurable: true
    });
    OptionalValue.prototype.describe = function () {
        return '?' + this.type.describe();
    };
    OptionalValue.prototype.instantiate = function (parent, subpath, environment, value) {
        if (typeof value === "undefined") {
            var defaultValue = this.getDefaultValue();
            var defaultSnapshot = isStateTreeNode(defaultValue)
                ? getStateTreeNode(defaultValue).snapshot
                : defaultValue;
            return this.type.instantiate(parent, subpath, environment, defaultSnapshot);
        }
        return this.type.instantiate(parent, subpath, environment, value);
    };
    OptionalValue.prototype.reconcile = function (current, newValue) {
        return this.type.reconcile(current, this.type.is(newValue) ? newValue : this.getDefaultValue());
    };
    OptionalValue.prototype.getDefaultValue = function () {
        var defaultValue = typeof this.defaultValue === "function" ? this.defaultValue() : this.defaultValue;
        if (typeof this.defaultValue === "function")
            typecheck(this, defaultValue);
        return defaultValue;
    };
    OptionalValue.prototype.isValidSnapshot = function (value, context) {
        // defaulted values can be skipped
        if (value === undefined) return typeCheckSuccess();
        return this.type.validate(value, context)
    };
    return OptionalValue;
}(Type));
function optional(type, defaultValueOrFunction) {
    var defaultValue = typeof defaultValueOrFunction === "function"
        ? defaultValueOrFunction()
        : defaultValueOrFunction;
    var defaultSnapshot = isStateTreeNode(defaultValue) ? getStateTreeNode(defaultValue).snapshot : defaultValue;
    typecheck(type, defaultSnapshot);
    return new OptionalValue(type, defaultValueOrFunction);
}

var Property = (function () {
    function Property(name) {
        this.name = name;
        // empty
    }
    Property.prototype.initializePrototype = function (prototype) { };
    Property.prototype.initialize = function (targetInstance, snapshot) { };
    Property.prototype.willChange = function (change) {
        return null;
    };
    Property.prototype.didChange = function (change) { };
    Property.prototype.serialize = function (instance, snapshot) { };
    Property.prototype.deserialize = function (instance, snapshot) { };
    return Property;
}());

var ComputedProperty = (function (_super) {
    __extends(ComputedProperty, _super);
    function ComputedProperty(propertyName, getter, setter) {
        var _this = _super.call(this, propertyName) || this;
        _this.getter = getter;
        _this.setter = setter;
        return _this;
    }
    ComputedProperty.prototype.initializePrototype = function (proto) {
        Object.defineProperty(proto, this.name, computed(proto, this.name, {
            get: this.getter,
            set: this.setter,
            configurable: true,
            enumerable: false
        }));
    };
    ComputedProperty.prototype.validate = function (snapshot, context) {
        if (this.name in snapshot) {
            return typeCheckFailure(getContextForPath(context, this.name), snapshot[this.name], "Computed properties should not be provided in the snapshot");
        }
        return typeCheckSuccess();
    };
    return ComputedProperty;
}(Property));

var Literal = (function (_super) {
    __extends(Literal, _super);
    function Literal(value) {
        var _this = _super.call(this, "" + value) || this;
        _this.flags = TypeFlags.Literal;
        _this.value = value;
        return _this;
    }
    Literal.prototype.instantiate = function (parent, subpath, environment, snapshot) {
        return createNode(this, parent, subpath, environment, snapshot);
    };
    Literal.prototype.describe = function () {
        return JSON.stringify(this.value);
    };
    Literal.prototype.isValidSnapshot = function (value, context) {
        if (value === this.value) {
            return typeCheckSuccess();
        }
        return typeCheckFailure(context, value, "Value is not a literal equal to \"" + this.value + "\"");
    };
    return Literal;
}(Type));
function literal(value) {
    if (!isPrimitive(value))
        fail("Literal types can be built only on top of primitives");
    return new Literal(value);
}

var undefinedType = literal(undefined);
var ValueProperty = (function (_super) {
    __extends(ValueProperty, _super);
    function ValueProperty(propertyName, type) {
        var _this = _super.call(this, propertyName) || this;
        _this.type = type;
        return _this;
    }
    ValueProperty.prototype.initializePrototype = function (proto) {
        observable.ref(proto, this.name, {
            value: undefinedType.instantiate(null, "", null, undefined)
        }); // TODO: undefined type should not be needed
    };
    ValueProperty.prototype.initialize = function (instance, snapshot) {
        var node = getStateTreeNode(instance);
        instance[this.name] = this.type.instantiate(node, this.name, node._environment, snapshot[this.name]);
        extras.interceptReads(instance, this.name, node.unbox);
    };
    ValueProperty.prototype.getValueNode = function (targetInstance) {
        var node = targetInstance.$mobx.values[this.name].value; // TODO: blegh!
        if (!node)
            return fail("Node not available for property " + this.name);
        return node;
    };
    ValueProperty.prototype.willChange = function (change) {
        var node = getStateTreeNode(change.object); // TODO: pass node in from object property
        typecheck(this.type, change.newValue);
        change.newValue = this.type.reconcile(node.getChildNode(change.name), change.newValue);
        return change;
    };
    ValueProperty.prototype.didChange = function (change) {
        var node = getStateTreeNode(change.object);
        node.emitPatch({
            op: "replace",
            path: escapeJsonPath(this.name),
            value: this.getValueNode(change.object).snapshot
        }, node);
    };
    ValueProperty.prototype.serialize = function (instance, snapshot) {
        // TODO: FIXME, make sure the observable ref is used!

        extras.getAtom(instance, this.name).reportObserved();
        snapshot[this.name] = this.getValueNode(instance).snapshot;
    };
    ValueProperty.prototype.deserialize = function (instance, snapshot) {
        instance[this.name] = snapshot[this.name];
    };
    ValueProperty.prototype.validate = function (snapshot, context) {
        return this.type.validate(snapshot[this.name], getContextForPath(context, this.name, this.type));
    };
    return ValueProperty;
}(Property));

var ActionProperty = (function (_super) {
    __extends(ActionProperty, _super);
    function ActionProperty(name, fn) {
        var _this = _super.call(this, name) || this;
        _this.invokeAction = createActionInvoker(name, fn);
        return _this;
    }
    ActionProperty.prototype.initialize = function (target) {
        addHiddenFinalProp(target, this.name, this.invokeAction.bind(target));
    };
    ActionProperty.prototype.validate = function (snapshot, context) {
        if (this.name in snapshot) {
            return typeCheckFailure(getContextForPath(context, this.name), snapshot[this.name], "Action properties should not be provided in the snapshot");
        }
        return typeCheckSuccess();
    };
    return ActionProperty;
}(Property));

var ViewProperty = (function (_super) {
    __extends(ViewProperty, _super);
    function ViewProperty(name, fn) {
        var _this = _super.call(this, name) || this;
        _this.invokeView = createViewInvoker(name, fn);
        return _this;
    }
    ViewProperty.prototype.initialize = function (target) {
        addHiddenFinalProp(target, this.name, this.invokeView.bind(target));
    };
    ViewProperty.prototype.validate = function (snapshot, context) {
        if (this.name in snapshot) {
            return typeCheckFailure(getContextForPath(context, this.name), snapshot[this.name], "View properties should not be provided in the snapshot");
        }
        return typeCheckSuccess();
    };
    return ViewProperty;
}(Property));
function createViewInvoker(name, fn) {
    return function () {
        var _this = this;
        var args = arguments;
        var adm = getStateTreeNode(this);
        adm.assertAlive();
        return extras.allowStateChanges(false, function () { return fn.apply(_this, args); });
    };
}

var VolatileProperty = (function (_super) {
    __extends(VolatileProperty, _super);
    function VolatileProperty(propertyName, initialValue) {
        var _this = _super.call(this, propertyName) || this;
        _this.initialValue = initialValue;
        if (initialValue !== null && typeof initialValue === "object")
            return fail("Trying to declare property " + propertyName + " with a non-primitive value. Please provide an initializer function to avoid accidental sharing of local state, like `" + propertyName + ": () => initialValue`");
        return _this;
    }
    VolatileProperty.prototype.initialize = function (instance, snapshot) {
        var v = typeof this.initialValue === "function"
            ? this.initialValue.call(instance, instance)
            : this.initialValue;
        extendObservable(instance, (_a = {}, _a[this.name] = v, _a));
        var _a;
    };
    VolatileProperty.prototype.willChange = function (change) {
        return change;
    };
    VolatileProperty.prototype.validate = function (snapshot, context) {
        if (this.name in snapshot) {
            return typeCheckFailure(getContextForPath(context, this.name), snapshot[this.name], "Volatile state should not be provided in the snapshot");
        }
        return typeCheckSuccess();
    };
    return VolatileProperty;
}(Property));

var HOOK_NAMES = [
    "preProcessSnapshot",
    "afterCreate",
    "afterAttach",
    "postProcessSnapshot",
    "beforeDetach",
    "beforeDestroy"
];
function objectTypeToString() {
    return getStateTreeNode(this).toString();
}
var ObjectType = (function (_super) {
    __extends(ObjectType, _super);
    function ObjectType(name, baseModel, baseState, baseActions) {
        var _this = _super.call(this, name) || this;
        _this.shouldAttachNode = true;
        _this.flags = TypeFlags.Object;
        /**
         * Parsed description of all properties
         */
        _this.props = {};
        _this.createNewInstance = function () {
            var instance = new _this.modelConstructor();
            extendShallowObservable(instance, {});
            return instance;
        };
        _this.finalizeNewInstance = function (node, snapshot) {
            var instance = node.storedValue;
            _this.forAllProps(function (prop) { return prop.initialize(instance, snapshot); });
            intercept(instance, function (change) { return _this.willChange(change); });
            observe(instance, _this.didChange);
        };
        _this.didChange = function (change) {
            _this.props[change.name].didChange(change);
        };
        Object.freeze(baseModel); // make sure nobody messes with it
        Object.freeze(baseActions);
        _this.properties = baseModel;
        _this.state = baseState;
        _this.actions = baseActions;
        if (!/^\w[\w\d_]*$/.test(name))
            fail("Typename should be a valid identifier: " + name);
        // fancy trick to get a named function...., http://stackoverflow.com/questions/5905492/dynamic-function-name-in-javascript
        // Although object.defineProperty on a real function could also be used, that name is not used everywhere, for example when logging an object to the Chrome console, so this works better:
        _this.modelConstructor = new Function("return function " + name + " (){}")();
        _this.modelConstructor.prototype.toString = objectTypeToString;
        _this.parseModelProps();
        _this.forAllProps(function (prop) { return prop.initializePrototype(_this.modelConstructor.prototype); });
        return _this;
    }
    ObjectType.prototype.instantiate = function (parent, subpath, environment, snapshot) {
        return createNode(this, parent, subpath, environment, this.preProcessSnapshot(snapshot), this.createNewInstance, this.finalizeNewInstance);
    };
    ObjectType.prototype.willChange = function (change) {
        var node = getStateTreeNode(change.object);
        node.assertWritable();
        return this.props[change.name].willChange(change);
    };
    ObjectType.prototype.parseModelProps = function () {
        var _a = this, properties = _a.properties, state = _a.state, actions = _a.actions;
        for (var key in properties)
            if (hasOwnProperty(properties, key)) {
                if (HOOK_NAMES.indexOf(key) !== -1)
                    console.warn("Hook '" + key + "' was defined as property. Hooks should be defined as part of the actions");
                var descriptor = Object.getOwnPropertyDescriptor(properties, key);
                if ("get" in descriptor) {
                    this.props[key] = new ComputedProperty(key, descriptor.get, descriptor.set);
                    continue;
                }
                var value = descriptor.value;
                if (value === null || undefined) {
                    fail("The default value of an attribute cannot be null or undefined as the type cannot be inferred. Did you mean `types.maybe(someType)`?");
                }
                else if (isPrimitive(value)) {
                    var baseType = getPrimitiveFactoryFromValue(value);
                    this.props[key] = new ValueProperty(key, optional(baseType, value));
                }
                else if (isType(value)) {
                    this.props[key] = new ValueProperty(key, value);
                }
                else if (typeof value === "function") {
                    this.props[key] = new ViewProperty(key, value);
                }
                else if (typeof value === "object") {
                    fail("In property '" + key + "': base model's should not contain complex values: '" + value + "'");
                }
                else {
                    fail("Unexpected value for property '" + key + "'");
                }
            }
        for (var key in state)
            if (hasOwnProperty(state, key)) {
                if (HOOK_NAMES.indexOf(key) !== -1)
                    console.warn("Hook '" + key + "' was defined as local state. Hooks should be defined as part of the actions");
                var value = state[key];
                if (key in this.properties)
                    fail("Property '" + key + "' was also defined as local state. Local state fields and properties should not collide");
                this.props[key] = new VolatileProperty(key, value);
            }
        for (var key in actions)
            if (hasOwnProperty(actions, key)) {
                var value = actions[key];
                if (key in this.properties)
                    fail("Property '" + key + "' was also defined as action. Actions and properties should not collide");
                if (key in this.state)
                    fail("Property '" + key + "' was also defined as local state. Actions and state should not collide");
                if (typeof value === "function") {
                    this.props[key] = new ActionProperty(key, value);
                }
                else {
                    fail("Unexpected value for action '" + key + "'. Expected function, got " + typeof value);
                }
            }
    };
    ObjectType.prototype.getChildren = function (node) {
        var res = [];
        this.forAllProps(function (prop) {
            if (prop instanceof ValueProperty)
                res.push(prop.getValueNode(node.storedValue));
        });
        return res;
    };
    ObjectType.prototype.getChildNode = function (node, key) {
        if (!(this.props[key] instanceof ValueProperty))
            return fail("Not a value property: " + key);
        return this.props[key].getValueNode(node.storedValue);
    };
    ObjectType.prototype.getValue = function (node) {
        return node.storedValue;
    };
    ObjectType.prototype.getSnapshot = function (node) {
        var res = {};
        this.forAllProps(function (prop) { return prop.serialize(node.storedValue, res); });
        return this.postProcessSnapshot(res);
    };
    ObjectType.prototype.applyPatchLocally = function (node, subpath, patch) {
        if (!(patch.op === "replace" || patch.op === "add"))
            fail("object does not support operation " + patch.op);
        node.storedValue[subpath] = patch.value;
    };
    ObjectType.prototype.applySnapshot = function (node, snapshot) {
        var _this = this;
        var s = this.preProcessSnapshot(snapshot);
        typecheck(this, s);
        node.pseudoAction(function () {
            for (var key in _this.props)
                _this.props[key].deserialize(node.storedValue, s);
        });
    };
    ObjectType.prototype.preProcessSnapshot = function (snapshot) {
        if (typeof this.actions.preProcessSnapshot === "function")
            return this.actions.preProcessSnapshot.call(null, snapshot);
        return snapshot;
    };
    ObjectType.prototype.postProcessSnapshot = function (snapshot) {
        if (typeof this.actions.postProcessSnapshot === "function")
            return this.actions.postProcessSnapshot.call(null, snapshot);
        return snapshot;
    };
    ObjectType.prototype.getChildType = function (key) {
        return this.props[key].type;
    };
    ObjectType.prototype.isValidSnapshot = function (value, context) {
        var _this = this;
        var snapshot = this.preProcessSnapshot(value);
        if (!isPlainObject(snapshot)) {
            return typeCheckFailure(context, snapshot, "Value is not a plain Object");
        }
        var y = flattenTypeErrors(Object.keys(this.props).map(function (path) {
          var x = _this.props[path].validate(snapshot, context);
          return x
        }));
        return y
    };
    ObjectType.prototype.forAllProps = function (fn) {
        var _this = this;
        // optimization: persists keys or loop more efficiently
        Object.keys(this.props).forEach(function (key) { return fn(_this.props[key]); });
    };
    ObjectType.prototype.describe = function () {
        var _this = this;
        // TODO: make proptypes responsible
        // optimization: cache
        return ("{\n" +
            Object.keys(this.props).sort((a, b) => a > b ? 1 : -1)
            .map(function (key) {
                var prop = _this.props[key];
                return prop instanceof ValueProperty
                ? '  ' + key + ": " +
                  prop.type.describe().split('\n').join('\n' + '  ')
                : "";
            }).filter(Boolean).join(",\n") +
            "\n}");
    };
    ObjectType.prototype.getDefaultSnapshot = function () {
        return {};
    };
    ObjectType.prototype.removeChild = function (node, subpath) {
        node.storedValue[subpath] = null;
    };
    __decorate([
        action
    ], ObjectType.prototype, "applySnapshot", null);
    return ObjectType;
}(ComplexType));
function model() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    var name = typeof args[0] === "string" ? args.shift() : "AnonymousModel";
    var props = args.shift() || fail("types.model must specify properties");
    var volatileState = (args.length > 1 && args.shift()) || {};
    var actions = args.shift() || {};
    return new ObjectType(name, props, volatileState, actions);
}
function compose() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    var typeName = typeof args[0] === "string" ? args.shift() : "AnonymousModel";
    if (args.every(function (arg) { return isType(arg); })) {
        // compose types
        return args.reduce(function (prev, cur) {
            return compose(typeName, prev, cur.properties, cur.state, cur.actions);
        });
    }
    var baseType = args.shift();
    var props = args.shift() || fail("types.compose must specify properties or `{}`");
    var volatileState = (args.length > 1 && args.shift()) || {};
    var actions = args.shift() || {};
    if (!isObjectType(baseType))
        return fail("Only model types can be composed");
    return model(typeName, extendKeepGetter({}, baseType.properties, props), extendKeepGetter({}, baseType.state, volatileState), extendKeepGetter({}, baseType.actions, actions));
}

var StoredReference = (function () {
    function StoredReference(mode, value) {
        this.mode = mode;
        this.value = value;
        if (mode === "object") {
            if (!isStateTreeNode(value))
                return fail("Can only store references to tree nodes, got: '" + value + "'");
            var targetNode = getStateTreeNode(value);
            if (!targetNode.identifierAttribute)
                return fail("Can only store references with a defined identifier attribute.");
        }
    }
    return StoredReference;
}());
var ReferenceType = (function (_super) {
    __extends(ReferenceType, _super);
    function ReferenceType(targetType) {
        var _this = _super.call(this, "reference(" + targetType.name + ")") || this;
        _this.targetType = targetType;
        _this.flags = TypeFlags.Reference;
        return _this;
    }
    ReferenceType.prototype.describe = function () {
        return this.name;
    };
    ReferenceType.prototype.getValue = function (node) {
        var ref = node.storedValue;
        if (ref.mode === "object")
            return ref.value;
        if (!node.isAlive)
            return undefined;
        // reference was initialized with the identifier of the target
        var target = node.root.identifierCache.resolve(this.targetType, ref.value);
        if (!target)
            return fail("Failed to resolve reference of type " + this.targetType.name + ": '" + ref.value + "' (in: " + node.path + ")");
        return target.value;
    };
    ReferenceType.prototype.getSnapshot = function (node) {
        var ref = node.storedValue;
        switch (ref.mode) {
            case "identifier":
                return ref.value;
            case "object":
                return getStateTreeNode(ref.value).identifier;
        }
    };
    ReferenceType.prototype.instantiate = function (parent, subpath, environment, snapshot) {
        var isComplex = isStateTreeNode(snapshot);
        return createNode(this, parent, subpath, environment, new StoredReference(isComplex ? "object" : "identifier", snapshot));
    };
    ReferenceType.prototype.reconcile = function (current, newValue) {
        var targetMode = isStateTreeNode(newValue) ? "object" : "identifier";
        if (isReferenceType(current.type)) {
            var ref = current.storedValue;
            if (targetMode === ref.mode && ref.value === newValue)
                return current;
        }
        var newNode = this.instantiate(current.parent, current.subpath, current._environment, newValue);
        current.die();
        return newNode;
    };
    ReferenceType.prototype.isAssignableFrom = function (type) {
        return this.targetType.isAssignableFrom(type);
    };
    ReferenceType.prototype.isValidSnapshot = function (value, context) {
        return typeof value === "string" || typeof value === "number"
            ? typeCheckSuccess()
            : typeCheckFailure(context, value, "Value is not a valid reference. Expected a string or number.");
    };
    return ReferenceType;
}(Type));
function reference(factory) {
    if (arguments.length === 2 && typeof arguments[1] === "string")
        fail("References with base path are no longer supported. Please remove the base path.");
    return new ReferenceType(factory);
}

var Union = (function (_super) {
    __extends(Union, _super);
    function Union(name, types, dispatcher) {
        var _this = _super.call(this, name) || this;
        _this.dispatcher = null;
        _this.dispatcher = dispatcher;
        _this.types = types;
        return _this;
    }
    Object.defineProperty(Union.prototype, "flags", {
        get: function () {
            var result = TypeFlags.Union;
            this.types.forEach(function (type) {
                result |= type.flags;
            });
            return result;
        },
        enumerable: true,
        configurable: true
    });
    Union.prototype.isAssignableFrom = function (type) {
        return this.types.some(function (subType) { return subType.isAssignableFrom(type); });
    };
    Union.prototype.describe = function () {
        return "(" + this.types.map(function (factory) { return factory.describe(); }).join(" | ") + ")";
    };
    Union.prototype.instantiate = function (parent, subpath, environment, value) {
        return this.determineType(value).instantiate(parent, subpath, environment, value);
    };
    Union.prototype.reconcile = function (current, newValue) {
        return this.determineType(newValue).reconcile(current, newValue);
    };
    Union.prototype.determineType = function (value) {
        // try the dispatcher, if defined
        if (this.dispatcher !== null) {
            return this.dispatcher(value);
        }
        // find the most accomodating type
        var applicableTypes = this.types.filter(function (type) { return type.is(value); });
        if (applicableTypes.length > 1)
            return fail("Ambiguos snapshot " + JSON.stringify(value) + " for union " + this
                .name + ". Please provide a dispatch in the union declaration.");
        return applicableTypes[0];
    };
    Union.prototype.isValidSnapshot = function (value, context) {
        if (this.dispatcher !== null) {
            return this.dispatcher(value).validate(value, context);
        }
        var errors = this.types.map(function (type) { return type.validate(value, context); });
        var applicableTypes = errors.filter(function (errorArray) { return errorArray.length === 0; });
        if (applicableTypes.length > 1) {
            return typeCheckFailure(context, value, "Multiple types are applicable for the union, use a dispatcher function to disambiguate");
        }
        else if (applicableTypes.length < 1) {
            const errorMessages = flattenTypeErrors(errors).map(e => e.message).join(', ')
            return typeCheckFailure(context, value, "No type is applicable fot the union: " + errorMessages)
        }
        return typeCheckSuccess();
    };
    return Union;
}(Type));
function union(dispatchOrType) {
    var otherTypes = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        otherTypes[_i - 1] = arguments[_i];
    }
    var dispatcher = isType(dispatchOrType) ? null : dispatchOrType;
    var types = isType(dispatchOrType) ? otherTypes.concat(dispatchOrType) : otherTypes;
    var name = types.map(function (type) { return type.name; }).join(" | ");
    return new Union(name, types, dispatcher);
}

var nullType = optional(literal(null), null);
function maybe(type) {
    return union(nullType, type);
}

var Refinement = (function (_super) {
    __extends(Refinement, _super);
    function Refinement(name, type, predicate) {
        var _this = _super.call(this, name) || this;
        _this.type = type;
        _this.predicate = predicate;
        return _this;
    }
    Object.defineProperty(Refinement.prototype, "flags", {
        get: function () {
            return this.type.flags | TypeFlags.Refinement;
        },
        enumerable: true,
        configurable: true
    });
    Refinement.prototype.describe = function () {
        return this.name;
    };
    Refinement.prototype.instantiate = function (parent, subpath, environment, value) {
        // create the child type
        var inst = this.type.instantiate(parent, subpath, environment, value);
        return inst;
    };
    Refinement.prototype.isAssignableFrom = function (type) {
        return this.type.isAssignableFrom(type);
    };
    Refinement.prototype.isValidSnapshot = function (value, context) {
        const errorsType = this.type.validate(value, context)
        if (errorsType.length > 0) return errorsType

        var snapshot = isStateTreeNode(value) ? getStateTreeNode(value).snapshot : value;
        if (this.predicate(snapshot)) {
            return typeCheckSuccess();
        } else {
            return typeCheckFailure(context, value, "Refinement predicate is not respected")
        }
    };
    return Refinement;
}(Type));
function refinement(name, type, predicate) {
    return new Refinement(name, type, predicate);
}

var Frozen = (function (_super) {
    __extends(Frozen, _super);
    function Frozen() {
        var _this = _super.call(this, "frozen") || this;
        _this.flags = TypeFlags.Frozen;
        return _this;
    }
    Frozen.prototype.describe = function () {
        return "frozen";
    };
    Frozen.prototype.instantiate = function (parent, subpath, environment, value) {
        // deep freeze the object/array
        return createNode(this, parent, subpath, environment, deepFreeze(value));
    };
    Frozen.prototype.isValidSnapshot = function (value, context) {
        if (!isSerializable(value)) {
            return typeCheckFailure(context, value, "Value is not serializable, hence cannot be frozen");
        }
        return typeCheckSuccess();
    };
    return Frozen;
}(Type));
var frozen = new Frozen();

var Late = (function (_super) {
    __extends(Late, _super);
    function Late(name, definition) {
        var _this = _super.call(this, name) || this;
        _this._subType = null;
        if (!(typeof definition === 'function' && definition.length === 0))
            fail('Invalid late type, expected a function with zero arguments that returns a type, got: ' +
                definition);
        _this.definition = definition;
        return _this;
    }
    Object.defineProperty(Late.prototype, "flags", {
        get: function () {
            return this.subType.flags | TypeFlags.Late;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Late.prototype, "subType", {
        get: function () {
            if (this._subType === null) {
                this._subType = this.definition();
            }
            return this._subType;
        },
        enumerable: true,
        configurable: true
    });
    Late.prototype.instantiate = function (parent, subpath, environment, snapshot) {
        return this.subType.instantiate(parent, subpath, environment, snapshot);
    };
    Late.prototype.reconcile = function (current, newValue) {
        return this.subType.reconcile(current, newValue);
    };
    Late.prototype.describe = function () {
        return this.subType.name;
    };
    Late.prototype.isValidSnapshot = function (value, context) {
        return this.subType.validate(value, context);
    };
    Late.prototype.isAssignableFrom = function (type) {
        return this.subType.isAssignableFrom(type);
    };
    return Late;
}(Type));
function late(nameOrType, maybeType) {
    var name = typeof nameOrType === 'string' ? nameOrType : "late(" + nameOrType.toString() + ")";
    var type = typeof nameOrType === 'string' ? maybeType : nameOrType;
    return new Late(name, type);
}

// tslint:disable-next-line:no_unused-variable
// tslint:disable-next-line:no_unused-variable
// tslint:disable-next-line:no_unused-variable
var types = {
    model: model,
    compose: compose,
    reference: reference,
    union: union,
    optional: optional,
    literal: literal,
    maybe: maybe,
    refinement: refinement,
    string: string,
    boolean: boolean,
    number: number,
    Date: DatePrimitive,
    map: map,
    array: array,
    frozen: frozen,
    identifier: identifier,
    late: late
};

function asReduxStore(model) {
    var middlewares = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        middlewares[_i - 1] = arguments[_i];
    }
    if (!isStateTreeNode(model))
        fail("Expected model object");
    var store = {
        getState: function () { return getSnapshot(model); },
        dispatch: function (action$$1) {
            runMiddleWare(action$$1, runners.slice(), function (newAction) {
                return applyAction$1(model, reduxActionToAction(newAction));
            });
        },
        subscribe: function (listener) { return onSnapshot(model, listener); }
    };
    var runners = middlewares.map(function (mw) { return mw(store); });
    return store;
}
function reduxActionToAction(action$$1) {
    var actionArgs = extend({}, action$$1);
    delete actionArgs.type;
    return {
        name: action$$1.type,
        args: [actionArgs]
    };
}
function runMiddleWare(action$$1, runners, next) {
    function n(retVal) {
        var f = runners.shift();
        if (f)
            f(n)(retVal);
        else
            next(retVal);
    }
    n(action$$1);
}
function connectReduxDevtools(remoteDevDep, model) {
    // Connect to the monitor
    var remotedev = remoteDevDep.connectViaExtension();
    var applyingSnapshot = false;
    // Subscribe to change state (if need more than just logging)
    remotedev.subscribe(function (message) {
        // Helper when only time travelling needed
        var state = remoteDevDep.extractState(message);
        if (state) {
            applyingSnapshot = true;
            applySnapshot(model, state);
            applyingSnapshot = false;
        }
    });
    // Send changes to the remote monitor
    onAction(model, function (action$$1) {
        if (applyingSnapshot)
            return;
        var copy = {};
        copy.type = action$$1.name;
        if (action$$1.args)
            action$$1.args.forEach(function (value, index) { return (copy[index] = value); });
        remotedev.send(copy, getSnapshot(model));
    });
}

// Fix some circular deps:

export { types, escapeJsonPath, unescapeJsonPath, onAction, isStateTreeNode, asReduxStore, connectReduxDevtools, getType, getChildType, addMiddleware, onPatch, onSnapshot, applyPatch, recordPatches, applyAction, recordActions, protect, unprotect, isProtected, applySnapshot, getSnapshot, hasParent, getParent, getRoot, getPath, getPathParts, isRoot, resolvePath, resolveIdentifier, tryResolve, getRelativePath, clone, detach, destroy, isAlive, addDisposer, getEnv, walk };
