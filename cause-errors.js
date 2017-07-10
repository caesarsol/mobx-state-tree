const { types: t } = require(".")

function err(fn) {
    let x
    const fnStr = fn.toString().replace(/\(\) => /g, "").replace(/[\n\s]+/g, " ")
    try {
        x = fn()
    } catch (e) {
        console.log()
        console.log(fnStr)
        console.log(fnStr.replace(/./g, "="))
        console.log(`Error: ${e.message}`)
        return
    }
    console.log()
    console.log(x)
}

err(() => t.array(t.string).create(1))
err(() => t.map(t.string).create(1))
err(() => t.map(t.string).create({ a: 1 }))
err(() => t.maybe(t.string).create(1))
err(() =>
    t
        .union(
            t.number,
            t.string,
            t.boolean,
            t.Date,
            t.model("Model", { b: t.string }),
            t.frozen,
            t.literal(null),
            t.literal(undefined),
            t.literal(42),
            t.literal("YOYO")
        )
        .create(() => {})
)
// const A = t.model("A", { a: t.identifier(t.number), b: t.string })
// const B = t.model("B", {
//     xs: t.array(A),
//     x: t.reference(A)
// })
// err(() => B.create({ xs: [{ a: 1, b: "qwe" }, { a: 2, b: "asd" }], x: [] }))
