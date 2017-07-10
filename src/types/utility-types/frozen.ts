import { ISimpleType, Type } from "../type"
import { TypeFlags } from "../type-flags"
import { IContext, IValidationResult, typeCheckSuccess, typeCheckFailure } from "../type-checker"
import { isSerializable, deepFreeze } from "../../utils"
import { createNode, Node } from "../../core"

export class Frozen<T> extends Type<T, T> {
    flags = TypeFlags.Frozen

    constructor() {
        super("frozen")
    }

    describe() {
        return "<any immutable value>"
    }

    instantiate(parent: Node | null, subpath: string, environment: any, value: any): Node {
        // deep freeze the object/array
        return createNode(this, parent, subpath, environment, deepFreeze(value))
    }

    isValidSnapshot(value: any, context: IContext): IValidationResult {
        if (!isSerializable(value)) {
            return typeCheckFailure(
                context,
                value,
                "Value is not serializable and cannot be frozen"
            )
        }
        return typeCheckSuccess()
    }
}

export const frozen: ISimpleType<any> = new Frozen()
